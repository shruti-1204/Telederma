const crypto = require("crypto");
const env = require("../config/env");
const prisma = require("../config/prisma");
const { NotFoundError, BadRequestError, ForbiddenError } = require("../utils/errors");
const { createAuditLog } = require("./audit.service");

class PaymentProvider {
  async createOrder({ amount, currency, receipt }) {
    if (env.PAYMENT_KEY && env.PAYMENT_SECRET) {
      // In production, Razorpay / Stripe order creation logic goes here
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      return {
        id: orderId,
        amount,
        currency,
        provider: "RAZORPAY",
      };
    }

    // Default mock payment provider for development
    return {
      id: `mock_order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      amount,
      currency,
      provider: "MOCK_PROVIDER",
    };
  }

  verifySignature({ orderId, paymentId, signature }) {
    if (env.PAYMENT_KEY && env.PAYMENT_SECRET) {
      const generatedSignature = crypto
        .createHmac("sha256", env.PAYMENT_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
      return generatedSignature === signature;
    }
    // In dev / mock mode, accept valid string
    return true;
  }
}

const providerInstance = new PaymentProvider();

const createOrder = async ({ appointmentId, patientId, amount, currency = "INR", userId }) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }

  if (appointment.patientId !== patientId) {
    throw new ForbiddenError("You can only create payments for your own appointments");
  }

  const order = await providerInstance.createOrder({
    amount,
    currency,
    receipt: `rcpt_${appointmentId}`,
  });

  const payment = await prisma.payment.create({
    data: {
      appointmentId,
      patientId,
      amount,
      currency,
      provider: order.provider,
      providerOrderId: order.id,
      status: "PENDING",
    },
  });

  await createAuditLog({
    userId,
    action: "PAYMENT_ORDER_CREATED",
    resourceType: "PAYMENT",
    resourceId: payment.id,
    metadata: { appointmentId, amount, providerOrderId: order.id },
  });

  return {
    paymentId: payment.id,
    orderId: order.id,
    amount,
    currency,
    key: env.PAYMENT_KEY || "mock_key_telederma",
    provider: order.provider,
  };
};

const verifyPayment = async ({ paymentId, providerPaymentId, providerOrderId, signature, userId }) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { appointment: true },
  });

  if (!payment) {
    throw new NotFoundError("Payment record not found");
  }

  const orderId = providerOrderId || payment.providerOrderId;
  const isValid = providerInstance.verifySignature({
    orderId,
    paymentId: providerPaymentId,
    signature,
  });

  if (!isValid) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "FAILED" },
    });

    throw new BadRequestError("Payment verification signature failed");
  }

  // Update payment and appointment status in a single transaction
  const [updatedPayment, updatedAppointment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "SUCCESS",
        providerPaymentId,
      },
    }),
    prisma.appointment.update({
      where: { id: payment.appointmentId },
      data: {
        paymentStatus: "SUCCESS",
        status: "CONFIRMED",
      },
    }),
  ]);

  await createAuditLog({
    userId,
    action: "PAYMENT_SUCCESS",
    resourceType: "PAYMENT",
    resourceId: paymentId,
    metadata: {
      appointmentId: payment.appointmentId,
      providerPaymentId,
      amount: payment.amount,
    },
  });

  return {
    payment: updatedPayment,
    appointment: updatedAppointment,
  };
};

const getPaymentById = async (paymentId, user) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      appointment: {
        include: {
          doctor: { include: { user: { select: { name: true } } } },
          patient: { include: { user: { select: { name: true } } } },
        },
      },
    },
  });

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  if (user.role === "PATIENT" && payment.patientId !== user.patientId) {
    throw new ForbiddenError("Access denied");
  }

  return payment;
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentById,
};
