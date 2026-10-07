const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  paymentIdParamSchema,
} = require("../validators/payment.validator");

router.post(
  "/create-order",
  requireAuth,
  requireRole("PATIENT"),
  validate(createPaymentOrderSchema),
  paymentController.createOrder
);

router.post(
  "/verify",
  requireAuth,
  requireRole("PATIENT"),
  validate(verifyPaymentSchema),
  paymentController.verifyPayment
);

router.get(
  "/:paymentId",
  requireAuth,
  validate(paymentIdParamSchema),
  paymentController.getPaymentById
);


router.post('/mock-success', requireAuth, async (req, res, next) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.appointment.update({
      where: { id: req.body.appointmentId },
      data: { paymentStatus: 'COMPLETED' }
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;


