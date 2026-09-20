const express = require("express");
const router = express.Router();
const followUpController = require("../controllers/followUp.controller");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createFollowUpSchema,
  updateFollowUpSchema,
} = require("../validators/followUp.validator");

router.post(
  "/",
  requireAuth,
  requireRole("DOCTOR", "ADMIN"),
  validate(createFollowUpSchema),
  followUpController.createFollowUp
);

router.get("/", requireAuth, followUpController.getFollowUps);

router.put(
  "/:id",
  requireAuth,
  requireRole("DOCTOR", "ADMIN"),
  validate(updateFollowUpSchema),
  followUpController.updateFollowUp
);

module.exports = router;
