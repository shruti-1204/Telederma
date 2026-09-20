const consultationService = require("../services/consultation.service");
const { sendSuccess } = require("../utils/response");

const createConsultation = async (req, res, next) => {
  try {
    const consultation = await consultationService.createConsultation({
      appointmentId: req.body.appointmentId,
      user: req.user,
    });
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
    return sendSuccess(res, "Consultation session ended", consultation);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createConsultation,
  getConsultationById,
  joinConsultation,
  endConsultation,
};
