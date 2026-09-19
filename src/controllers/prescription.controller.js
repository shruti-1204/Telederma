const prescriptionService = require("../services/prescription.service");
const { sendSuccess } = require("../utils/response");

const createPrescription = async (req, res, next) => {
  try {
    const prescription = await prescriptionService.createPrescription({
      consultationId: req.body.consultationId,
      patientId: req.body.patientId,
      notes: req.body.notes,
      items: req.body.items,
      doctorUser: req.user,
    });
    return sendSuccess(res, "Prescription created successfully", prescription, 201);
  } catch (err) {
    return next(err);
  }
};

const getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await prescriptionService.getPrescriptionById(
      req.params.prescriptionId,
      req.user
    );
    return sendSuccess(res, "Prescription retrieved", prescription);
  } catch (err) {
    return next(err);
  }
};

const getMyPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await prescriptionService.getPatientPrescriptions(req.user.patientId);
    return sendSuccess(res, "Prescriptions retrieved", prescriptions);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createPrescription,
  getPrescriptionById,
  getMyPrescriptions,
};
