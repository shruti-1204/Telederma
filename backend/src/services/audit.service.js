const prisma = require("../config/prisma");

const SENSITIVE_KEYS = ["password", "otp", "token", "jwt", "secret", "cvv", "cardNumber", "authorization"];

const sanitizeMetadata = (data) => {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  // Handle Decimal or Date or instances with toString/toJSON
  if (data && typeof data.toFixed === "function") {
    return Number(data.toString());
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) return data.map(sanitizeMetadata);

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeMetadata(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

const createAuditLog = async ({ userId = null, action, resourceType, resourceId = null, metadata = null }) => {
  try {
    const cleanMeta = metadata ? sanitizeMetadata(metadata) : null;
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId: resourceId ? String(resourceId) : null,
        metadata: cleanMeta,
      },
    });
  } catch (err) {
    // Non-blocking: Audit logging failure should not crash core business transactions
    console.error("Audit log error:", err.message);
  }
};

module.exports = {
  createAuditLog,
  sanitizeMetadata,
};
