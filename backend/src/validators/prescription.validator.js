const { z } = require("zod");

const prescriptionItemSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
});

const createPrescriptionSchema = {
  body: z.object({
    consultationId: z.string().optional(),
    appointmentId: z.string().optional(),
    patientId: z.string().optional(),
    diagnosis: z.string().optional(),
    notes: z.string().optional(),
    followUpDate: z.string().optional(),
    items: z.array(prescriptionItemSchema).min(1, "At least one prescription item is required"),
  }),
};

const prescriptionIdParamSchema = {
  params: z.object({
    prescriptionId: z.string().min(1, "Prescription ID is required"),
  }),
};

module.exports = {
  createPrescriptionSchema,
  prescriptionIdParamSchema,
};
