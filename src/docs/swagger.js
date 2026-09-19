const swaggerUi = require("swagger-ui-express");

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "TeleDerma Central Backend API",
    version: "1.0.0",
    description:
      "Enterprise AI-Powered Dermatology Telemedicine Platform Unified Backend Specification (Node.js, Express, PostgreSQL, Prisma 7, Redis, AI Service, S3, WebRTC, Razorpay)",
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local Development Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/api/v1/health": {
      get: {
        summary: "Platform Health Check",
        tags: ["Health"],
        responses: {
          200: { description: "TeleDerma Backend is operational" },
        },
      },
    },
    "/api/v1/health/db": {
      get: {
        summary: "Database Connectivity Health Check",
        tags: ["Health"],
        responses: {
          200: { description: "PostgreSQL & Prisma connected" },
          500: { description: "Database connection failed" },
        },
      },
    },
    "/api/v1/auth/send-otp": {
      post: {
        summary: "Request OTP for authentication",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["phone"],
                properties: {
                  phone: { type: "string", example: "9876543210" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "OTP sent successfully" },
        },
      },
    },
    "/api/v1/auth/verify-otp": {
      post: {
        summary: "Verify OTP and obtain JWT tokens",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["phone", "otp"],
                properties: {
                  phone: { type: "string", example: "9876543210" },
                  otp: { type: "string", example: "123456" },
                  role: { type: "string", enum: ["PATIENT", "DOCTOR", "ADMIN"], default: "PATIENT" },
                  name: { type: "string", example: "John Doe" },
                  email: { type: "string", example: "john@example.com" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Authentication successful with Access & Refresh tokens" },
        },
      },
    },
    "/api/v1/auth/refresh": {
      post: {
        summary: "Refresh access token",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                  refreshToken: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "New access token issued" },
        },
      },
    },
    "/api/v1/auth/me": {
      get: {
        summary: "Get current authenticated user identity",
        security: [{ BearerAuth: [] }],
        tags: ["Auth"],
        responses: {
          200: { description: "User profile details" },
        },
      },
    },
    "/api/v1/patients/me": {
      get: {
        summary: "Get patient profile",
        security: [{ BearerAuth: [] }],
        tags: ["Patients"],
        responses: { 200: { description: "Patient profile retrieved" } },
      },
      put: {
        summary: "Update patient profile",
        security: [{ BearerAuth: [] }],
        tags: ["Patients"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  dateOfBirth: { type: "string", example: "1995-05-12" },
                  gender: { type: "string", example: "Male" },
                  bloodGroup: { type: "string", example: "O+" },
                  allergies: { type: "string", example: "Penicillin" },
                  existingConditions: { type: "string", example: "None" },
                  currentMedications: { type: "string", example: "None" },
                  skinHistory: { type: "string", example: "Mild eczema in childhood" },
                  emergencyContact: { type: "string", example: "+919999988888" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Profile updated" } },
      },
    },
    "/api/v1/doctors": {
      get: {
        summary: "Search and list verified doctors",
        tags: ["Doctors"],
        parameters: [
          { name: "specialization", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "List of verified doctors" } },
      },
    },
    "/api/v1/doctors/{doctorId}/slots": {
      get: {
        summary: "Get doctor available 30-min time slots for date",
        tags: ["Doctors"],
        parameters: [
          { name: "doctorId", in: "path", required: true, schema: { type: "string" } },
          { name: "date", in: "query", required: true, schema: { type: "string", example: "2026-10-15" } },
        ],
        responses: { 200: { description: "Generated slots list" } },
      },
    },
    "/api/v1/appointments": {
      post: {
        summary: "Book an appointment",
        security: [{ BearerAuth: [] }],
        tags: ["Appointments"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["doctorId", "slotStart", "slotEnd"],
                properties: {
                  doctorId: { type: "string" },
                  slotStart: { type: "string", example: "2026-10-15T10:00:00.000Z" },
                  slotEnd: { type: "string", example: "2026-10-15T10:30:00.000Z" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Appointment booked" } },
      },
      get: {
        summary: "List appointments for current user",
        security: [{ BearerAuth: [] }],
        tags: ["Appointments"],
        responses: { 200: { description: "Appointments list" } },
      },
    },
    "/api/v1/payments/create-order": {
      post: {
        summary: "Create payment order for appointment",
        security: [{ BearerAuth: [] }],
        tags: ["Payments"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["appointmentId", "amount"],
                properties: {
                  appointmentId: { type: "string" },
                  amount: { type: "number", example: 500 },
                  currency: { type: "string", default: "INR" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Order created" } },
      },
    },
    "/api/v1/payments/verify": {
      post: {
        summary: "Verify payment signature & confirm appointment",
        security: [{ BearerAuth: [] }],
        tags: ["Payments"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["paymentId", "providerPaymentId"],
                properties: {
                  paymentId: { type: "string" },
                  providerPaymentId: { type: "string" },
                  providerOrderId: { type: "string" },
                  signature: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Payment verified" } },
      },
    },
    "/api/v1/skin-images/upload": {
      post: {
        summary: "Upload lesion / consultation skin image",
        security: [{ BearerAuth: [] }],
        tags: ["Images"],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["image"],
                properties: {
                  image: { type: "string", format: "binary" },
                  consultationId: { type: "string" },
                  imageType: { type: "string", example: "LESION" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Image uploaded and stored" } },
      },
    },
    "/api/v1/ai/assessments": {
      post: {
        summary: "Run AI quality check, condition assessment & triage",
        security: [{ BearerAuth: [] }],
        tags: ["AI"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["imageId"],
                properties: {
                  imageId: { type: "string" },
                  consultationId: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "AI assessment result (GREEN/YELLOW/RED)" } },
      },
    },
    "/api/v1/consultations": {
      post: {
        summary: "Initialize consultation session",
        security: [{ BearerAuth: [] }],
        tags: ["Consultations"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["appointmentId"],
                properties: {
                  appointmentId: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Consultation session ready" } },
      },
    },
    "/api/v1/consultations/{consultationId}/join": {
      post: {
        summary: "Join WebRTC video consultation room with authorization",
        security: [{ BearerAuth: [] }],
        tags: ["Consultations"],
        parameters: [
          { name: "consultationId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Room token and ICE servers provided" } },
      },
    },
    "/api/v1/prescriptions": {
      post: {
        summary: "Doctor creates e-prescription",
        security: [{ BearerAuth: [] }],
        tags: ["Prescriptions"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["consultationId", "patientId", "items"],
                properties: {
                  consultationId: { type: "string" },
                  patientId: { type: "string" },
                  notes: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["medicineName"],
                      properties: {
                        medicineName: { type: "string" },
                        dosage: { type: "string" },
                        frequency: { type: "string" },
                        duration: { type: "string" },
                        instructions: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Prescription generated" } },
      },
    },
    "/api/v1/medicines/search": {
      get: {
        summary: "Search medicines directory",
        tags: ["Medicines"],
        parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Medicines list" } },
      },
    },
    "/api/v1/notifications": {
      get: {
        summary: "Get user notifications",
        security: [{ BearerAuth: [] }],
        tags: ["Notifications"],
        responses: { 200: { description: "Notifications list" } },
      },
    },
    "/api/v1/reminders": {
      post: {
        summary: "Create schedule reminder",
        security: [{ BearerAuth: [] }],
        tags: ["Reminders"],
        responses: { 201: { description: "Reminder created" } },
      },
      get: {
        summary: "List user reminders",
        security: [{ BearerAuth: [] }],
        tags: ["Reminders"],
        responses: { 200: { description: "Reminders list" } },
      },
    },
  },
};

module.exports = {
  swaggerServe: swaggerUi.serve,
  swaggerSetup: swaggerUi.setup(swaggerDocument),
};
