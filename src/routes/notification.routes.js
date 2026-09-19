const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { notificationIdParamSchema } = require("../validators/notification.validator");

router.get("/", requireAuth, notificationController.getMyNotifications);
router.patch(
  "/:id/read",
  requireAuth,
  validate(notificationIdParamSchema),
  notificationController.markAsRead
);

module.exports = router;
