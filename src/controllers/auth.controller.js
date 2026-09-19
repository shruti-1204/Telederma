const authService = require("../services/auth.service");
const { sendSuccess } = require("../utils/response");

const sendOtp = async (req, res, next) => {
  try {
    const result = await authService.sendOtp(req.body.phone);
    return sendSuccess(res, "OTP sent successfully", result);
  } catch (err) {
    return next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const result = await authService.verifyOtp(req.body);
    return sendSuccess(res, "Authentication successful", result);
  } catch (err) {
    return next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const result = await authService.refreshAccessToken(req.body.refreshToken);
    return sendSuccess(res, "Token refreshed successfully", result);
  } catch (err) {
    return next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken;
    await authService.logout(req.user.userId, refreshToken);
    return sendSuccess(res, "Logged out successfully");
  } catch (err) {
    return next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.userId);
    return sendSuccess(res, "User profile retrieved", user);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  refresh,
  logout,
  getMe,
};
