const { sendError } = require("../utils/response");
const { AppError } = require("../utils/errors");

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  // Handle Prisma Known Errors
  if (err.code === "P2002") {
    statusCode = 409;
    const target = err.meta?.target ? err.meta.target.join(", ") : "field";
    message = `A record with this ${target} already exists`;
  } else if (err.code === "P2025") {
    statusCode = 404;
    message = "Record not found";
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token expired";
  }

  if (process.env.NODE_ENV === "development" && statusCode === 500) {
    console.error("Unhandled Error:", err);
  }

  // Never expose raw stack trace to clients
  return sendError(res, message, errors, statusCode);
};

module.exports = errorHandler;
