import Notification from "../models/Notification.js";

let ioInstance = null;
export function setNotificationSocket(io) { ioInstance = io; }

export async function createNotification({ recipient, type = "system", title, message, link = "" }) {
  if (!recipient || !title || !message) return null;
  try {
    const notification = await Notification.create({ recipient, type, title, message, link });
    if (ioInstance) {
      ioInstance.to(`user:${String(recipient)}`).emit("notification:new", notification.toObject());
    }
    return notification;
  } catch (error) {
    console.error("Create notification error:", error);
    return null;
  }
}
