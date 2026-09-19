const { z } = require("zod");

const createReminderSchema = {
  body: z.object({
    type: z.enum(["APPOINTMENT", "MEDICINE", "FOLLOW_UP", "PROGRESS_PHOTO", "GENERAL"]),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    remindAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  }),
};

const reminderIdParamSchema = {
  params: z.object({
    id: z.string().min(1, "Reminder ID is required"),
  }),
};

module.exports = {
  createReminderSchema,
  reminderIdParamSchema,
};
