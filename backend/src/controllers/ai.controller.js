const aiService = require("../services/ai.service");
const { sendSuccess } = require("../utils/response");

const createAssessment = async (req, res, next) => {
  try {
    const assessment = await aiService.createAssessment({
      imageId: req.body.imageId,
      consultationId: req.body.consultationId,
      patientId: req.user.patientId,
      userId: req.user.userId,
    });
    return sendSuccess(res, "AI assessment completed", assessment, 201);
  } catch (err) {
    return next(err);
  }
};

const getAssessmentById = async (req, res, next) => {
  try {
    const assessment = await aiService.getAssessmentById(req.params.id, req.user);
    return sendSuccess(res, "AI assessment retrieved", assessment);
  } catch (err) {
    return next(err);
  }
};

const getMyAssessments = async (req, res, next) => {
  try {
    const assessments = await aiService.getPatientAssessments(req.user.patientId);
    return sendSuccess(res, "Patient AI assessments retrieved", assessments);
  } catch (err) {
    return next(err);
  }
};

const overrideAssessment = async (req, res, next) => {
  try {
    const updated = await aiService.overrideAssessment(
      req.params.id,
      req.body,
      req.user
    );
    return sendSuccess(res, "AI assessment overridden by doctor", updated);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createAssessment,
  getAssessmentById,
  getMyAssessments,
  overrideAssessment,
};
