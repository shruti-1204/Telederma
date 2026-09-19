const { z } = require("zod");

const createFollowUpSchema = {
  body: z.object({
    patientId: z.string().min(1, "Patient ID is required"),
    consultationId: z.string().optional(),
    followUpDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    notes: z.string().optional(),
  }),
};

const updateFollowUpSchema = {
  params: z.object({
    id: z.string().min(1, "Follow-up ID is required"),
  }),
  body: z.object({
    followUpDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional(),
    notes: z.string().optional(),
  }),
};

const followUpIdParamSchema = {
  params: z.object({
    id: z.string().min(1, "Follow-up ID is required"),
  }),
};

module.exports = {
  createFollowUpSchema,
  updateFollowUpSchema,
  followUpIdParamSchema,
};
