const { z } = require("zod");

const notificationIdParamSchema = {
  params: z.object({
    id: z.string().min(1, "Notification ID is required"),
  }),
};

module.exports = {
  notificationIdParamSchema,
};
