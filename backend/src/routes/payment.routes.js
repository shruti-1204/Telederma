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

module.exports = router;
