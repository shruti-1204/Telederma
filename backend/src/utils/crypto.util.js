const crypto = require("crypto");
const env = require("../config/env");

const ALGORITHM = "aes-256-cbc";
const SALT = "telederma_salt_v1";

// Primary encryption secret
const PRIMARY_SECRET =
  process.env.ENCRYPTION_KEY ||
  env.JWT_ACCESS_SECRET ||
  "telederma_jwt_access_secret_key_default_development_2026";

// Candidate secrets for backward-compatible decryption of values in the DB
const CANDIDATE_SECRETS = Array.from(
  new Set(
    [
      PRIMARY_SECRET,
      "telederma_jwt_access_secret_key_default_development_2026",
      env.JWT_ACCESS_SECRET,
      process.env.ENCRYPTION_KEY,
      "telederma_secure_encryption_secret_2026",
    ].filter(Boolean)
  )
);

// Derive 32-byte keys deterministically for each secret
const KEYS = CANDIDATE_SECRETS.map((secret) =>
  crypto.scryptSync(secret, SALT, 32)
);
const PRIMARY_KEY = KEYS[0];

/**
 * Two-way symmetric encryption (AES-256-CBC)
 * Encrypts plain text (e.g. UPI ID) into a secure hex string: iv:encryptedData
 */
const encrypt = (plainText) => {
  if (!plainText || typeof plainText !== "string") return plainText;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, PRIMARY_KEY, iv);
    let encrypted = cipher.update(plainText.trim(), "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  } catch (err) {
    console.error("[Crypto] Encryption error:", err.message);
    return plainText;
  }
};

/**
 * Two-way symmetric decryption (AES-256-CBC)
 * Restores original plain text from iv:encryptedData
 */
const decrypt = (cipherText) => {
  if (!cipherText || typeof cipherText !== "string") return cipherText;
  // If not in iv:encrypted format, it's either unencrypted plain text or invalid
  if (!cipherText.includes(":")) return cipherText;

  const parts = cipherText.split(":");
  if (parts.length !== 2) return cipherText;
  if (parts[0].length !== 32) return cipherText;

  try {
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];

    for (const key of KEYS) {
      try {
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText, "hex", "utf8");
        decrypted += decipher.final("utf8");
        if (decrypted && decrypted.length > 0) {
          return decrypted;
        }
      } catch (err) {
        // Try next candidate key
      }
    }
  } catch (err) {
    console.error("[Crypto] Decryption error:", err.message);
  }

  return cipherText;
};

module.exports = {
  encrypt,
  decrypt,
};
