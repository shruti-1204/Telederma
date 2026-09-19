const express = require("express");
const router = express.Router();
const consentController = require("../controllers/consent.controller");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { submitConsentSchema } = require("../validators/consent.validator");

router.post(
  "/",
  requireAuth,
  requireRole("PATIENT"),
  validate(submitConsentSchema),
  consentController.submitConsent
);

router.get("/me", requireAuth, requireRole("PATIENT"), consentController.getMyConsents);

module.exports = router;
