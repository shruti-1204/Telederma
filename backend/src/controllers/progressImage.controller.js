const progressImageService = require("../services/progressImage.service");
const { sendSuccess } = require("../utils/response");

const uploadProgressImage = async (req, res, next) => {
  try {
    const result = await progressImageService.uploadProgressImage({
      file: req.file,
      patientId: req.user.patientId,
      consultationId: req.body.consultationId,
      notes: req.body.notes,
      userId: req.user.userId,
    });
    return sendSuccess(res, "Progress image uploaded successfully", result, 201);
  } catch (err) {
    return next(err);
  }
};

const getMyProgressImages = async (req, res, next) => {
  try {
    const images = await progressImageService.getProgressImagesByPatient(
      req.user.patientId,
      req.user
    );
    return sendSuccess(res, "Progress images retrieved", images);
  } catch (err) {
    return next(err);
  }
};

const getPatientProgressForDoctor = async (req, res, next) => {
  try {
    const images = await progressImageService.getProgressImagesByPatient(
      req.params.patientId,
      req.user
    );
    return sendSuccess(res, "Patient progress images retrieved", images);
  } catch (err) {
    return next(err);
  }
};

const getProgressImageById = async (req, res, next) => {
  try {
    const image = await progressImageService.getProgressImageById(req.params.id, req.user);
    return sendSuccess(res, "Progress image retrieved", image);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  uploadProgressImage,
  getMyProgressImages,
  getPatientProgressForDoctor,
  getProgressImageById,
};
