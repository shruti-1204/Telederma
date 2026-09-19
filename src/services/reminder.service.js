const prisma = require("../config/prisma");
const { NotFoundError } = require("../utils/errors");
const { createAuditLog } = require("./audit.service");

const createReminder = async ({ userId, type, title, description, remindAt }) => {
  const reminder = await prisma.reminder.create({
    data: {
      userId,
      type,
      title,
      description: description || null,
      remindAt: new Date(remindAt),
    },
  });

  await createAuditLog({
    userId,
    action: "REMINDER_CREATED",
    resourceType: "REMINDER",
    resourceId: reminder.id,
    metadata: { type, remindAt: reminder.remindAt },
  });

  return reminder;
};

const getRemindersByUser = async (userId) => {
  return prisma.reminder.findMany({
    where: { userId },
    orderBy: { remindAt: "asc" },
  });
};

const deleteReminder = async (id, userId) => {
  const reminder = await prisma.reminder.findUnique({
    where: { id },
  });

  if (!reminder || reminder.userId !== userId) {
    throw new NotFoundError("Reminder not found");
  }

  await prisma.reminder.delete({
    where: { id },
  });

  await createAuditLog({
    userId,
    action: "REMINDER_DELETED",
    resourceType: "REMINDER",
    resourceId: id,
  });

  return true;
};

module.exports = {
  createReminder,
  getRemindersByUser,
  deleteReminder,
};
