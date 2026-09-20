const reminderService = require("../services/reminder.service");
const { sendSuccess } = require("../utils/response");

const createReminder = async (req, res, next) => {
  try {
    const reminder = await reminderService.createReminder({
      userId: req.user.userId,
      type: req.body.type,
      title: req.body.title,
      description: req.body.description,
      remindAt: req.body.remindAt,
    });
    return sendSuccess(res, "Reminder created successfully", reminder, 201);
  } catch (err) {
    return next(err);
  }
};

const getMyReminders = async (req, res, next) => {
  try {
    const reminders = await reminderService.getRemindersByUser(req.user.userId);
    return sendSuccess(res, "Reminders retrieved", reminders);
  } catch (err) {
    return next(err);
  }
};

const deleteReminder = async (req, res, next) => {
  try {
    await reminderService.deleteReminder(req.params.id, req.user.userId);
    return sendSuccess(res, "Reminder deleted successfully");
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createReminder,
  getMyReminders,
  deleteReminder,
};
