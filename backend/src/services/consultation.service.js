const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const prisma = require("../config/prisma");
const { NotFoundError, ForbiddenError, BadRequestError } = require("../utils/errors");
const { createAuditLog } = require("./audit.service");

const generateRoomId = () => {
  return `room_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
};

const createConsultation = async ({ appointmentId, user }) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { consultation: true },
  });

  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }

  // Verify caller is associated with this appointment
  if (user.role === "PATIENT" && appointment.patientId !== user.patientId) {
    throw new ForbiddenError("Access denied to this appointment");
  }

  if (user.role === "DOCTOR" && appointment.doctorId !== user.doctorId) {
    throw new ForbiddenError("Access denied to this appointment");
  }

  if (appointment.consultation) {
    return appointment.consultation;
  }

  const roomId = generateRoomId();

  const consultation = await prisma.consultation.create({
    data: {
      appointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      roomId,
      status: "SCHEDULED",
    },
    include: {
      appointment: true,
      patient: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
      doctor: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
    },
  });

  await createAuditLog({
    userId: user.userId,
    action: "CONSULTATION_SESSION_CREATED",
    resourceType: "CONSULTATION",
    resourceId: consultation.id,
    metadata: { appointmentId, roomId },
  });

  return consultation;
};

const getConsultationById = async (consultationId, user) => {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: {
      appointment: true,
      patient: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
      doctor: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
      prescription: {
        include: { items: true },
      },
      skinImages: true,
      aiAssessments: true,
      followUps: true,
    },
  });

  if (!consultation) {
    throw new NotFoundError("Consultation not found");
  }

  if (user.role === "PATIENT" && consultation.patientId !== user.patientId) {
    throw new ForbiddenError("Access denied to this consultation");
  }

  if (user.role === "DOCTOR" && consultation.doctorId !== user.doctorId) {
    throw new ForbiddenError("Access denied to this consultation");
  }

  return consultation;
};

const joinConsultation = async (consultationId, user) => {
  const consultation = await getConsultationById(consultationId, user);

  if (consultation.status === "COMPLETED" || consultation.status === "CANCELLED") {
    throw new BadRequestError(`Cannot join consultation because it is already ${consultation.status.toLowerCase()}`);
  }

  // If status is SCHEDULED, set to ACTIVE and record startedAt
  let updatedConsultation = consultation;
  if (consultation.status === "SCHEDULED") {
    updatedConsultation = await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        status: "ACTIVE",
        startedAt: new Date(),
      },
    });
  }

  // Generate WebRTC Session Room Token for secure peer connection
  const roomToken = jwt.sign(
    {
      consultationId: consultation.id,
      roomId: consultation.roomId,
      userId: user.userId,
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: "2h" }
  );

  await createAuditLog({
    userId: user.userId,
    action: "CONSULTATION_JOINED",
    resourceType: "CONSULTATION",
    resourceId: consultationId,
    metadata: { role: user.role, roomId: consultation.roomId },
  });

  return {
    consultationId: consultation.id,
    roomId: consultation.roomId,
    status: updatedConsultation.status,
    roomToken,
    peerIdentity: {
      userId: user.userId,
      role: user.role,
      name: user.name,
    },
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };
};

const endConsultation = async (consultationId, user) => {
  const consultation = await getConsultationById(consultationId, user);

  const updated = await prisma.consultation.update({
    where: { id: consultationId },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
    },
  });

  // Also complete associated appointment
  await prisma.appointment.update({
    where: { id: consultation.appointmentId },
    data: { status: "COMPLETED" },
  });

  await createAuditLog({
    userId: user.userId,
    action: "CONSULTATION_ENDED",
    resourceType: "CONSULTATION",
    resourceId: consultationId,
  });

  return updated;
};

module.exports = {
  createConsultation,
  getConsultationById,
  joinConsultation,
  endConsultation,
};
