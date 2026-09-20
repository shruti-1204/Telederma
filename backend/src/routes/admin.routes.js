const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctor.controller");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { adminDoctorIdParamSchema } = require("../validators/doctor.validator");
const prisma = require("../config/prisma");
const { sendSuccess } = require("../utils/response");

// Admin Doctor Verification
router.get("/doctors/pending", requireAuth, requireRole("ADMIN"), doctorController.getPendingDoctors);
router.patch(
  "/doctors/:id/verify",
  requireAuth,
  requireRole("ADMIN"),
  validate(adminDoctorIdParamSchema),
  doctorController.verifyDoctor
);
router.patch(
  "/doctors/:id/reject",
  requireAuth,
  requireRole("ADMIN"),
  validate(adminDoctorIdParamSchema),
  doctorController.rejectDoctor
);

// Admin Audit Logs & User Management
router.get("/audit-logs", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { timestamp: "desc" },
      include: {
        user: { select: { id: true, name: true, phone: true, role: true } },
      },
    });
    return sendSuccess(res, "Audit logs retrieved", logs);
  } catch (err) {
    return next(err);
  }
});

router.get("/users", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        patient: true,
        doctor: true,
      },
    });
    return sendSuccess(res, "All platform users retrieved", users);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
