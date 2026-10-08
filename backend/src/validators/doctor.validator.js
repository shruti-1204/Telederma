const { z } = require("zod");

const updateDoctorProfileSchema = {
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional().or(z.literal("")),
    avatar: z.string().optional().nullable(),
    gender: z.string().max(20).optional().nullable(),
    age: z.number().or(z.string()).optional().nullable(),
    dateOfBirth: z.string().optional().nullable(),
    specialization: z.string().max(100).optional().nullable(),
    qualification: z.string().max(200).optional().nullable(),
    experienceYears: z.number().or(z.string()).optional().nullable(),
    hospitalClinic: z.string().max(200).optional().nullable(),
    expertiseAreas: z.string().max(500).optional().nullable(),
    consultationFee: z.number().or(z.string()).optional().nullable(),
    availableSlots: z.string().max(1000).optional().nullable(),
    consultationDuration: z.string().max(50).optional().nullable(),
    languages: z.string().max(200).optional().nullable(),
    upiId: z.string().max(100).optional().nullable(),
    licenseNumber: z.string().max(50).optional().nullable(),
    bio: z.string().max(2000).optional().nullable(),
  }),
};

const createAvailabilitySchema = {
  body: z.object({
    dayOfWeek: z.number().int().min(0).max(6), // 0 = Sunday, 6 = Saturday
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time format must be HH:mm (e.g. 09:30)"),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time format must be HH:mm (e.g. 17:00)"),
    isActive: z.boolean().optional().default(true),
  }).refine((data) => data.startTime < data.endTime, {
    message: "startTime must be earlier than endTime",
    path: ["endTime"],
  }),
};

const updateAvailabilitySchema = {
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    isActive: z.boolean().optional(),
  }),
};

const doctorSlotsQuerySchema = {
  params: z.object({
    doctorId: z.string().min(1),
  }),
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format must be YYYY-MM-DD"),
  }),
};

const doctorIdParamSchema = {
  params: z.object({
    doctorId: z.string().min(1),
  }),
};

const adminDoctorIdParamSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
};

module.exports = {
  updateDoctorProfileSchema,
  createAvailabilitySchema,
  updateAvailabilitySchema,
  doctorSlotsQuerySchema,
  doctorIdParamSchema,
  adminDoctorIdParamSchema,
};
