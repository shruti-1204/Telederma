const paymentService = require("../services/payment.service");
const { sendSuccess } = require("../utils/response");

const createOrder = async (req, res, next) => {
  try {
    const result = await paymentService.createOrder({
      appointmentId: req.body.appointmentId,
      patientId: req.user.patientId,
      amount: req.body.amount,
      currency: req.body.currency,
      userId: req.user.userId,
    });
    return sendSuccess(res, "Payment order created", result, 201);
  } catch (err) {
    return next(err);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const result = await paymentService.verifyPayment({
      paymentId: req.body.paymentId,
      providerPaymentId: req.body.providerPaymentId,
      providerOrderId: req.body.providerOrderId,
      signature: req.body.signature,
      userId: req.user.userId,
    });
    return sendSuccess(res, "Payment verified successfully", result);
  } catch (err) {
    return next(err);
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.paymentId, req.user);
    return sendSuccess(res, "Payment details retrieved", payment);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentById,
};
