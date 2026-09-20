const express = require("express");
const router = express.Router();
const consultationController = require("../controllers/consultation.controller");
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createConsultationSchema,
  consultationIdParamSchema,
} = require("../validators/consultation.validator");

router.post(
  "/",
  requireAuth,
  validate(createConsultationSchema),
  consultationController.createConsultation
);

router.get(
  "/:consultationId",
  requireAuth,
  validate(consultationIdParamSchema),
  consultationController.getConsultationById
);

router.post(
  "/:consultationId/join",
  requireAuth,
  validate(consultationIdParamSchema),
  consultationController.joinConsultation
);

router.post(
  "/:consultationId/end",
  requireAuth,
  validate(consultationIdParamSchema),
  consultationController.endConsultation
);

module.exports = router;
