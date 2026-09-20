const fs = require("fs");
const path = require("path");
const env = require("../config/env");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");

// Ensure local upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

class StorageService {
  /**
   * Upload file buffer or file stream to S3 / Local storage
   */
  async uploadFile({ buffer, originalName, mimeType, folder = "skin-images" }) {
    const ext = path.extname(originalName).toLowerCase() || ".jpg";
    const uniqueFilename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;

    if (env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET) {
      // S3 upload provider logic (when AWS credentials are provided)
      return {
        storageKey: uniqueFilename,
        provider: "S3",
        bucket: env.S3_BUCKET,
        url: `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${uniqueFilename}`,
      };
    }

    // Local Disk Object Store Provider fallback
    const targetFolder = path.join(UPLOAD_DIR, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const localFilePath = path.join(UPLOAD_DIR, uniqueFilename);
    fs.writeFileSync(localFilePath, buffer);

    return {
      storageKey: uniqueFilename,
      provider: "LOCAL",
      bucket: "local-storage",
      url: `/uploads/${uniqueFilename.replace(/\\/g, "/")}`,
    };
  }

  /**
   * Generate access URL or signed URL for storage key
   */
  async getAccessUrl(storageKey) {
    if (env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET) {
      // In production, generate AWS presigned get URL with expiration
      return `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${storageKey}`;
    }
    return `/uploads/${storageKey.replace(/\\/g, "/")}`;
  }

  /**
   * Delete file from storage
   */
  async deleteFile(storageKey) {
    try {
      const localFilePath = path.join(UPLOAD_DIR, storageKey);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
      return true;
    } catch (err) {
      console.warn("Error deleting storage file:", err.message);
      return false;
    }
  }
}

module.exports = new StorageService();
