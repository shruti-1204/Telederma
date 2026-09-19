const prisma = require("../config/prisma");
const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} = require("../utils/errors");
const { createAuditLog } = require("./audit.service");

const createAppointment = async ({ patientId, doctorId, slotStart, slotEnd, userId }) => {
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
    // Check if doctor already has an overlapping active appointment
    const conflictingDoctorAppt = await tx.appointment.findFirst({
      where: {
        doctorId,
        status: { not: "CANCELLED" },
        OR: [
          {
            slotStart: { lte: start },
            slotEnd: { gt: start },
          },
          {
            slotStart: { lt: end },
            slotEnd: { gte: end },
          },
          {
            slotStart: { gte: start },
            slotEnd: { lte: end },
          },
        ],
      },
    });

    if (conflictingDoctorAppt) {
      throw new ConflictError("The doctor is already booked for this time slot. Please select another slot.");
    }

    // Check if patient already has an overlapping active appointment
    const conflictingPatientAppt = await tx.appointment.findFirst({
      where: {
        patientId,
        status: { not: "CANCELLED" },
        OR: [
          {
            slotStart: { lte: start },
            slotEnd: { gt: start },
          },
          {
            slotStart: { lt: end },
            slotEnd: { gte: end },
          },
          {
            slotStart: { gte: start },
            slotEnd: { lte: end },
          },
        ],
      },
    });

    if (conflictingPatientAppt) {
      throw new ConflictError("You already have an appointment booked during this time frame.");
    }

    // Create the appointment
    return tx.appointment.create({
      data: {
        patientId,
        doctorId,
        slotStart: start,
        slotEnd: end,
        status: "PENDING",
        paymentStatus: "PENDING",
      },
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
        },
      },
      consultation: {
        select: { id: true, status: true, roomId: true },
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
        },
      },
      consultation: true,
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
