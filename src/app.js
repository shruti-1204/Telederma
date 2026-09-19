const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const prisma = require("./config/prisma");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const { generalLimiter } = require("./middleware/rateLimiter");
const { swaggerServe, swaggerSetup } = require("./docs/swagger");

// Route imports
const authRoutes = require("./routes/auth.routes");
const patientRoutes = require("./routes/patient.routes");
const doctorRoutes = require("./routes/doctor.routes");
const adminRoutes = require("./routes/admin.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const paymentRoutes = require("./routes/payment.routes");
const skinImageRoutes = require("./routes/skinImage.routes");
const progressImageRoutes = require("./routes/progressImage.routes");
const aiRoutes = require("./routes/ai.routes");
const consultationRoutes = require("./routes/consultation.routes");
const prescriptionRoutes = require("./routes/prescription.routes");
const medicineRoutes = require("./routes/medicine.routes");
const notificationRoutes = require("./routes/notification.routes");
const reminderRoutes = require("./routes/reminder.routes");
const followUpRoutes = require("./routes/followUp.routes");
const consentRoutes = require("./routes/consent.routes");

const app = express();

// Security and Parsing
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Swagger UI Documentation
app.use("/api/docs", swaggerServe, swaggerSetup);

// Apply General Rate Limiter to API routes
app.use("/api/v1", generalLimiter);

// ----------------------------------------------------
// Core Health Check Endpoints (Preserved & Guaranteed)
// ----------------------------------------------------
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "TeleDerma Backend is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/v1/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "TeleDerma Backend and PostgreSQL are connected",
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// ----------------------------------------------------
// TeleDerma API Modules
// ----------------------------------------------------
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/doctors", doctorRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/skin-images", skinImageRoutes);
app.use("/api/v1/progress-images", progressImageRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/consultations", consultationRoutes);
app.use("/api/v1/prescriptions", prescriptionRoutes);
app.use("/api/v1/medicines", medicineRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/reminders", reminderRoutes);
app.use("/api/v1/follow-ups", followUpRoutes);
app.use("/api/v1/consents", consentRoutes);

// ----------------------------------------------------
// 404 & Centralized Error Handlers
// ----------------------------------------------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;