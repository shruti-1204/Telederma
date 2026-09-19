const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patient.controller");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  updatePatientProfileSchema,
  createMedicalHistorySchema,
  updateMedicalHistorySchema,
  patientIdParamSchema,
} = require("../validators/patient.validator");

// Patient Profile
router.get("/me", requireAuth, requireRole("PATIENT"), patientController.getMyProfile);
router.put(
  "/me",
  requireAuth,
  requireRole("PATIENT"),
  validate(updatePatientProfileSchema),
  patientController.updateMyProfile
);

// Patient Medical History
router.get(
  "/me/medical-history",
  requireAuth,
  requireRole("PATIENT"),
  patientController.getMyMedicalHistory
);
router.post(
  "/me/medical-history",
  requireAuth,
  requireRole("PATIENT"),
  validate(createMedicalHistorySchema),
  patientController.addMyMedicalHistory
);
router.put(
  "/me/medical-history/:id",
  requireAuth,
  requireRole("PATIENT"),
  validate(updateMedicalHistorySchema),
  patientController.updateMyMedicalHistory
);
router.delete(
  "/me/medical-history/:id",
  requireAuth,
  requireRole("PATIENT"),
  patientController.deleteMyMedicalHistory
);

const aiController = require("../controllers/ai.controller");
const progressImageController = require("../controllers/progressImage.controller");
const prescriptionController = require("../controllers/prescription.controller");

// Patient AI Assessments
router.get("/me/ai-assessments", requireAuth, requireRole("PATIENT"), aiController.getMyAssessments);

// Patient Prescriptions
router.get("/me/prescriptions", requireAuth, requireRole("PATIENT"), prescriptionController.getMyPrescriptions);

// Doctor / Admin Access to Patient Medical History
router.get(
  "/:patientId/medical-history",
  requireAuth,
  requireRole("DOCTOR", "ADMIN"),
  validate(patientIdParamSchema),
  patientController.getPatientMedicalHistoryForDoctor
);

// Doctor / Admin Access to Patient Progress Images
router.get(
  "/:patientId/progress",
  requireAuth,
  requireRole("DOCTOR", "ADMIN"),
  validate(patientIdParamSchema),
  progressImageController.getPatientProgressForDoctor
);

module.exports = router;
