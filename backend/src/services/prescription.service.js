const prisma = require("../config/prisma");
const { NotFoundError, ForbiddenError, BadRequestError } = require("../utils/errors");
const { createAuditLog } = require("./audit.service");

const createPrescription = async ({
  consultationId,
  appointmentId,
  patientId,
  diagnosis,
  notes,
  followUpDate,
  items,
  doctorUser,
}) => {
  let consultation = null;

  // 1. Resolve consultation by consultationId or appointmentId
  if (consultationId) {
    consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { appointment: true, prescription: true },
    });
  }

  if (!consultation && appointmentId) {
    consultation = await prisma.consultation.findUnique({
      where: { appointmentId },
      include: { appointment: true, prescription: true },
    });

    if (!consultation) {
      // Find appointment to build new consultation
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      if (!appointment) {
        throw new NotFoundError("Appointment not found");
      }
      consultation = await prisma.consultation.create({
        data: {
          appointmentId,
          patientId: appointment.patientId,
          doctorId: doctorUser.doctorId,
          roomId: `room_${appointmentId}`,
          status: "ACTIVE",
          startedAt: new Date(),
        },
        include: { appointment: true, prescription: true },
      });
    }
  }

  if (!consultation) {
    throw new NotFoundError("Consultation or Appointment record not found for prescription");
  }

  // 2. Doctor ownership verification
  if (consultation.doctorId !== doctorUser.doctorId && doctorUser.role !== "ADMIN") {
    throw new ForbiddenError("Only the assigned doctor for this consultation can create a prescription");
  }

  // 3. Exact Patient Matching:
  // The prescription MUST belong to the exact patient associated with this consultation
  const targetPatientId = consultation.patientId;

  // Compose full clinical note with diagnosis and follow-up date
  let fullNotes = notes || "";
  if (diagnosis && !fullNotes.includes(diagnosis)) {
    fullNotes = `Diagnosis: ${diagnosis}\n${fullNotes}`.trim();
  }
  if (followUpDate && !fullNotes.includes(followUpDate)) {
    fullNotes = `${fullNotes}\nRecommended Follow-Up: ${followUpDate}`.trim();
  }

  // 4. Create or update prescription
  let prescription;
  if (consultation.prescription) {
    // Replace items if prescription already started
    await prisma.prescriptionItem.deleteMany({
      where: { prescriptionId: consultation.prescription.id },
    });

    prescription = await prisma.prescription.update({
      where: { id: consultation.prescription.id },
      data: {
        notes: fullNotes || null,
        items: {
          create: items.map((item) => ({
            medicineName: item.medicineName,
            dosage: item.dosage || null,
            frequency: item.frequency || null,
            duration: item.duration || null,
            instructions: item.instructions || item.dosage || null,
          })),
        },
      },
      include: {
        items: true,
        doctor: {
          include: { user: { select: { id: true, name: true, phone: true } } },
        },
        patient: {
          include: { user: { select: { id: true, name: true, phone: true } } },
        },
        consultation: true,
      },
    });
  } else {
    prescription = await prisma.prescription.create({
      data: {
        consultationId: consultation.id,
        patientId: targetPatientId,
        doctorId: doctorUser.doctorId,
        notes: fullNotes || null,
        items: {
          create: items.map((item) => ({
            medicineName: item.medicineName,
            dosage: item.dosage || null,
            frequency: item.frequency || null,
            duration: item.duration || null,
            instructions: item.instructions || item.dosage || null,
          })),
        },
      },
      include: {
        items: true,
        doctor: {
          include: { user: { select: { id: true, name: true, phone: true } } },
        },
        patient: {
          include: { user: { select: { id: true, name: true, phone: true } } },
        },
        consultation: true,
      },
    });
  }

  // 5. Mark consultation as COMPLETED
  await prisma.consultation.update({
    where: { id: consultation.id },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
    },
  });

  // 6. Mark appointment as COMPLETED
  if (consultation.appointmentId) {
    await prisma.appointment.update({
      where: { id: consultation.appointmentId },
      data: { status: "COMPLETED" },
    });
  }

  // 7. Audit log
  await createAuditLog({
    userId: doctorUser.userId,
    action: "PRESCRIPTION_CREATED",
    resourceType: "PRESCRIPTION",
    resourceId: prescription.id,
    metadata: {
      consultationId: consultation.id,
      patientId: targetPatientId,
      doctorId: doctorUser.doctorId,
      itemsCount: items.length,
    },
  });

  return {
    ...prescription,
    diagnosis: diagnosis || "Clinical Dermatology Care Plan",
    followUpDate: followUpDate || null,
  };
};

const getPrescriptionById = async (prescriptionId, user) => {
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      items: true,
      doctor: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
      patient: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
      consultation: true,
    },
  });

  if (!prescription) {
    throw new NotFoundError("Prescription not found");
  }

  if (user.role === "PATIENT" && prescription.patientId !== user.patientId) {
    throw new ForbiddenError("Access denied to this prescription");
  }

  if (user.role === "DOCTOR" && prescription.doctorId !== user.doctorId && user.role !== "ADMIN") {
    throw new ForbiddenError("Access denied to this prescription");
  }

  return prescription;
};

const getPatientPrescriptions = async (patientId) => {
  return prisma.prescription.findMany({
    where: { patientId },
    include: {
      items: true,
      doctor: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
      consultation: {
        select: { id: true, status: true, startedAt: true, endedAt: true, appointmentId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getDoctorPrescriptions = async (doctorId) => {
  return prisma.prescription.findMany({
    where: { doctorId },
    include: {
      items: true,
      patient: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
      consultation: {
        select: { id: true, status: true, startedAt: true, endedAt: true, appointmentId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

module.exports = {
  createPrescription,
  getPrescriptionById,
  getPatientPrescriptions,
  getDoctorPrescriptions,
};
