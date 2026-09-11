import express from "express";
import {
  getRecruiterProfile,
  updateRecruiterProfile,
} from "../controllers/profileController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.use(protect, authorize("recruiter"));

router.get("/profile", getRecruiterProfile);

router.put(
  "/profile",
  upload.fields([{ name: "profileImage", maxCount: 1 }]),
  updateRecruiterProfile
);

export default router;
