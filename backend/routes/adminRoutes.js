import express from "express";
import {
  getAdminDashboard, getAdminUsers, getAdminRecruiters, getAdminJobs, getAdminApplications, getAdminCompanies,
  updateAdminUser, updateAdminJob, deleteAdminJob, updateAdminApplication, updateAdminCompany,
} from "../controllers/adminController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, adminOnly);
router.get("/dashboard", getAdminDashboard);
router.get("/users", getAdminUsers);
router.patch("/users/:id", updateAdminUser);
router.get("/recruiters", getAdminRecruiters);
router.get("/jobs", getAdminJobs);
router.patch("/jobs/:id", updateAdminJob);
router.delete("/jobs/:id", deleteAdminJob);
router.get("/applications", getAdminApplications);
router.patch("/applications/:id", updateAdminApplication);
router.get("/companies", getAdminCompanies);
router.patch("/companies/:id", updateAdminCompany);
export default router;
