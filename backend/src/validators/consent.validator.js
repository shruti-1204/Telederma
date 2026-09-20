const { z } = require("zod");

const submitConsentSchema = {
  body: z.object({
    consentType: z.enum([
      "TELECONSULTATION",
      "DATA_PROCESSING",
      "AI_ASSISTANCE",
      "IMAGE_ANALYSIS",
    ]),
    version: z.string().default("1.0"),
    accepted: z.boolean(),
  }),
};

module.exports = {
  submitConsentSchema,
};
