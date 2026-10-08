const consultationService = require("../services/consultation.service");
const { sendSuccess } = require("../utils/response");
const {
  emitToRoom,
  emitToUser,
  emitToPatient,
  emitToDoctor,
} = require("../services/websocket.service");

const createConsultation = async (req, res, next) => {
  try {
    const consultation = await consultationService.createConsultation({
      appointmentId: req.body.appointmentId,
      user: req.user,
    });

    // Notify peers that a consultation session is ready
    emitToPatient(consultation.patientId, "consultation:ready", consultation);
    emitToDoctor(consultation.doctorId, "consultation:ready", consultation);

    return sendSuccess(res, "Consultation session ready", consultation, 201);
  } catch (err) {
    return next(err);
  }
};

const getConsultationById = async (req, res, next) => {
  try {
    const consultation = await consultationService.getConsultationById(
      req.params.consultationId,
      req.user
    );
    return sendSuccess(res, "Consultation retrieved", consultation);
  } catch (err) {
    return next(err);
  }
};

const joinConsultation = async (req, res, next) => {
  try {
    const sessionData = await consultationService.joinConsultation(
      req.params.consultationId,
      req.user
    );

    // Real-Time Notification: inform peer that user joined the room
    emitToRoom(sessionData.roomId, "consultation:peer-joined", {
      consultationId: sessionData.consultationId,
      roomId: sessionData.roomId,
      peer: sessionData.peerIdentity,
    });

    if (req.user.role === "PATIENT") {
      emitToRoom(sessionData.roomId, "consultation:patient-joined", {
        consultationId: sessionData.consultationId,
        roomId: sessionData.roomId,
        patientId: req.user.patientId,
        joinedAt: Date.now(),
      });
    }

    return sendSuccess(res, "Joined consultation session", sessionData);
  } catch (err) {
    return next(err);
  }
};

const endConsultation = async (req, res, next) => {
  try {
    const consultation = await consultationService.endConsultation(
      req.params.consultationId,
      req.user
    );

    // Notify room and both users that consultation has completed
    emitToRoom(consultation.roomId, "consultation:ended", {
      consultationId: consultation.id,
      status: "COMPLETED",
    });
    emitToPatient(consultation.patientId, "consultation:ended", consultation);
    emitToDoctor(consultation.doctorId, "consultation:ended", consultation);
    emitToPatient(consultation.patientId, "consultation:completed", consultation);
    emitToDoctor(consultation.doctorId, "consultation:completed", consultation);
    emitToPatient(consultation.patientId, "appointment:completed", {
      appointmentId: consultation.appointmentId,
      status: "COMPLETED",
    });
    emitToDoctor(consultation.doctorId, "appointment:completed", {
      appointmentId: consultation.appointmentId,
      status: "COMPLETED",
    });

    return sendSuccess(res, "Consultation session ended", consultation);
  } catch (err) {
    return next(err);
  }
};

const leaveConsultation = async (req, res, next) => {
  try {
    const consultation = await consultationService.leaveConsultation(
      req.params.consultationId,
      req.user
    );
    return sendSuccess(res, "Left consultation session", consultation);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createConsultation,
  getConsultationById,
  joinConsultation,
  endConsultation,
  leaveConsultation,
};
