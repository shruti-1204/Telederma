const { z } = require("zod");

const searchMedicineSchema = {
  query: z.object({
    q: z.string().min(1, "Search query is required"),
  }),
};

const medicineIdParamSchema = {
  params: z.object({
    medicineId: z.string().min(1, "Medicine ID is required"),
  }),
};

module.exports = {
  searchMedicineSchema,
  medicineIdParamSchema,
};
