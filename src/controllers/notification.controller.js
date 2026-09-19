const notificationService = require("../services/notification.service");
const { sendSuccess } = require("../utils/response");

const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.getNotificationsByUser(req.user.userId);
    return sendSuccess(res, "Notifications retrieved", notifications);
  } catch (err) {
    return next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const updated = await notificationService.markNotificationAsRead(
      req.params.id,
      req.user.userId
    );
    return sendSuccess(res, "Notification marked as read", updated);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
};
