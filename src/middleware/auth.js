const jwt = require("jsonwebtoken");
const env = require("../config/env");
const prisma = require("../config/prisma");
const { UnauthorizedError, ForbiddenError } = require("../utils/errors");

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authentication token required");
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new UnauthorizedError("Access token expired");
      }
      throw new UnauthorizedError("Invalid access token");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        patient: { select: { id: true } },
        doctor: { select: { id: true, isVerified: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedError("User no longer exists");
    }

    if (user.status === "SUSPENDED" || user.status === "INACTIVE") {
      throw new ForbiddenError(`User account is ${user.status.toLowerCase()}`);
    }

    let patientId = user.patient?.id || null;
    if (user.role === "PATIENT" && !patientId) {
      const newPatient = await prisma.patient.create({ data: { userId: user.id } });
      patientId = newPatient.id;
    }

    let doctorId = user.doctor?.id || null;
    if (user.role === "DOCTOR" && !doctorId) {
      const newDoctor = await prisma.doctor.create({ data: { userId: user.id } });
      doctorId = newDoctor.id;
    }

    req.user = {
      id: user.id,
      userId: user.id,
      role: user.role,
      phone: user.phone,
      email: user.email,
      name: user.name,
      status: user.status,
      patientId,
      doctorId,
      isVerifiedDoctor: user.doctor?.isVerified || false,
    };

    return next();
  } catch (err) {
    return next(err);
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access denied. Requires one of roles: ${roles.join(", ")}`));
    }
    return next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
};
