import express from "express";

import {
  createJob,
  getRecruiterJobs,
  getJobById,
  updateJob,
  closeJob,
  publishJob,
  deleteJob,
  getPublicJobs,
  getPublicJobById,
  getRecommendedJobs,
} from "../controllers/jobController.js";

import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public job discovery
router.get("/jobs", getPublicJobs);
// Must be declared before "/jobs/:id" so "recommended" is not treated as an id.
router.get("/jobs/recommended", protect, authorize("jobseeker"), getRecommendedJobs);
router.get("/jobs/:id", getPublicJobById);


// =====================================================
// RECRUITER JOBS
// =====================================================

router.post(
  "/recruiter/jobs",
  protect,
  createJob
);

router.get(
  "/recruiter/jobs",
  protect,
  getRecruiterJobs
);

router.get(
  "/recruiter/jobs/:id",
  protect,
  getJobById
);

router.put(
  "/recruiter/jobs/:id",
  protect,
  updateJob
);

router.patch(
  "/recruiter/jobs/:id/close",
  protect,
  closeJob
);

router.patch(
  "/recruiter/jobs/:id/publish",
  protect,
  publishJob
);

router.delete(
  "/recruiter/jobs/:id",
  protect,
  deleteJob
);

export default router;