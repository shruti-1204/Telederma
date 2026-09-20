const { z } = require("zod");

const updatePatientProfileSchema = {
  body: z.object({
    dateOfBirth: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    gender: z.string().max(20).optional(),
    bloodGroup: z.string().max(10).optional(),
    allergies: z.string().max(1000).optional(),
    existingConditions: z.string().max(1000).optional(),
    currentMedications: z.string().max(1000).optional(),
    skinHistory: z.string().max(2000).optional(),
    emergencyContact: z.string().max(100).optional(),
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
  }),
};

const createMedicalHistorySchema = {
  body: z.object({
    condition: z.string().min(1, "Condition is required").max(200),
    diagnosisDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    notes: z.string().max(2000).optional(),
  }),
};

const updateMedicalHistorySchema = {
  params: z.object({
    id: z.string().min(1, "Medical history ID is required"),
  }),
  body: z.object({
    condition: z.string().min(1).max(200).optional(),
    diagnosisDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    notes: z.string().max(2000).optional(),
  }),
};

const patientIdParamSchema = {
  params: z.object({
    patientId: z.string().min(1, "Patient ID is required"),
  }),
};

module.exports = {
  updatePatientProfileSchema,
  createMedicalHistorySchema,
  updateMedicalHistorySchema,
  patientIdParamSchema,
};
