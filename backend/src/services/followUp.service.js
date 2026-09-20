const prisma = require("../config/prisma");
const { NotFoundError, ForbiddenError } = require("../utils/errors");
const { createAuditLog } = require("./audit.service");

const createFollowUp = async ({ patientId, consultationId, followUpDate, notes, doctorUser }) => {
  const followUp = await prisma.followUp.create({
    data: {
      patientId,
      doctorId: doctorUser.doctorId,
      consultationId: consultationId || null,
      followUpDate: new Date(followUpDate),
      notes: notes || null,
      status: "PENDING",
    },
    include: {
      patient: { include: { user: { select: { id: true, name: true, phone: true } } } },
      doctor: { include: { user: { select: { id: true, name: true, phone: true } } } },
    },
  });

  await createAuditLog({
    userId: doctorUser.userId,
    action: "FOLLOW_UP_SCHEDULED",
    resourceType: "FOLLOW_UP",
    resourceId: followUp.id,
    metadata: { patientId, doctorId: doctorUser.doctorId, followUpDate },
  });

  return followUp;
};

const getFollowUps = async (user) => {
  const where = {};
  if (user.role === "PATIENT") {
    where.patientId = user.patientId;
  } else if (user.role === "DOCTOR") {
    where.doctorId = user.doctorId;
  }

  return prisma.followUp.findMany({
    where,
    include: {
      patient: { include: { user: { select: { id: true, name: true, phone: true } } } },
      doctor: { include: { user: { select: { id: true, name: true, phone: true } } } },
    },
    orderBy: { followUpDate: "asc" },
  });
};

const updateFollowUp = async (id, data, user) => {
  const existing = await prisma.followUp.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError("Follow-up not found");
  }

  if (user.role === "DOCTOR" && existing.doctorId !== user.doctorId && user.role !== "ADMIN") {
    throw new ForbiddenError("Access denied: You can only update your own follow-up schedules");
  }

  const updated = await prisma.followUp.update({
    where: { id },
    data: {
      ...(data.followUpDate && { followUpDate: new Date(data.followUpDate) }),
      ...(data.status && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: {
      patient: { include: { user: { select: { id: true, name: true } } } },
      doctor: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  await createAuditLog({
    userId: user.userId,
    action: "FOLLOW_UP_UPDATED",
    resourceType: "FOLLOW_UP",
    resourceId: id,
  });

  return updated;
};

module.exports = {
  createFollowUp,
  getFollowUps,
  updateFollowUp,
};
