const { z } = require("zod");

const createAiAssessmentSchema = {
  body: z.object({
    imageId: z.string().min(1, "Skin image ID is required"),
    consultationId: z.string().optional(),
  }),
};

const assessmentIdParamSchema = {
  params: z.object({
    id: z.string().min(1, "Assessment ID is required"),
  }),
};

const overrideAssessmentSchema = {
  params: z.object({
    id: z.string().min(1, "Assessment ID is required"),
  }),
  body: z.object({
    riskLevel: z.enum(["GREEN", "YELLOW", "RED"]),
    assessment: z.string().min(2, "Doctor assessment notes are required"),
  }),
};

module.exports = {
  createAiAssessmentSchema,
  assessmentIdParamSchema,
  overrideAssessmentSchema,
};
