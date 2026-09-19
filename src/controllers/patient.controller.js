const patientService = require("../services/patient.service");
const { sendSuccess } = require("../utils/response");

const getMyProfile = async (req, res, next) => {
  try {
    const patient = await patientService.getPatientByUserId(req.user.userId);
    return sendSuccess(res, "Patient profile retrieved", patient);
  } catch (err) {
    return next(err);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const updated = await patientService.updatePatientProfile(req.user.userId, req.body);
    return sendSuccess(res, "Patient profile updated successfully", updated);
  } catch (err) {
    return next(err);
  }
};

const getMyMedicalHistory = async (req, res, next) => {
  try {
    const patient = await patientService.getPatientByUserId(req.user.userId);
    const history = await patientService.getMedicalHistory(patient.id);
    return sendSuccess(res, "Medical history retrieved", history);
  } catch (err) {
    return next(err);
  }
};

const addMyMedicalHistory = async (req, res, next) => {
  try {
    const patient = await patientService.getPatientByUserId(req.user.userId);
    const record = await patientService.addMedicalHistory(patient.id, req.user.userId, req.body);
    return sendSuccess(res, "Medical history entry created", record, 201);
  } catch (err) {
    return next(err);
  }
};

const updateMyMedicalHistory = async (req, res, next) => {
  try {
    const patient = await patientService.getPatientByUserId(req.user.userId);
    const updated = await patientService.updateMedicalHistory(
      req.params.id,
      patient.id,
      req.user.userId,
      req.body
    );
    return sendSuccess(res, "Medical history entry updated", updated);
  } catch (err) {
    return next(err);
  }
};

const deleteMyMedicalHistory = async (req, res, next) => {
  try {
    const patient = await patientService.getPatientByUserId(req.user.userId);
    await patientService.deleteMedicalHistory(req.params.id, patient.id, req.user.userId);
    return sendSuccess(res, "Medical history entry deleted");
  } catch (err) {
    return next(err);
  }
};

const getPatientMedicalHistoryForDoctor = async (req, res, next) => {
  try {
    const history = await patientService.getDoctorAuthorizedPatientHistory(
      req.user.doctorId,
      req.params.patientId,
      req.user.role,
      req.user.userId
    );
    return sendSuccess(res, "Patient medical history retrieved", history);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getMyMedicalHistory,
  addMyMedicalHistory,
  updateMyMedicalHistory,
  deleteMyMedicalHistory,
  getPatientMedicalHistoryForDoctor,
};
