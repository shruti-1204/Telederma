const rateLimit = require("express-rate-limit");
const { sendError } = require("../utils/response");

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, "Too many requests from this IP, please try again later", [], 429);
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 auth requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, "Too many authentication attempts, please try again after 15 minutes", [], 429);
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
};
