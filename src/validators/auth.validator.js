const { z } = require("zod");

const sendOtpSchema = {
  body: z.object({
    phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number too long"),
  }),
};

const verifyOtpSchema = {
  body: z.object({
    phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number too long"),
    otp: z.string().length(6, "OTP must be exactly 6 digits"),
    role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]).optional().default("PATIENT"),
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    email: z.string().email("Invalid email address").optional(),
  }),
};

const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
};

module.exports = {
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
};
