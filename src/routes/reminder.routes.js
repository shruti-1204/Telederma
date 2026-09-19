const express = require("express");
const router = express.Router();
const reminderController = require("../controllers/reminder.controller");
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createReminderSchema,
  reminderIdParamSchema,
} = require("../validators/reminder.validator");

router.post(
  "/",
  requireAuth,
  validate(createReminderSchema),
  reminderController.createReminder
);

router.get("/", requireAuth, reminderController.getMyReminders);

router.delete(
  "/:id",
  requireAuth,
  validate(reminderIdParamSchema),
  reminderController.deleteReminder
);

module.exports = router;
