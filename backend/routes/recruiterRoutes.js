import express from "express";
import upload from "../middleware/upload.js";

import {
  getRecruiterDashboard,
  getRecruiterProfile,
  updateRecruiterProfile,
} from "../controllers/recruiterController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// =====================================================
// RECRUITER PROFILE
// =====================================================

router.get(
  "/profile",
  protect,
  authorize("recruiter"),
  getRecruiterProfile
);

router.put(
  "/profile",
  protect,
  authorize("recruiter"),
  upload.fields([
    { name: "profileImage", maxCount: 1 },
  ]),
  updateRecruiterProfile
);

/**
 * =========================================================
 * RECRUITER DASHBOARD
 * =========================================================
 *
 * GET /api/recruiter/dashboard
 */
router.get(
  "/dashboard",
  protect,
  authorize("recruiter"),
  getRecruiterDashboard
);

export default router;