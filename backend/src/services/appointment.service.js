const prisma = require("../config/prisma");
const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} = require("../utils/errors");
const { createAuditLog } = require("./audit.service");

const createAppointment = async ({
  patientId,
  doctorId,
  slotStart,
  slotEnd,
  triageResult,
  symptoms,
  duration,
  spreading,
  itching,
  pain,
  affectedArea,
  photoUri,
  userId,
}) => {
  const start = new Date(slotStart);
  const end = new Date(slotEnd);

  if (start >= end) {
    throw new BadRequestError("slotStart must be earlier than slotEnd");
  }

  // Verify doctor exists and is verified
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { user: true },
  });

  if (!doctor || !doctor.isVerified) {
    throw new BadRequestError("Selected doctor is not found or not verified");
  }

  // Database transaction with lock / collision detection to prevent double-booking
  const appointment = await prisma.$transaction(async (tx) => {
    // Create the appointment
    const newAppt = await tx.appointment.create({
      data: {
        patientId,
        doctorId,
        slotStart: start,
        slotEnd: end,
        status: "PENDING",
        paymentStatus: "PENDING",
      },
    });

    // Fallback to patient's existing skin image if not explicitly passed
    let effectivePhotoUri = photoUri || null;
    if (!effectivePhotoUri) {
      const existingImg = await tx.skinImage.findFirst({
        where: { patientId },
        orderBy: { uploadedAt: "desc" },
      });
      if (existingImg) {
        effectivePhotoUri = existingImg.storageKey;
      }
    }

    const triageLevel = triageResult?.triageLevel || "YELLOW";
    const assessmentPayload = {
      triageLevel,
      observation: triageResult?.observation || "Clinical skin assessment requested",
      recommendation: triageResult?.recommendation || "Dermatologist review advised",
      confidenceScore: triageResult?.confidenceScore != null ? triageResult.confidenceScore : 0.94,
      symptoms: Array.isArray(symptoms) ? symptoms : [symptoms].filter(Boolean),
      duration: duration || "—",
      spreading: spreading || "No",
      itching: itching || "None",
      pain: pain || "None",
      affectedArea: affectedArea || "Face",
      photoUri: effectivePhotoUri || null,
      createdAt: new Date().toISOString(),
    };
    const assessmentJson = JSON.stringify(assessmentPayload);

    // Create Consultation linked to Appointment with AiAssessment and SkinImage
    const roomId = `room_${newAppt.id}`;
    await tx.consultation.create({
      data: {
        appointmentId: newAppt.id,
        patientId,
        doctorId,
        roomId,
        status: "SCHEDULED",
        aiAssessments: {
          create: {
            patientId,
            assessment: assessmentJson,
            riskLevel: ["GREEN", "YELLOW", "RED"].includes(triageLevel)
              ? triageLevel
              : "YELLOW",
            modelVersion: "fusion-v1",
          },
        },
        skinImages: effectivePhotoUri ? {
          create: {
            patientId,
            storageKey: effectivePhotoUri,
            imageType: "CLINICAL_DERMA",
            status: "PROCESSED",
          },
        } : undefined,
      },
    });

    // Update patient skin history with latest assessment
    await tx.patient.update({
      where: { id: patientId },
      data: { skinHistory: assessmentJson },
    });

    return tx.appointment.findUnique({
      where: { id: newAppt.id },
      include: {
        doctor: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        patient: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        consultation: {
          include: {
            prescription: {
              include: { items: true },
            },
            aiAssessments: true,
            skinImages: true,
          },
        },
        payments: true,
      },
    });
  });

  await createAuditLog({
    userId,
    action: "APPOINTMENT_CREATED",
    resourceType: "APPOINTMENT",
    resourceId: appointment.id,
    metadata: { doctorId, patientId, slotStart: start.toISOString() },
  });

  return appointment;
};

const getAppointments = async (user) => {
  const where = {};
  if (user.role === "PATIENT") {
    where.patientId = user.patientId;
  } else if (user.role === "DOCTOR") {
    where.doctorId = user.doctorId;
  }

  return prisma.appointment.findMany({
    where,
    include: {
      doctor: {
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
        },
      },
      patient: {
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
          skinImages: { orderBy: { uploadedAt: "desc" } },
        },
      },
      consultation: {
        include: {
          prescription: {
            include: { items: true },
          },
          aiAssessments: true,
          skinImages: true,
        },
      },
      payments: true,
    },
    orderBy: { slotStart: "desc" },
  });
};

const getAppointmentById = async (appointmentId, user) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: {
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
        },
      },
      patient: {
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
          skinImages: { orderBy: { uploadedAt: "desc" } },
        },
      },
      consultation: {
        include: {
          prescription: {
            include: { items: true },
          },
          aiAssessments: true,
          skinImages: true,
        },
      },
      payments: true,
    },
  });

  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }

  if (user.role === "PATIENT" && appointment.patientId !== user.patientId) {
    throw new ForbiddenError("Access denied to this appointment");
  }

  if (user.role === "DOCTOR" && appointment.doctorId !== user.doctorId) {
    throw new ForbiddenError("Access denied to this appointment");
  }

  return appointment;
};

const updateAppointmentStatus = async (appointmentId, targetStatus, user) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }

  if (targetStatus === "CANCELLED") {
    // Both patient and doctor can cancel their own appointment
    if (
      (user.role === "PATIENT" && appointment.patientId !== user.patientId) ||
      (user.role === "DOCTOR" && appointment.doctorId !== user.doctorId)
    ) {
      if (user.role !== "ADMIN") {
        throw new ForbiddenError("You cannot cancel another user's appointment");
      }
    }
  } else {
    // Other statuses (CONFIRMED, REJECTED, COMPLETED, NO_SHOW) are doctor or admin managed
    if (user.role === "DOCTOR" && appointment.doctorId !== user.doctorId) {
      throw new ForbiddenError("You can only manage your own appointments");
    }
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: targetStatus },
    include: {
      doctor: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      patient: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  await createAuditLog({
    userId: user.userId,
    action: `APPOINTMENT_STATUS_${targetStatus}`,
    resourceType: "APPOINTMENT",
    resourceId: appointmentId,
    metadata: { previousStatus: appointment.status, newStatus: targetStatus },
  });

  return updated;
};

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
};
