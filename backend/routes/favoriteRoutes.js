import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { getFavoriteJobs, addFavoriteJob, removeFavoriteJob } from "../controllers/favoriteController.js";

const router = express.Router();

router.use(protect, authorize("jobseeker"));
router.get("/", getFavoriteJobs);
router.post("/:jobId", addFavoriteJob);
router.delete("/:jobId", removeFavoriteJob);

export default router;
