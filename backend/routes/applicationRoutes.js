import express from "express";

import {
  applyForJob,
  getRecruiterApplications,
  getApplicationById,
  updateApplicationStatus,
  getCandidateApplications,
  downloadCandidateResume,
} from "../controllers/applicationController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// =====================================================
// CANDIDATE
// =====================================================

// Apply for a job
router.post(
  "/jobs/:jobId/apply",
  protect,
  applyForJob
);

// Candidate's applications
router.get(
  "/candidate/applications",
  protect,
  getCandidateApplications
);

// =====================================================
// RECRUITER
// =====================================================

// All applications received by recruiter
router.get(
  "/recruiter/applications",
  protect,
  getRecruiterApplications
);

// Single application
router.get(
  "/recruiter/applications/:id",
  protect,
  getApplicationById
);

// Update application status
router.patch(
  "/recruiter/applications/:id/status",
  protect,
  updateApplicationStatus
);

// Download a candidate resume with the recruiter free-download/credit rules.
router.get(
  "/recruiter/applications/:id/resume/download",
  protect,
  downloadCandidateResume
);

export default router;