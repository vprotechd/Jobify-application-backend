import fs from "fs";
import path from "path";
import crypto from "crypto";
import User from "../models/User.js";
import { uploadFileToCloudinary, deleteCloudinaryAsset, signedCloudinaryUrl, isCloudinaryConfigured } from "../utils/cloudinary.js";

/*
|--------------------------------------------------------------------------
| PUBLIC FILE URL
|--------------------------------------------------------------------------
*/

const publicFileUrl = (req, filename) => {
  if (!filename) return "";

  // Already a complete URL
  if (
    typeof filename === "string" &&
    /^https?:\/\//i.test(filename)
  ) {
    return filename;
  }

  const cleanFilename = String(filename)
    .replace(/^\/+/, "")
    .replace(/^uploads[\\/]/i, "");

  const isResume = /\.(pdf|doc|docx)$/i.test(cleanFilename);
  const route = isResume ? "resume" : "image";
  return `${req.protocol}://${req.get("host")}/api/files/${route}/${encodeURIComponent(cleanFilename)}`;
};

/*
|--------------------------------------------------------------------------
| RESUME ACCESS
|--------------------------------------------------------------------------
| Resumes are private. The profile API never hands out the raw storage
| (Cloudinary) URL; it returns the authenticated Jobify route instead:
|   GET /api/files/resume/:key   (owner, admin, or recruiter with CV access)
| where :key is the unique file name (local file, or last segment of the
| stored Cloudinary URL).
|--------------------------------------------------------------------------
*/

export const resumeKey = (stored) => {
  const value = String(stored || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    try {
      const last = new URL(value).pathname.split("/").filter(Boolean).pop() || "";
      return decodeURIComponent(last);
    } catch {
      return "";
    }
  }
  return path.basename(value.replace(/^\/+/, "").replace(/^uploads[\\/]/i, ""));
};

const resumeAccessUrl = (req, stored) => {
  const key = resumeKey(stored);
  if (!key) return "";
  return `${req.protocol}://${req.get("host")}/api/files/resume/${encodeURIComponent(key)}`;
};

// "KRITIKA-BHARTI-1788159984691-b3775e7378.pdf" -> "KRITIKA-BHARTI.pdf"
const resumeDisplayName = (stored) => {
  const key = resumeKey(stored);
  if (!key) return "";
  const ext = path.extname(key);
  const base = path.basename(key, ext).replace(/-\d{13}-[a-f0-9]{10}$/i, "").replace(/-[a-f0-9]{10}$/i, "");
  return `${base || "resume"}${ext}`;
};

/*
|--------------------------------------------------------------------------
| PROFILE FIELDS
|--------------------------------------------------------------------------
*/

const profileFields = [
  "_id",
  "name",
  "email",
  "role",
  "profileImage",
  "phone",
  "location",
  "headline",
  "bio",
  "skills",
  "education",
  "experience",
  "linkedin",
  "portfolio",
  "website",
  "company",
  "designation",
  "resume",
  "isVerified",
  "isActive",
  "createdAt",
  "updatedAt",
];

/*
|--------------------------------------------------------------------------
| SANITIZE USER
|--------------------------------------------------------------------------
*/

const sanitizeUser = (user, req) => {
  const data = {};

  for (const field of profileFields) {
    data[field] = user[field];
  }

  if (data.profileImage) {
    data.profileImage = publicFileUrl(
      req,
      data.profileImage
    );
  }

  if (data.resume) {
    data.resumeName = resumeDisplayName(data.resume);
    data.resume = resumeAccessUrl(req, data.resume);
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| DELETE OLD UPLOAD SAFELY
|--------------------------------------------------------------------------
*/

const deleteOldFile = (filename) => {
  try {
    if (!filename) return;

    // Never try to delete external URLs
    if (/^https?:\/\//i.test(filename)) {
      return;
    }

    const cleanFilename = String(filename)
      .replace(/^\/+/, "")
      .replace(/^uploads[\\/]/i, "");

    const filePath = path.join(
      process.cwd(),
      "uploads",
      cleanFilename
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(
      "Unable to delete old uploaded file:",
      error.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET MY PROFILE
|--------------------------------------------------------------------------
| GET /api/profile/me
|--------------------------------------------------------------------------
*/

export const getMyProfile = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await User.findById(
      req.user._id
    ).select(profileFields.join(" "));

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      profile: sanitizeUser(user, req),
    });
  } catch (error) {
    console.error(
      "Get profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load profile.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE MY PROFILE
|--------------------------------------------------------------------------
| PUT /api/profile/me   (JSON, or multipart/form-data when files are sent)
|
| Supports: name, phone, location, headline, bio, skills, education,
| experience, linkedin, portfolio, profileImage (file), resume (file).
|
| Only fields that are present in the request are changed, so existing data
| is preserved. Text fields are saved first; file uploads are processed
| afterwards, so a storage (Cloudinary) problem can never discard the rest of
| the profile. If an upload fails the response is HTTP 502 with a clear
| message and the profile that WAS saved.
|--------------------------------------------------------------------------
*/

const MAX_SKILLS = 50;

const parseSkills = (skills) => {
  const list = Array.isArray(skills) ? skills : String(skills).split(",");
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const value = String(item ?? "").trim().slice(0, 60);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
};

const removeTempFile = (file) => {
  try {
    if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
  } catch {
    /* best effort */
  }
};

const safeResumePublicId = (originalName) => {
  const ext = path.extname(originalName || "").toLowerCase();
  const base =
    path
      .basename(originalName || "resume", ext)
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 60) || "resume";
  // The extension is part of the public id so Cloudinary serves the right type.
  return `jobify/resumes/${base}-${crypto.randomBytes(5).toString("hex")}${ext}`;
};

// Stores one uploaded file and returns { value, publicId, local }.
// Cloudinary is tried first. If it is unavailable or refuses the upload (for
// example HTTP 403 from wrong/disabled credentials) the file is kept on the
// server instead, so the profile picture / resume is still saved.
const storeUpload = async (file, kind) => {
  if (!isCloudinaryConfigured()) {
    return { value: file.filename, publicId: "", local: true };
  }
  try {
    const uploaded =
      kind === "resume"
        ? await uploadFileToCloudinary(file, {
            resourceType: "raw",
            type: "upload",
            publicId: safeResumePublicId(file.originalname),
            removeLocalFile: false,
          })
        : await uploadFileToCloudinary(file, {
            folder: "jobify/profile-images",
            resourceType: "image",
            removeLocalFile: false,
          });
    return { value: uploaded.secure_url, publicId: uploaded.public_id, local: false };
  } catch (error) {
    console.error(
      `Cloudinary ${kind} upload failed (${error?.http_code || "no status"}): ${error.message}. Saving the file on the server instead.`
    );
    if (!file?.path || !fs.existsSync(file.path)) throw error;
    return { value: file.filename, publicId: "", local: true };
  }
};

export const updateMyProfile = async (req, res) => {
  const imageFile = req.files?.profileImage?.[0];
  const resumeFile = req.files?.resume?.[0];
  const keepLocal = new Set(); // local files that became the stored copy

  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    // Only jobseekers can update candidate profiles
    if (user.role !== "jobseeker") {
      return res.status(403).json({
        success: false,
        message: "Only jobseekers can update candidate profiles.",
      });
    }

    const body = req.body || {};

    if (body.name !== undefined) {
      const cleanedName = String(body.name).trim();
      if (!cleanedName) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty.",
        });
      }
      user.name = cleanedName;
    }

    for (const field of [
      "phone",
      "location",
      "headline",
      "bio",
      "education",
      "experience",
      "linkedin",
      "portfolio",
    ]) {
      if (body[field] !== undefined) user[field] = String(body[field]).trim();
    }

    // skills: ["React", "Node"]  OR  "React, Node"
    if (body.skills !== undefined) user.skills = parseSkills(body.skills);

    // 1) Save all text fields first.
    await user.save();

    // 2) Then process uploads, one at a time, collecting failures.
    const failures = [];
    const staleAssets = [];
    let filesChanged = false;

    if (imageFile) {
      try {
        const stored = await storeUpload(imageFile, "image");
        staleAssets.push({
          kind: "image",
          previous: user.profileImage,
          previousPublicId: user.profileImagePublicId,
          replacedByCloud: !stored.local,
        });
        user.profileImage = stored.value;
        user.profileImagePublicId = stored.publicId;
        if (stored.local) keepLocal.add(imageFile.path);
        filesChanged = true;
      } catch (error) {
        console.error("Profile image upload error:", error.message);
        failures.push(`the profile picture could not be uploaded (${error.message})`);
      }
    }

    if (resumeFile) {
      try {
        const stored = await storeUpload(resumeFile, "resume");
        staleAssets.push({
          kind: "resume",
          previous: user.resume,
          previousPublicId: user.resumePublicId,
          replacedByCloud: !stored.local,
        });
        user.resume = stored.value;
        user.resumePublicId = stored.publicId;
        if (stored.local) keepLocal.add(resumeFile.path);
        filesChanged = true;
      } catch (error) {
        console.error("Resume upload error:", error.message);
        failures.push(`the resume could not be uploaded (${error.message})`);
      }
    }

    if (filesChanged) {
      await user.save();

      // Remove replaced files only after the new reference is safely stored.
      for (const old of staleAssets) {
        if (!old.previous) continue;
        if (old.previousPublicId) {
          await deleteCloudinaryAsset(
            old.previousPublicId,
            old.kind === "resume" ? "raw" : "image",
            "upload"
          );
        } else {
          deleteOldFile(old.previous);
        }
      }
    }

    if (failures.length) {
      return res.status(502).json({
        success: false,
        partial: true,
        message: `Your profile details were saved, but ${failures.join(" and ")}. Please try again.`,
        profile: sanitizeUser(user, req),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      profile: sanitizeUser(user, req),
    });
  } catch (error) {
    console.error("Update profile error:", error);

    if (error?.name === "ValidationError") {
      const message =
        Object.values(error.errors || {})
          .map((item) => item.message)
          .join(" ") || "Some profile fields are invalid.";
      return res.status(400).json({ success: false, message });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update profile.",
    });
  } finally {
    // Never leave temporary upload files behind unless they are the stored copy.
    for (const file of [imageFile, resumeFile]) {
      if (file && !keepLocal.has(file.path)) removeTempFile(file);
    }
  }
};

/*
|--------------------------------------------------------------------------
| RECRUITER PROFILE
|--------------------------------------------------------------------------
| GET  /api/recruiter/profile
| PUT  /api/recruiter/profile
|--------------------------------------------------------------------------
*/

export const getRecruiterProfile = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    if (req.user.role !== "recruiter") {
      return res.status(403).json({ success: false, message: "Recruiter access required." });
    }

    const user = await User.findById(req.user._id).select(profileFields.join(" "));
    if (!user) {
      return res.status(404).json({ success: false, message: "Recruiter profile not found." });
    }

    return res.status(200).json({
      success: true,
      profile: sanitizeUser(user, req),
    });
  } catch (error) {
    console.error("Get recruiter profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load recruiter profile.",
    });
  }
};

export const updateRecruiterProfile = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Recruiter profile not found." });
    }

    if (user.role !== "recruiter") {
      return res.status(403).json({ success: false, message: "Only recruiters can update recruiter profiles." });
    }

    const fields = [
      "name",
      "phone",
      "location",
      "headline",
      "bio",
      "company",
      "designation",
      "linkedin",
      "website",
      "portfolio",
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        const value = String(req.body[field]).trim();
        if (field === "name" && !value) {
          return res.status(400).json({ success: false, message: "Name cannot be empty." });
        }
        user[field] = value;
      }
    }

    const profileImage = req.files?.profileImage?.[0];
    if (profileImage) {
      const oldImage = user.profileImage;
      const oldPublicId = user.profileImagePublicId;
      if (isCloudinaryConfigured()) {
        const uploaded = await uploadFileToCloudinary(profileImage, { folder: "jobify/recruiter-profiles", resourceType: "image" });
        user.profileImage = uploaded.secure_url;
        user.profileImagePublicId = uploaded.public_id;
        if (oldPublicId) await deleteCloudinaryAsset(oldPublicId, "image", "upload");
        else if (oldImage) deleteOldFile(oldImage);
      } else {
        user.profileImage = profileImage.filename;
        user.profileImagePublicId = "";
        if (oldImage) deleteOldFile(oldImage);
      }
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Recruiter profile updated successfully.",
      profile: sanitizeUser(user, req),
    });
  } catch (error) {
    console.error("Update recruiter profile error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update recruiter profile.",
    });
  }
};
