const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const upload = require("../middleware/upload");
const {
  createAiAssessmentSchema,
  assessmentIdParamSchema,
  overrideAssessmentSchema,
} = require("../validators/ai.validator");

router.post(
  "/image-quality",
  upload.single("image"),
  aiController.checkImageQuality
);

router.post(
  "/assessments",
  requireAuth,
  requireRole("PATIENT"),
  validate(createAiAssessmentSchema),
  aiController.createAssessment
);

router.get(
  "/assessments/:id",
  requireAuth,
  validate(assessmentIdParamSchema),
  aiController.getAssessmentById
);

router.post(
  "/assessments/:id/override",
  requireAuth,
  requireRole("DOCTOR", "ADMIN"),
  validate(overrideAssessmentSchema),
  aiController.overrideAssessment
);

module.exports = router;
