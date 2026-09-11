import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { getRecruiterPackages, createRazorpayOrder, verifyRazorpayPayment, getRecruiterPayments } from "../controllers/paymentController.js";

const router = express.Router();
router.use(protect, authorize("recruiter"));
router.get("/packages", getRecruiterPackages);
router.post("/orders", createRazorpayOrder);
router.post("/verify", verifyRazorpayPayment);
router.get("/history", getRecruiterPayments);
export default router;
