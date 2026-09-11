import express from "express";
import { createEnquiry, listEnquiries, updateEnquiry } from "../controllers/contactController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
const router=express.Router();
router.post("/",createEnquiry);
router.get("/admin",protect,adminOnly,listEnquiries);
router.patch("/admin/:id",protect,adminOnly,updateEnquiry);
export default router;
