const crypto = require("crypto");
const env = require("../config/env");
const prisma = require("../config/prisma");
const { NotFoundError, BadRequestError, ForbiddenError } = require("../utils/errors");
const { createAuditLog } = require("./audit.service");
const { decrypt } = require("../utils/crypto.util");

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

/**
 * Fetch decrypted Doctor payment details for a specific consultation or appointment
 */
const getDoctorPaymentDetails = async (id, user) => {
  // Can be appointmentId or consultationId
  let consultation = await prisma.consultation.findFirst({
    where: {
      OR: [{ id }, { appointmentId: id }],
    },
    include: {
      doctor: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
      patient: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
      prescription: true,
      appointment: true,
    },
  });

  let appointment = consultation?.appointment;
  if (!consultation) {
    appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: {
          include: { user: { select: { id: true, name: true, phone: true } } },
        },
        patient: {
          include: { user: { select: { id: true, name: true, phone: true } } },
        },
        consultation: { include: { prescription: true } },
      },
    });
    if (!appointment) {
      throw new NotFoundError("Consultation or Appointment not found");
    }
  }

  const doctor = consultation?.doctor || appointment?.doctor;
  if (!doctor) {
    throw new NotFoundError("Assigned doctor not found");
  }

  const doctorName = doctor.user?.name ? (doctor.user.name.startsWith("Dr.") ? doctor.user.name : `Dr. ${doctor.user.name}`) : "Dr. Specialist";
  const decryptedUpi = decrypt(doctor.upiId) || "9870924590@okaxis"; // fallback demo upi
  const fee = doctor.consultationFee ? parseFloat(doctor.consultationFee) : 700;

  // Build standard NPCI UPI Intent URI
  const upiPayString = `upi://pay?pa=${encodeURIComponent(decryptedUpi)}&pn=${encodeURIComponent(doctorName)}&am=${fee.toFixed(2)}&cu=INR&tn=${encodeURIComponent("TeleDerma Consultation Fee")}`;

  const isUnlocked = consultation?.prescription?.isUnlocked ?? true;

  return {
    doctorId: doctor.id,
    doctorUserId: doctor.userId,
    doctorName,
    doctorPhone: doctor.user?.phone,
    consultationFee: fee,
    upiId: decryptedUpi,
    upiPayString,
    appointmentId: appointment?.id || consultation?.appointmentId,
    consultationId: consultation?.id,
    prescriptionId: consultation?.prescription?.id,
    isUnlocked,
    paymentStatus: appointment?.paymentStatus || "PENDING",
  };
};

/**
 * Patient claims they made the direct UPI payment
 */
const claimPaymentMade = async ({ appointmentId, consultationId, user, amount, upiReference }) => {
  let apptId = appointmentId;
  let consult = null;

  if (consultationId) {
    consult = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { doctor: { include: { user: true } }, patient: { include: { user: true } } },
    });
    if (consult) apptId = consult.appointmentId;
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: apptId },
    include: { doctor: { include: { user: true } }, patient: { include: { user: true } } },
  });

  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }

  const payAmount = amount || (appointment.doctor?.consultationFee ? parseFloat(appointment.doctor.consultationFee) : 700);

  // Upsert payment record with status PENDING
  const payment = await prisma.payment.upsert({
    where: {
      id: `pay_${apptId}`,
    },
    update: {
      status: "PENDING",
      amount: payAmount,
      providerPaymentId: upiReference || `claim_${Date.now()}`,
    },
    create: {
      id: `pay_${apptId}`,
      appointmentId: apptId,
      patientId: appointment.patientId,
      amount: payAmount,
      currency: "INR",
      provider: "UPI_DIRECT",
      providerOrderId: `claim_${Date.now()}`,
      providerPaymentId: upiReference || `claim_${Date.now()}`,
      status: "PENDING",
    },
  });

  return {
    paymentId: payment.id,
    appointmentId: apptId,
    consultationId: consult?.id,
    doctorId: appointment.doctorId,
    doctorUserId: appointment.doctor?.userId,
    patientId: appointment.patientId,
    patientName: appointment.patient?.user?.name || "Patient",
    amount: payAmount,
    status: "PENDING_VERIFICATION",
  };
};

/**
 * Doctor confirms receipt of direct UPI payment and unlocks prescription
 */
const confirmPaymentReceived = async ({ appointmentId, consultationId, user }) => {
  let apptId = appointmentId;
  let consult = null;

  if (consultationId) {
    consult = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { prescription: { include: { items: true } }, appointment: true },
    });
    if (consult) apptId = consult.appointmentId;
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: apptId },
    include: {
      consultation: { include: { prescription: { include: { items: true } } } },
      doctor: { include: { user: true } },
      patient: { include: { user: true } },
    },
  });

  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }

  // Update in a transaction: Payment -> SUCCESS, Appointment -> COMPLETED, Consultation -> COMPLETED, Prescription -> isUnlocked: true
  const cRecord = consult || appointment.consultation;

  // Find linked prescription whether attached to consultation or appointmentId directly
  let rx = cRecord?.prescription;
  if (!rx) {
    rx = await prisma.prescription.findFirst({
      where: {
        OR: [
          { appointmentId: apptId },
          cRecord?.id ? { consultationId: cRecord.id } : undefined,
        ].filter(Boolean),
      },
      include: { items: true },
    });
  }

  const [updatedAppt] = await prisma.$transaction([
    prisma.appointment.update({
      where: { id: apptId },
      data: {
        status: "COMPLETED",
        paymentStatus: "SUCCESS",
      },
    }),
    ...(cRecord ? [
      prisma.consultation.update({
        where: { id: cRecord.id },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
        },
      }),
    ] : []),
    ...(rx ? [
      prisma.prescription.update({
        where: { id: rx.id },
        data: {
          isUnlocked: true,
        },
      }),
    ] : []),
    prisma.payment.upsert({
      where: { id: `pay_${apptId}` },
      update: { status: "SUCCESS" },
      create: {
        id: `pay_${apptId}`,
        appointmentId: apptId,
        patientId: appointment.patientId,
        amount: appointment.doctor?.consultationFee ? parseFloat(appointment.doctor.consultationFee) : 700,
        currency: "INR",
        provider: "UPI_DIRECT",
        status: "SUCCESS",
      },
    }),
  ]);

  // Fetch complete unlocked prescription
  let unlockedPrescription = null;
  if (rx) {
    unlockedPrescription = await prisma.prescription.findUnique({
      where: { id: rx.id },
      include: {
        items: true,
        doctor: { include: { user: { select: { name: true, phone: true } } } },
        patient: { include: { user: { select: { name: true, phone: true } } } },
      },
    });
  }

  return {
    appointment: updatedAppt,
    consultation: cRecord,
    prescription: unlockedPrescription,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
  };
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentById,
  getDoctorPaymentDetails,
  claimPaymentMade,
  confirmPaymentReceived,
};
