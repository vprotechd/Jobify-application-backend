import Notification from "../models/Notification.js";

export async function createNotification({ recipient, type = "system", title, message, link = "" }) {
  if (!recipient || !title || !message) return null;
  try {
    return await Notification.create({ recipient, type, title, message, link });
  } catch (error) {
    console.error("Create notification error:", error);
    return null;
  }
}
