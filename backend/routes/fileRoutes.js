import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { servePublicImage, servePrivateResume } from "../controllers/fileController.js";
const router = express.Router();
router.get("/image/:filename", servePublicImage);
router.get("/resume/:filename", protect, servePrivateResume);
export default router;
