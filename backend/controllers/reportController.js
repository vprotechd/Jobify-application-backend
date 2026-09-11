import mongoose from "mongoose";
import ContentReport from "../models/ContentReport.js";

export const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, description = "" } = req.body || {};
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) return res.status(400).json({ success: false, message: "Invalid content ID." });
    if (!["job", "company", "user", "application"].includes(targetType)) return res.status(400).json({ success: false, message: "Invalid report target." });
    if (!reason?.trim()) return res.status(400).json({ success: false, message: "Report reason is required." });
    const report = await ContentReport.create({ reporter: req.user._id, targetType, targetId, reason: reason.trim(), description: String(description).trim() });
    return res.status(201).json({ success: true, message: "Report submitted successfully.", report });
  } catch (error) {
    console.error("Create report error:", error);
    return res.status(500).json({ success: false, message: "Unable to submit report." });
  }
};
