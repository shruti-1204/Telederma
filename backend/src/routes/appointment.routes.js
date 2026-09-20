const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointment.controller");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createAppointmentSchema,
  appointmentIdParamSchema,
} = require("../validators/appointment.validator");

// Shared / List & Details
router.get("/", requireAuth, appointmentController.getAppointments);
router.post(
  "/",
  requireAuth,
  requireRole("PATIENT"),
  validate(createAppointmentSchema),
  appointmentController.createAppointment
);
router.get(
  "/:appointmentId",
  requireAuth,
  validate(appointmentIdParamSchema),
  appointmentController.getAppointmentById
);
router.patch(
  "/:appointmentId/cancel",
  requireAuth,
  validate(appointmentIdParamSchema),
  appointmentController.cancelAppointment
);

// Doctor Appointment Management
router.patch(
  "/:appointmentId/confirm",
  requireAuth,
  requireRole("DOCTOR", "ADMIN"),
  validate(appointmentIdParamSchema),
  appointmentController.confirmAppointment
);
router.patch(
  "/:appointmentId/reject",
  requireAuth,
  requireRole("DOCTOR", "ADMIN"),
  validate(appointmentIdParamSchema),
  appointmentController.rejectAppointment
);
router.patch(
  "/:appointmentId/complete",
  requireAuth,
  requireRole("DOCTOR", "ADMIN"),
  validate(appointmentIdParamSchema),
  appointmentController.completeAppointment
);
router.patch(
  "/:appointmentId/no-show",
  requireAuth,
  requireRole("DOCTOR", "ADMIN"),
  validate(appointmentIdParamSchema),
  appointmentController.noShowAppointment
);

module.exports = router;
