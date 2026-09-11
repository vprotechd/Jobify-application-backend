import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  getSettings,
  updateSettings,
  listPackages,
  createPackage,
  updatePackage,
  deletePackage,
  listPayments,
  listReports,
  updateReport,
  getAnalytics,
  getCommission,
  getFeatureConfiguration,
} from "../controllers/adminAdvancedController.js";

const router = express.Router();
router.use(protect, adminOnly);
router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.get("/packages", listPackages);
router.post("/packages", createPackage);
router.patch("/packages/:id", updatePackage);
router.delete("/packages/:id", deletePackage);
router.get("/payments", listPayments);
router.get("/reports", listReports);
router.patch("/reports/:id", updateReport);
router.get("/analytics", getAnalytics);
router.get("/commission", getCommission);
router.get("/features", getFeatureConfiguration);

export default router;
