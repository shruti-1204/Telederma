const prisma = require("../config/prisma");
const { NotFoundError, BadRequestError, ForbiddenError } = require("../utils/errors");
const { createAuditLog } = require("./audit.service");

const getDoctorByUserId = async (userId) => {
  let doctor = await prisma.doctor.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, phone: true, email: true, name: true, role: true, status: true },
      },
      availabilities: true,
    },
  });

  if (!doctor) {
    doctor = await prisma.doctor.create({
      data: { userId },
      include: {
        user: {
          select: { id: true, phone: true, email: true, name: true, role: true, status: true },
        },
        availabilities: true,
      },
    });
  }

  return doctor;
};

const updateDoctorProfile = async (userId, updateData) => {
  const doctor = await getDoctorByUserId(userId);
  const { name, email, ...doctorFields } = updateData;

  if (name || email) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
    });
  }

  const updatedDoctor = await prisma.doctor.update({
    where: { id: doctor.id },
    data: doctorFields,
    include: {
      user: {
        select: { id: true, phone: true, email: true, name: true, role: true, status: true },
      },
    },
  });

  await createAuditLog({
    userId,
    action: "DOCTOR_PROFILE_UPDATED",
    resourceType: "DOCTOR",
    resourceId: doctor.id,
  });

  return updatedDoctor;
};

const getVerifiedDoctors = async ({ specialization, search } = {}) => {
  const where = {
    isVerified: true,
    user: {
      status: "ACTIVE",
    },
  };

  if (specialization) {
    where.specialization = { contains: specialization, mode: "insensitive" };
  }

  if (search) {
    where.OR = [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { specialization: { contains: search, mode: "insensitive" } },
      { bio: { contains: search, mode: "insensitive" } },
    ];
  }

  return prisma.doctor.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      availabilities: {
        where: { isActive: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getDoctorById = async (doctorId) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      availabilities: {
        where: { isActive: true },
      },
    },
  });

  if (!doctor) {
    throw new NotFoundError("Doctor not found");
  }

  return doctor;
};

const getDoctorAvailability = async (doctorId) => {
  return prisma.doctorAvailability.findMany({
    where: { doctorId, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
};

const createAvailability = async (doctorId, userId, data) => {
  // Check for overlapping availability on the same dayOfWeek
  const existing = await prisma.doctorAvailability.findMany({
    where: { doctorId, dayOfWeek: data.dayOfWeek, isActive: true },
  });

  for (const avail of existing) {
    if (
      (data.startTime >= avail.startTime && data.startTime < avail.endTime) ||
      (data.endTime > avail.startTime && data.endTime <= avail.endTime) ||
      (data.startTime <= avail.startTime && data.endTime >= avail.endTime)
    ) {
      throw new BadRequestError("Availability time overlaps with an existing active schedule on this day");
    }
  }

  const availability = await prisma.doctorAvailability.create({
    data: {
      doctorId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  await createAuditLog({
    userId,
    action: "DOCTOR_AVAILABILITY_CREATED",
    resourceType: "DOCTOR_AVAILABILITY",
    resourceId: availability.id,
    metadata: { doctorId, dayOfWeek: data.dayOfWeek },
  });

  return availability;
};

const updateAvailability = async (id, doctorId, userId, data) => {
  const existing = await prisma.doctorAvailability.findUnique({
    where: { id },
  });

  if (!existing || existing.doctorId !== doctorId) {
    throw new NotFoundError("Availability schedule not found");
  }

  const updated = await prisma.doctorAvailability.update({
    where: { id },
    data,
  });

  await createAuditLog({
    userId,
    action: "DOCTOR_AVAILABILITY_UPDATED",
    resourceType: "DOCTOR_AVAILABILITY",
    resourceId: id,
  });

  return updated;
};

const deleteAvailability = async (id, doctorId, userId) => {
  const existing = await prisma.doctorAvailability.findUnique({
    where: { id },
  });

  if (!existing || existing.doctorId !== doctorId) {
    throw new NotFoundError("Availability schedule not found");
  }

  await prisma.doctorAvailability.delete({
    where: { id },
  });

  await createAuditLog({
    userId,
    action: "DOCTOR_AVAILABILITY_DELETED",
    resourceType: "DOCTOR_AVAILABILITY",
    resourceId: id,
  });

  return true;
};

/**
 * Generate 30-minute booking slots for a doctor on a specific date (YYYY-MM-DD)
 */
const getDoctorSlots = async (doctorId, dateString) => {
  const targetDate = new Date(`${dateString}T00:00:00.000Z`);
  if (isNaN(targetDate.getTime())) {
    throw new BadRequestError("Invalid date format. Use YYYY-MM-DD");
  }

  // targetDate day of week: 0 (Sun) - 6 (Sat)
  const dayOfWeek = targetDate.getUTCDay();

  const availabilities = await prisma.doctorAvailability.findMany({
    where: {
      doctorId,
      dayOfWeek,
      isActive: true,
    },
  });

  if (!availabilities || availabilities.length === 0) {
    return [];
  }

  // Fetch all non-cancelled appointments for this doctor on targetDate
  const dayStart = new Date(`${dateString}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateString}T23:59:59.999Z`);

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      slotStart: { gte: dayStart, lte: dayEnd },
      status: { notIn: ["CANCELLED"] },
    },
    select: {
      id: true,
      slotStart: true,
      slotEnd: true,
    },
  });

  const slots = [];
  const SLOT_DURATION_MINUTES = 30;

  for (const avail of availabilities) {
    const [startH, startM] = avail.startTime.split(":").map(Number);
    const [endH, endM] = avail.endTime.split(":").map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + SLOT_DURATION_MINUTES <= endMinutes) {
      const slotStartH = String(Math.floor(currentMinutes / 60)).padStart(2, "0");
      const slotStartM = String(currentMinutes % 60).padStart(2, "0");

      const nextMinutes = currentMinutes + SLOT_DURATION_MINUTES;
      const slotEndH = String(Math.floor(nextMinutes / 60)).padStart(2, "0");
      const slotEndM = String(nextMinutes % 60).padStart(2, "0");

      const slotStartISO = new Date(`${dateString}T${slotStartH}:${slotStartM}:00.000Z`);
      const slotEndISO = new Date(`${dateString}T${slotEndH}:${slotEndM}:00.000Z`);

      // Check if overlapping with any booked appointment
      const isBooked = bookedAppointments.some((appt) => {
        return (
          (slotStartISO >= appt.slotStart && slotStartISO < appt.slotEnd) ||
          (slotEndISO > appt.slotStart && slotEndISO <= appt.slotEnd) ||
          (slotStartISO <= appt.slotStart && slotEndISO >= appt.slotEnd)
        );
      });

      slots.push({
        slotStart: slotStartISO.toISOString(),
        slotEnd: slotEndISO.toISOString(),
        startTime: `${slotStartH}:${slotStartM}`,
        endTime: `${slotEndH}:${slotEndM}`,
        isAvailable: !isBooked,
      });

      currentMinutes = nextMinutes;
    }
  }

  return slots;
};

// Admin Functions
const getPendingDoctors = async () => {
  return prisma.doctor.findMany({
    where: { isVerified: false },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const verifyDoctor = async (doctorId, adminUserId) => {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) {
    throw new NotFoundError("Doctor not found");
  }

  const updated = await prisma.doctor.update({
    where: { id: doctorId },
    data: { isVerified: true },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  await createAuditLog({
    userId: adminUserId,
    action: "DOCTOR_VERIFIED_BY_ADMIN",
    resourceType: "DOCTOR",
    resourceId: doctorId,
  });

  return updated;
};

const rejectDoctor = async (doctorId, adminUserId) => {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) {
    throw new NotFoundError("Doctor not found");
  }

  const updated = await prisma.doctor.update({
    where: { id: doctorId },
    data: { isVerified: false },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  await createAuditLog({
    userId: adminUserId,
    action: "DOCTOR_REJECTED_BY_ADMIN",
    resourceType: "DOCTOR",
    resourceId: doctorId,
  });

  return updated;
};

module.exports = {
  getDoctorByUserId,
  updateDoctorProfile,
  getVerifiedDoctors,
  getDoctorById,
  getDoctorAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  getDoctorSlots,
  getPendingDoctors,
  verifyDoctor,
  rejectDoctor,
};
