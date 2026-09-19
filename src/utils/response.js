/**
 * Standard API Response Format:
 * Success: { success: true, message: string, data: any }
 * Error:   { success: false, message: string, errors: array }
 */

const sendSuccess = (res, message = "Operation successful", data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, message = "Operation failed", errors = [], statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors],
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
