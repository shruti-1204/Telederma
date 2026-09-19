const express = require("express");
const router = express.Router();
const prescriptionController = require("../controllers/prescription.controller");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createPrescriptionSchema,
  prescriptionIdParamSchema,
} = require("../validators/prescription.validator");

router.post(
  "/",
  requireAuth,
  requireRole("DOCTOR", "ADMIN"),
  validate(createPrescriptionSchema),
  prescriptionController.createPrescription
);

router.get(
  "/:prescriptionId",
  requireAuth,
  validate(prescriptionIdParamSchema),
  prescriptionController.getPrescriptionById
);

module.exports = router;
