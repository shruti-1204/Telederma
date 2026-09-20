const { z } = require("zod");

const createConsultationSchema = {
  body: z.object({
    appointmentId: z.string().min(1, "Appointment ID is required"),
  }),
};

const consultationIdParamSchema = {
  params: z.object({
    consultationId: z.string().min(1, "Consultation ID is required"),
  }),
};

module.exports = {
  createConsultationSchema,
  consultationIdParamSchema,
};
