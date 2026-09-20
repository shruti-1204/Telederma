const { z } = require("zod");

const updateDoctorProfileSchema = {
  body: z.object({
    specialization: z.string().max(100).optional(),
    qualification: z.string().max(100).optional(),
    licenseNumber: z.string().max(50).optional(),
    bio: z.string().max(2000).optional(),
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
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
