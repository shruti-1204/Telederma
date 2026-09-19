const { sendError } = require("../utils/response");

const notFound = (req, res, next) => {
  return sendError(
    res,
    `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`,
    [{ path: req.originalUrl, message: "Route does not exist" }],
    404
  );
};

module.exports = notFound;
