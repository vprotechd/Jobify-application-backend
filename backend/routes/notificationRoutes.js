import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getNotifications, getUnreadNotificationCount,
  markNotificationRead, markAllNotificationsRead,
} from "../controllers/notificationController.js";

const router = express.Router();
router.use(protect);
router.get("/", getNotifications);
router.get("/unread-count", getUnreadNotificationCount);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
export default router;
