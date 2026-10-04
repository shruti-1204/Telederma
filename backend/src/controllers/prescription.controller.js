const prescriptionService = require("../services/prescription.service");
const { sendSuccess } = require("../utils/response");
const {
  emitToPatient,
  emitToUser,
  emitToRoom,
} = require("../services/websocket.service");

const createPrescription = async (req, res, next) => {
  try {
    const prescription = await prescriptionService.createPrescription({
      consultationId: req.body.consultationId,
      patientId: req.body.patientId,
      notes: req.body.notes,
      items: req.body.items,
      doctorUser: req.user,
    });

    // Real-Time Notification: Push new prescription directly to the patient in real time!
    emitToPatient(prescription.patientId, "prescription:new", prescription);
    if (prescription.patient?.user?.id) {
      emitToUser(prescription.patient.user.id, "prescription:new", prescription);
    }
    if (prescription.consultation?.roomId) {
      emitToRoom(prescription.consultation.roomId, "prescription:new", prescription);
    }

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
