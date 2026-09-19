const prisma = require("../config/prisma");
const { NotFoundError } = require("../utils/errors");

// Notification provider adapter (Push/SMS/Email)
class NotificationChannelAdapter {
  async sendPush({ userId, title, message }) {
    // In production, integrate Firebase Cloud Messaging (FCM)
    return true;
  }

  async sendSms({ phone, message }) {
    // In production, integrate Twilio / Fast2SMS
    return true;
  }

  async sendEmail({ email, subject, body }) {
    // In production, integrate SendGrid / AWS SES
    return true;
  }
}

const adapter = new NotificationChannelAdapter();

const createNotification = async ({ userId, type, title, message, metadata = null }) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata,
    },
  });

  // Trigger push channel
  adapter.sendPush({ userId, title, message }).catch(() => {});

  return notification;
};

const getNotificationsByUser = async (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
};

const markNotificationAsRead = async (id, userId) => {
  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification || notification.userId !== userId) {
    throw new NotFoundError("Notification not found");
  }

  return prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

module.exports = {
  createNotification,
  getNotificationsByUser,
  markNotificationAsRead,
};
