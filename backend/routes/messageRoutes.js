import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { getMessages, listConversations, sendMessage, unreadMessageCount } from "../controllers/messageController.js";

const router = express.Router();
router.use(protect, authorize("jobseeker", "recruiter"));
router.get("/conversations", listConversations);
router.get("/unread-count", unreadMessageCount);
router.get("/applications/:applicationId", getMessages);
router.post("/applications/:applicationId", sendMessage);
// Backward-compatible mobile aliases.
router.get("/:applicationId", getMessages);
router.post("/:applicationId", sendMessage);
export default router;
