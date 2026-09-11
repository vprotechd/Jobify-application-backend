import express from "express";
import {
  getMyProfile,
  updateMyProfile,
} from "../controllers/profileController.js";

import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/me", protect, getMyProfile);

router.put(
  "/me",
  protect,
  upload.fields([
    {
      name: "profileImage",
      maxCount: 1,
    },
    {
      name: "resume",
      maxCount: 1,
    },
  ]),
  updateMyProfile
);

export default router;