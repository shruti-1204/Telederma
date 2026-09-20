const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
} = require("../validators/auth.validator");

router.post("/send-otp", authLimiter, validate(sendOtpSchema), authController.sendOtp);
router.post("/verify-otp", authLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post("/refresh", validate(refreshTokenSchema), authController.refresh);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.getMe);

module.exports = router;
