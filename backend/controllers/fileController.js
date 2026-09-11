import fs from "fs";
import path from "path";
import User from "../models/User.js";
import CvAccess from "../models/CvAccess.js";

const clean = (filename) => path.basename(String(filename || "").replace(/^\/+/, "").replace(/^uploads[\\/]/i, ""));
const filePath = (filename) => path.join(process.cwd(), "uploads", clean(filename));

export const servePublicImage = async (req, res) => {
  try {
    const filename = clean(req.params.filename);
    if (!/\.(jpe?g|png|webp)$/i.test(filename)) return res.status(400).json({ success: false, message: "Invalid image file." });
    const full = filePath(filename);
    if (!fs.existsSync(full)) return res.status(404).json({ success: false, message: "Image not found." });
    return res.sendFile(full);
  } catch { return res.status(404).json({ success: false, message: "Image not found." }); }
};

export const servePrivateResume = async (req, res) => {
  try {
    const filename = clean(req.params.filename);
    const candidate = await User.findOne({ resume: filename, role: "jobseeker" }).select("_id resume").lean();
    if (!candidate) return res.status(404).json({ success: false, message: "Resume not found." });
    const requester = req.user;
    const isOwner = requester?.role === "jobseeker" && String(requester._id) === String(candidate._id);
    const isAdmin = requester?.role === "admin";
    const unlocked = requester?.role === "recruiter" ? await CvAccess.exists({ recruiter: requester._id, candidate: candidate._id }) : false;
    if (!isOwner && !isAdmin && !unlocked) return res.status(403).json({ success: false, message: "You are not authorized to access this resume." });
    const full = filePath(filename);
    if (!fs.existsSync(full)) return res.status(404).json({ success: false, message: "Resume file is no longer available." });
    return res.sendFile(full);
  } catch (error) {
    console.error("Private resume access error:", error);
    return res.status(500).json({ success: false, message: "Unable to access resume." });
  }
};
