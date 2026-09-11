import mongoose from "mongoose";
import User from "../models/User.js";
import Job from "../models/Job.js";

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getFavoriteJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("favoriteJobs")
      .populate({
        path: "favoriteJobs",
        populate: { path: "company", select: "name logo location industry" },
      })
      .lean();

    if (!user) return res.status(404).json({ success: false, message: "Candidate not found." });

    const favorites = (user.favoriteJobs || []).filter(Boolean);
    return res.json({ success: true, count: favorites.length, favorites });
  } catch (error) {
    console.error("Get favorite jobs error:", error);
    return res.status(500).json({ success: false, message: "Unable to load saved jobs." });
  }
};

export const addFavoriteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!validId(jobId)) return res.status(400).json({ success: false, message: "Invalid job ID." });

    const job = await Job.findOne({ _id: jobId, status: "active" });
    if (!job) return res.status(404).json({ success: false, message: "Job not found or no longer active." });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "Candidate not found." });

    if (!user.favoriteJobs.some((id) => id.toString() === jobId)) user.favoriteJobs.push(job._id);
    await user.save();
    return res.json({ success: true, message: "Job saved.", saved: true });
  } catch (error) {
    console.error("Add favorite job error:", error);
    return res.status(500).json({ success: false, message: "Unable to save job." });
  }
};

export const removeFavoriteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!validId(jobId)) return res.status(400).json({ success: false, message: "Invalid job ID." });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "Candidate not found." });

    user.favoriteJobs = user.favoriteJobs.filter((id) => id.toString() !== jobId);
    await user.save();
    return res.json({ success: true, message: "Job removed from saved jobs.", saved: false });
  } catch (error) {
    console.error("Remove favorite job error:", error);
    return res.status(500).json({ success: false, message: "Unable to remove saved job." });
  }
};
