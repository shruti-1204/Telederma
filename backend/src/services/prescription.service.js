const prisma = require("../config/prisma");
const { NotFoundError, ForbiddenError, BadRequestError } = require("../utils/errors");
const { createAuditLog } = require("./audit.service");

const createPrescription = async ({ consultationId, patientId, notes, items, doctorUser }) => {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: { prescription: true },
  });

  if (!consultation) {
    throw new NotFoundError("Consultation not found");
  }

  if (consultation.doctorId !== doctorUser.doctorId) {
    throw new ForbiddenError("Only the assigned doctor for this consultation can create a prescription");
  }

  if (consultation.patientId !== patientId) {
    throw new BadRequestError("Patient ID does not match the consultation record");
  }

  if (consultation.prescription) {
    throw new BadRequestError("A prescription has already been created for this consultation");
  }

  const prescription = await prisma.prescription.create({
    data: {
      consultationId,
      patientId,
      doctorId: doctorUser.doctorId,
      notes: notes || null,
      items: {
        create: items.map((item) => ({
          medicineName: item.medicineName,
          dosage: item.dosage || null,
          frequency: item.frequency || null,
          duration: item.duration || null,
          instructions: item.instructions || null,
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

  await createAuditLog({
    userId: doctorUser.userId,
    action: "PRESCRIPTION_CREATED",
    resourceType: "PRESCRIPTION",
    resourceId: prescription.id,
    metadata: {
      consultationId,
      patientId,
      doctorId: doctorUser.doctorId,
      itemsCount: items.length,
    },
  });

  return prescription;
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
        select: { id: true, status: true, startedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

module.exports = {
  createPrescription,
  getPrescriptionById,
  getPatientPrescriptions,
};
