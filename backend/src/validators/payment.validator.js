const { z } = require("zod");

const createPaymentOrderSchema = {
  body: z.object({
    appointmentId: z.string().min(1, "Appointment ID is required"),
    amount: z.number().positive("Amount must be greater than 0"),
    currency: z.string().default("INR"),
  }),
};

const verifyPaymentSchema = {
  body: z.object({
    paymentId: z.string().min(1, "Payment record ID is required"),
    providerPaymentId: z.string().min(1, "Provider payment ID is required"),
    providerOrderId: z.string().optional(),
    signature: z.string().optional(),
  }),
};

const paymentIdParamSchema = {
  params: z.object({
    paymentId: z.string().min(1, "Payment ID is required"),
  }),
};

module.exports = {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  paymentIdParamSchema,
};
