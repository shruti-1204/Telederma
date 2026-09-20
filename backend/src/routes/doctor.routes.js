const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctor.controller");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  updateDoctorProfileSchema,
  createAvailabilitySchema,
  updateAvailabilitySchema,
  doctorSlotsQuerySchema,
  doctorIdParamSchema,
} = require("../validators/doctor.validator");

// Doctor Self Management (Must be logged in DOCTOR)
router.get("/me", requireAuth, requireRole("DOCTOR"), doctorController.getMyProfile);
router.put(
  "/me",
  requireAuth,
  requireRole("DOCTOR"),
  validate(updateDoctorProfileSchema),
  doctorController.updateMyProfile
);
router.get("/me/availability", requireAuth, requireRole("DOCTOR"), doctorController.getMyAvailability);
router.post(
  "/me/availability",
  requireAuth,
  requireRole("DOCTOR"),
  validate(createAvailabilitySchema),
  doctorController.createMyAvailability
);
router.put(
  "/me/availability/:id",
  requireAuth,
  requireRole("DOCTOR"),
  validate(updateAvailabilitySchema),
  doctorController.updateMyAvailability
);
router.delete(
  "/me/availability/:id",
  requireAuth,
  requireRole("DOCTOR"),
  doctorController.deleteMyAvailability
);

// Public / Patient accessible Doctor endpoints
router.get("/", doctorController.listDoctors);
router.get("/:doctorId", validate(doctorIdParamSchema), doctorController.getDoctorById);
router.get("/:doctorId/availability", validate(doctorIdParamSchema), doctorController.getDoctorAvailability);
router.get("/:doctorId/slots", validate(doctorSlotsQuerySchema), doctorController.getDoctorSlots);

module.exports = router;
