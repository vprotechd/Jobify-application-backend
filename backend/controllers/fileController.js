import fs from "fs";
import axios from "axios";
import path from "path";
import User from "../models/User.js";
import CvAccess from "../models/CvAccess.js";
import { fetchCloudinaryResume } from "../utils/resumeDelivery.js";

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

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const CONTENT_TYPES = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// "KRITIKA-BHARTI-1788159984691-b3775e7378.pdf" -> "KRITIKA-BHARTI.pdf"
const downloadName = (key) => {
  const ext = path.extname(key);
  const base = path.basename(key, ext).replace(/-\d{13}-[a-f0-9]{10}$/i, "").replace(/-[a-f0-9]{10}$/i, "");
  return `${base || "resume"}${ext}`;
};

export const servePrivateResume = async (req, res) => {
  try {
    const filename = clean(req.params.filename);
    if (!filename) return res.status(404).json({ success: false, message: "Resume not found." });

    // Local files are stored by name; Cloudinary resumes are stored as a URL
    // whose last path segment is the unique file name.
    let candidate = await User.findOne({ resume: filename, role: "jobseeker" }).select("_id resume resumePublicId").lean();
    if (!candidate) {
      candidate = await User.findOne({ resume: { $regex: `/${escapeRegex(filename)}$` }, role: "jobseeker" })
        .select("_id resume resumePublicId")
        .lean();
    }
    if (!candidate) return res.status(404).json({ success: false, message: "Resume not found." });

    const requester = req.user;
    const isOwner = requester?.role === "jobseeker" && String(requester._id) === String(candidate._id);
    const isAdmin = requester?.role === "admin";
    const unlocked = requester?.role === "recruiter" ? await CvAccess.exists({ recruiter: requester._id, candidate: candidate._id }) : false;
    if (!isOwner && !isAdmin && !unlocked) return res.status(403).json({ success: false, message: "You are not authorized to access this resume." });

    const ext = path.extname(filename).toLowerCase();
    const attachment = `attachment; filename="${downloadName(filename)}"`;

    if (/^https?:\/\//i.test(String(candidate.resume))) {
      const parsed = new URL(String(candidate.resume));
      if (!/(^|\.)res\.cloudinary\.com$/i.test(parsed.hostname)) return res.status(400).json({ success: false, message: "Invalid resume storage URL." });
      let remote;
      try {
        remote = await fetchCloudinaryResume(String(candidate.resume), candidate.resumePublicId);
      } catch (error) {
        console.error("Resume storage fetch failed:", error.message);
        return res.status(502).json({ success: false, message: error.message });
      }
      res.setHeader("Content-Type", CONTENT_TYPES[ext] || remote.headers["content-type"] || "application/octet-stream");
      res.setHeader("Content-Disposition", attachment);
      return remote.data.pipe(res);
    }

    const full = filePath(filename);
    if (!fs.existsSync(full)) return res.status(404).json({ success: false, message: "Resume file is no longer available. Please upload it again." });
    res.setHeader("Content-Disposition", attachment);
    return res.sendFile(full);
  } catch (error) {
    console.error("Private resume access error:", error);
    return res.status(500).json({ success: false, message: "Unable to access resume." });
  }
};
