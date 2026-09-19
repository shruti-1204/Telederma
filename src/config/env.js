require("dotenv").config();

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  DATABASE_URL: process.env.DATABASE_URL,
  
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "telederma_jwt_access_secret_key_default_development_2026",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "telederma_jwt_refresh_secret_key_default_development_2026",
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || "1h",
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || "7d",

  REDIS_URL: process.env.REDIS_URL || "",

  // S3 / Storage
  S3_ENDPOINT: process.env.S3_ENDPOINT || "",
  S3_REGION: process.env.S3_REGION || "us-east-1",
  S3_BUCKET: process.env.S3_BUCKET || "telederma-uploads",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || "",
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || "",

  // AI Service
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://localhost:8000",

  // Payment
  PAYMENT_KEY: process.env.PAYMENT_KEY || "",
  PAYMENT_SECRET: process.env.PAYMENT_SECRET || "",

  // Development OTP Bypass
  DEV_OTP: process.env.DEV_OTP || "123456",
};

module.exports = env;
