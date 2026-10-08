const prescriptionService = require("../services/prescription.service");
const { sendSuccess } = require("../utils/response");
const {
  emitToPatient,
  emitToDoctor,
  emitToUser,
  emitToRoom,
} = require("../services/websocket.service");

const createPrescription = async (req, res, next) => {
  try {
    const prescription = await prescriptionService.createPrescription({
      consultationId: req.body.consultationId,
      appointmentId: req.body.appointmentId,
      patientId: req.body.patientId,
      diagnosis: req.body.diagnosis,
      notes: req.body.notes,
      followUpDate: req.body.followUpDate,
      items: req.body.items,
      doctorUser: req.user,
    });

    if (prescription.isUnlocked) {
      // Free consultation or already unlocked
      emitToPatient(prescription.patientId, "prescription:new", prescription);
      emitToPatient(prescription.patientId, "consultation:completed", {
        consultationId: prescription.consultationId,
        appointmentId: prescription.consultation?.appointmentId,
        status: "COMPLETED",
      });
      emitToPatient(prescription.patientId, "appointment:completed", {
        appointmentId: prescription.consultation?.appointmentId,
        status: "COMPLETED",
      });

      emitToDoctor(prescription.doctorId, "consultation:completed", {
        consultationId: prescription.consultationId,
        appointmentId: prescription.consultation?.appointmentId,
        status: "COMPLETED",
      });
      emitToDoctor(prescription.doctorId, "appointment:completed", {
        appointmentId: prescription.consultation?.appointmentId,
        status: "COMPLETED",
      });

      if (prescription.patient?.user?.id) {
        emitToUser(prescription.patient.user.id, "prescription:new", prescription);
      }
      if (prescription.consultation?.roomId) {
        emitToRoom(prescription.consultation.roomId, "prescription:new", prescription);
        emitToRoom(prescription.consultation.roomId, "consultation:ended", {
          consultationId: prescription.consultationId,
          status: "COMPLETED",
        });
      }
    } else {
      // Prescription created but locked awaiting patient payment
      const lockedPayload = {
        consultationId: prescription.consultationId,
        appointmentId: prescription.consultation?.appointmentId,
        prescriptionId: prescription.id,
        status: "LOCKED_AWAITING_PAYMENT",
      };
      emitToPatient(prescription.patientId, "prescription:locked", lockedPayload);
      if (prescription.patient?.user?.id) {
        emitToUser(prescription.patient.user.id, "prescription:locked", lockedPayload);
      }
      if (prescription.consultation?.roomId) {
        emitToRoom(prescription.consultation.roomId, "prescription:locked", lockedPayload);
      }
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
    let prescriptions = [];
    if (req.user.role === "DOCTOR") {
      prescriptions = await prescriptionService.getDoctorPrescriptions(req.user.doctorId);
    } else {
      prescriptions = await prescriptionService.getPatientPrescriptions(req.user.patientId);
    }
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
