import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { searchCandidates, getCandidatePreview, unlockCandidateCv, downloadCandidateCv, contactCandidate, getRecruiterCvAccess } from "../controllers/recruiterCvController.js";

const router = express.Router();
router.use(protect, authorize("recruiter"));
router.get("/candidates", searchCandidates);
router.get("/candidates/access", getRecruiterCvAccess);
router.get("/candidates/:id", getCandidatePreview);
router.post("/candidates/:id/unlock", unlockCandidateCv);
router.get("/candidates/:id/resume", downloadCandidateCv);
router.post("/candidates/:id/contact", contactCandidate);
export default router;
