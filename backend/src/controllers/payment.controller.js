const paymentService = require("../services/payment.service");
const { sendSuccess } = require("../utils/response");
const { emitToDoctor, emitToPatient, emitToRoom, emitToUser } = require("../services/websocket.service");

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

const getDoctorPaymentDetails = async (req, res, next) => {
  try {
    const details = await paymentService.getDoctorPaymentDetails(req.params.id, req.user);
    return sendSuccess(res, "Doctor payment details retrieved", details);
  } catch (err) {
    return next(err);
  }
};

const claimPaymentMade = async (req, res, next) => {
  try {
    const result = await paymentService.claimPaymentMade({
      appointmentId: req.body.appointmentId,
      consultationId: req.body.consultationId,
      user: req.user,
      amount: req.body.amount,
      upiReference: req.body.upiReference,
    });

    // Notify Doctor immediately via real-time WebSocket
    emitToDoctor(result.doctorId, "payment:claimed", result);
    if (result.doctorUserId) {
      emitToUser(result.doctorUserId, "payment:claimed", result);
    }
    emitToRoom(`room_${result.appointmentId}`, "payment:claimed", result);

    return sendSuccess(res, "Payment notification sent to doctor", result);
  } catch (err) {
    return next(err);
  }
};

const confirmPaymentReceived = async (req, res, next) => {
  try {
    const result = await paymentService.confirmPaymentReceived({
      appointmentId: req.body.appointmentId,
      consultationId: req.body.consultationId,
      user: req.user,
    });

    // Real-Time Notification: Unlock Rx and Complete Session for Patient
    emitToPatient(result.patientId, "payment:confirmed", {
      appointmentId: result.appointment?.id,
      consultationId: result.consultation?.id,
      amount: result.appointment?.amount,
      status: "SUCCESS",
    });

    if (result.prescription) {
      emitToPatient(result.patientId, "prescription:unlocked", result.prescription);
      emitToRoom(`room_${result.appointment?.id}`, "prescription:unlocked", result.prescription);
    }

    emitToPatient(result.patientId, "appointment:completed", {
      appointmentId: result.appointment?.id,
      status: "COMPLETED",
    });
    emitToDoctor(result.doctorId, "appointment:completed", {
      appointmentId: result.appointment?.id,
      status: "COMPLETED",
    });
    emitToRoom(`room_${result.appointment?.id}`, "consultation:ended", {
      consultationId: result.consultation?.id,
      status: "COMPLETED",
    });

    return sendSuccess(res, "Payment confirmed and prescription released successfully", result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentById,
  getDoctorPaymentDetails,
  claimPaymentMade,
  confirmPaymentReceived,
};
