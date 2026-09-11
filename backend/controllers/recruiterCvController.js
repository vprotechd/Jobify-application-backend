import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import User from "../models/User.js";
import CvAccess from "../models/CvAccess.js";
import { getCvAccessState, unlockCandidate, getGlobalSettings } from "../services/cvAccessService.js";

const safeCandidate = (candidate, req) => ({
  _id: candidate._id,
  name: candidate.name,
  headline: candidate.headline || "",
  location: candidate.location || "",
  skills: Array.isArray(candidate.skills) ? candidate.skills : [],
  experience: candidate.experience || "",
  education: candidate.education || "",
  profileImage: candidate.profileImage ? (/^https?:\/\//i.test(candidate.profileImage) ? candidate.profileImage : `${req.protocol}://${req.get("host")}/api/files/image/${encodeURIComponent(String(candidate.profileImage).replace(/^\/+/, "").replace(/^uploads[\\/]/i, ""))}`) : "",
  isVerified: Boolean(candidate.isVerified),
});

export const searchCandidates = async (req, res) => {
  try {
    const settings = await getGlobalSettings();
    if (settings.allowCandidateSearch === false || settings.features?.cvSearch === false) return res.status(403).json({ success: false, message: "Candidate search is currently disabled by the administrator." });
    const q = String(req.query.q || "").trim();
    const location = String(req.query.location || "").trim();
    const skill = String(req.query.skill || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 50);
    const filter = { role: "jobseeker", isActive: { $ne: false } };
    const terms = [];
    if (q) terms.push({ $or: [
      { name: { $regex: q, $options: "i" } },
      { headline: { $regex: q, $options: "i" } },
      { skills: { $regex: q, $options: "i" } },
    ] });
    if (location) filter.location = { $regex: location, $options: "i" };
    if (skill) filter.skills = { $regex: skill, $options: "i" };
    if (terms.length) filter.$and = terms;

    const candidates = await User.find(filter)
      .select("_id name headline location skills experience education profileImage isVerified")
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    const recruiterId = req.user._id;
    const accessRows = await CvAccess.find({ recruiter: recruiterId, candidate: { $in: candidates.map(c => c._id) } }).select("candidate source viewedAt downloadedAt").lean();
    const accessMap = new Map(accessRows.map(row => [String(row.candidate), row]));

    return res.json({
      success: true,
      candidates: candidates.map((candidate) => {
        const access = accessMap.get(String(candidate._id));
        return { ...safeCandidate(candidate, req), cvUnlocked: Boolean(access), accessSource: access?.source || null, cvViewed: Boolean(access?.viewedAt), cvDownloaded: Boolean(access?.downloadedAt) };
      }),
      cvAccess: await getCvAccessState(recruiterId),
    });
  } catch (error) {
    console.error("Candidate search error:", error);
    return res.status(500).json({ success: false, message: "Unable to search candidates." });
  }
};

export const getCandidatePreview = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid candidate ID." });
    const candidate = await User.findOne({ _id: id, role: "jobseeker", isActive: { $ne: false } }).select("_id name headline location skills experience education profileImage isVerified").lean();
    if (!candidate) return res.status(404).json({ success: false, message: "Candidate not found." });
    const access = await CvAccess.findOne({ recruiter: req.user._id, candidate: id }).lean();
    if (!access) return res.json({ success: true, unlocked: false, candidate: safeCandidate(candidate, req), cvAccess: await getCvAccessState(req.user._id) });
    const full = await User.findById(id).select("_id name email phone headline location skills education experience linkedin portfolio profileImage resume isVerified").lean();
    return res.json({ success: true, unlocked: true, candidate: full, access, cvAccess: await getCvAccessState(req.user._id) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load candidate." });
  }
};

export const unlockCandidateCv = async (req, res) => {
  try {
    const settings = await getGlobalSettings();
    if (settings.features?.cvDownload === false) return res.status(403).json({ success: false, message: "CV access is currently disabled by the administrator." });
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid candidate ID." });
    const candidate = await User.findOne({ _id: id, role: "jobseeker", isActive: { $ne: false } }).select("_id name email phone headline location skills education experience linkedin portfolio profileImage resume isVerified").lean();
    if (!candidate) return res.status(404).json({ success: false, message: "Candidate not found." });
    if (!candidate.resume) return res.status(404).json({ success: false, message: "This candidate has not uploaded a resume." });
    const result = await unlockCandidate({ recruiterId: req.user._id, candidateId: candidate._id });
    const access = result.access.toObject ? result.access.toObject() : result.access;
    return res.json({ success: true, charged: result.charged, source: result.source, candidate, access, cvAccess: await getCvAccessState(req.user._id) });
  } catch (error) {
    console.error("Unlock candidate CV error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Unable to unlock candidate CV." });
  }
};

export const downloadCandidateCv = async (req, res) => {
  try {
    const settings = await getGlobalSettings();
    if (settings.features?.cvDownload === false) return res.status(403).json({ success: false, message: "CV downloads are currently disabled by the administrator." });
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid candidate ID." });
    const candidate = await User.findOne({ _id: id, role: "jobseeker", isActive: { $ne: false } }).select("_id name resume").lean();
    if (!candidate) return res.status(404).json({ success: false, message: "Candidate not found." });
    if (!candidate.resume) return res.status(404).json({ success: false, message: "This candidate has not uploaded a resume." });
    const result = await unlockCandidate({ recruiterId: req.user._id, candidateId: candidate._id });
    const access = result.access;
    access.downloadedAt = access.downloadedAt || new Date();
    await access.save();
    let filename = String(candidate.resume).trim();
    if (/^https?:\/\//i.test(filename)) {
      const parsed = new URL(filename);
      if (parsed.origin !== `${req.protocol}://${req.get("host")}`) return res.status(400).json({ success: false, message: "External resume URLs cannot be downloaded through Jobify." });
      filename = parsed.pathname;
    }
    filename = path.basename(filename.replace(/^\/+/, "").replace(/^uploads[\\/]/i, ""));
    const filePath = path.join(process.cwd(), "uploads", filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: "Resume file is no longer available." });
    const safeName = String(candidate.name || "candidate").replace(/[^a-zA-Z0-9_-]+/g, "-") || "candidate";
    return res.download(filePath, `${safeName}-resume${path.extname(filename) || ".pdf"}`);
  } catch (error) {
    console.error("Download candidate CV error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Unable to download candidate CV." });
  }
};

export const contactCandidate = async (req, res) => {
  try {
    const settings = await getGlobalSettings();
    if (settings.allowCandidateContact === false || settings.features?.recruiterContact === false) return res.status(403).json({ success: false, message: "Candidate contact is currently disabled by the administrator." });
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid candidate ID." });
    const access = await CvAccess.findOne({ recruiter: req.user._id, candidate: id });
    if (!access) return res.status(403).json({ success: false, message: "Unlock this candidate CV before contacting the candidate." });
    const candidate = await User.findOne({ _id: id, role: "jobseeker" }).select("name email phone").lean();
    if (!candidate) return res.status(404).json({ success: false, message: "Candidate not found." });
    if (!access.contactedAt) { access.contactedAt = new Date(); await access.save(); }
    return res.json({ success: true, candidate });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to contact candidate." });
  }
};

export const getRecruiterCvAccess = async (req, res) => {
  try { return res.json({ success: true, cvAccess: await getCvAccessState(req.user._id) }); }
  catch (error) { return res.status(500).json({ success: false, message: "Unable to load CV credit balance." }); }
};
