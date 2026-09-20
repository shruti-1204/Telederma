const { z } = require("zod");

const imageIdParamSchema = {
  params: z.object({
    imageId: z.string().min(1, "Image ID is required"),
  }),
};

const progressImageIdParamSchema = {
  params: z.object({
    id: z.string().min(1, "Progress image ID is required"),
  }),
};

const patientProgressParamSchema = {
  params: z.object({
    patientId: z.string().min(1, "Patient ID is required"),
  }),
};

module.exports = {
  imageIdParamSchema,
  progressImageIdParamSchema,
  patientProgressParamSchema,
};
