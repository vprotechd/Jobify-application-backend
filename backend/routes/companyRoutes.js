import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { getCompanies, getCompanyById, getRecruiterCompanies, createCompany } from "../controllers/companyController.js";

const router = express.Router();

router.get("/", getCompanies);
router.get("/recruiter/mine", protect, authorize("recruiter"), getRecruiterCompanies);
router.get("/:id", getCompanyById);
router.post("/", protect, authorize("recruiter"), createCompany);

export default router;
