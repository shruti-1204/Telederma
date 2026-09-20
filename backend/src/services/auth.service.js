const jwt = require("jsonwebtoken");
const env = require("../config/env");
const prisma = require("../config/prisma");
const redis = require("../config/redis");
const { createAuditLog } = require("./audit.service");
const { BadRequestError, UnauthorizedError, NotFoundError } = require("../utils/errors");

const OTP_TTL = 300; // 5 minutes

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtp = async (phone) => {
  const otp = env.NODE_ENV === "development" ? env.DEV_OTP : generateOtp();
  const redisKey = `otp:${phone}`;
  await redis.set(redisKey, otp, "EX", OTP_TTL);

  // In production, integrate SMS provider (Twilio / Fast2SMS / AWS SNS) here
  if (env.NODE_ENV === "development") {
    console.log(`[DEV OTP] Phone: ${phone}, OTP: ${otp}`);
  }

  await createAuditLog({
    action: "OTP_SENT",
    resourceType: "AUTH",
    metadata: { phone },
  });

  return {
    phone,
    expiresIn: OTP_TTL,
    // Provide devOtp only in development mode for easy testing
    ...(env.NODE_ENV === "development" && { devOtp: otp }),
  };
};

const verifyOtp = async ({ phone, otp, role = "PATIENT", name, email }) => {
  const redisKey = `otp:${phone}`;
  const storedOtp = await redis.get(redisKey);

  if (!storedOtp) {
    throw new BadRequestError("OTP expired or not requested");
  }

  if (storedOtp !== otp && !(env.NODE_ENV === "development" && otp === env.DEV_OTP)) {
    throw new BadRequestError("Invalid OTP entered");
  }

  // Clear OTP after successful verification
  await redis.del(redisKey);

  // Find or create User
  let user = await prisma.user.findUnique({
    where: { phone },
    include: {
      patient: true,
      doctor: true,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        role,
        name: name || null,
        email: email || null,
        ...(role === "PATIENT" && {
          patient: {
            create: {},
          },
        }),
        ...(role === "DOCTOR" && {
          doctor: {
            create: {},
          },
        }),
      },
      include: {
        patient: true,
        doctor: true,
      },
    });
  } else {
    // If user exists without patient/doctor record for their role, create it
    if (user.role === "PATIENT" && !user.patient) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { patient: { create: {} } },
        include: { patient: true, doctor: true },
      });
    } else if (user.role === "DOCTOR" && !user.doctor) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { doctor: { create: {} } },
        include: { patient: true, doctor: true },
      });
    }
  }

  const payload = {
    userId: user.id,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });

  // Store refresh token in Redis for revocation control (7 days)
  await redis.set(`refresh:${user.id}:${refreshToken}`, "1", "EX", 7 * 24 * 3600);

  await createAuditLog({
    userId: user.id,
    action: "LOGIN_SUCCESS",
    resourceType: "AUTH",
    resourceId: user.id,
    metadata: { role: user.role, phone: user.phone },
  });

  return {
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      patientId: user.patient?.id || null,
      doctorId: user.doctor?.id || null,
      isVerifiedDoctor: user.doctor?.isVerified || false,
    },
    accessToken,
    refreshToken,
    expiresIn: env.JWT_ACCESS_EXPIRES,
  };
};

const refreshAccessToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const isValidSession = await redis.get(`refresh:${decoded.userId}:${refreshToken}`);
  if (!isValidSession) {
    throw new UnauthorizedError("Refresh token revoked or session expired");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new UnauthorizedError("User is no longer active");
  }

  const newAccessToken = jwt.sign(
    { userId: user.id, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES }
  );

  return {
    accessToken: newAccessToken,
    expiresIn: env.JWT_ACCESS_EXPIRES,
  };
};

const logout = async (userId, refreshToken) => {
  if (refreshToken) {
    await redis.del(`refresh:${userId}:${refreshToken}`);
  }
  await createAuditLog({
    userId,
    action: "LOGOUT",
    resourceType: "AUTH",
    resourceId: userId,
  });
  return true;
};

const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patient: true,
      doctor: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    patient: user.patient,
    doctor: user.doctor,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

module.exports = {
  sendOtp,
  verifyOtp,
  refreshAccessToken,
  logout,
  getMe,
};
