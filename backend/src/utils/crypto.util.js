const crypto = require("crypto");
const env = require("../config/env");

// 32-byte key derived deterministically from secret
const MASTER_SECRET = process.env.ENCRYPTION_KEY || env.JWT_ACCESS_SECRET || "telederma_secure_encryption_secret_2026";
const ALGORITHM = "aes-256-cbc";
const KEY = crypto.scryptSync(MASTER_SECRET, "telederma_salt_v1", 32);

/**
 * Two-way symmetric encryption (AES-256-CBC)
 * Encrypts plain text (e.g. UPI ID) into a secure hex string: iv:encryptedData
 */
const encrypt = (plainText) => {
  if (!plainText || typeof plainText !== "string") return plainText;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
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
 * Restores original text from iv:encryptedData
 */
const decrypt = (cipherText) => {
  if (!cipherText || typeof cipherText !== "string") return cipherText;
  // If not in iv:encrypted format, it's either unencrypted or invalid
  if (!cipherText.includes(":")) return cipherText;

  try {
    const parts = cipherText.split(":");
    if (parts.length !== 2) return cipherText;

    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    // If decryption fails (e.g. it was plain text containing a colon), return original
    return cipherText;
  }
};

module.exports = {
  encrypt,
  decrypt,
};
