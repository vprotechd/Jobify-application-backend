import "dotenv/config";
import fs from "fs";
import path from "path";
import User from "../models/User.js";
import Company from "../models/Company.js";
import connectDB from "../config/db.js";
import { uploadFileToCloudinary, isCloudinaryConfigured } from "../utils/cloudinary.js";

const uploadIfLocal = async (value, folder, resourceType) => {
  if (!value || /^https?:\/\//i.test(String(value))) return null;
  const filename = path.basename(String(value).replace(/^\/+/, "").replace(/^uploads[\\/]/i, ""));
  const file = path.join(process.cwd(), "uploads", filename);
  if (!fs.existsSync(file)) return null;
  return uploadFileToCloudinary({ path: file, filename, originalname: filename, mimetype: resourceType === "image" ? "image/jpeg" : "application/pdf" }, { folder, resourceType });
};

async function main() {
  if (!isCloudinaryConfigured()) throw new Error("Cloudinary environment variables are required.");
  await connectDB();
  const users = await User.find({}).select("_id role profileImage profileImagePublicId resume resumePublicId");
  for (const user of users) {
    let changed = false;
    if (user.profileImage && !/^https?:\/\//i.test(user.profileImage)) {
      const uploaded = await uploadIfLocal(user.profileImage, user.role === "recruiter" ? "jobify/recruiter-profiles" : "jobify/profile-images", "image");
      if (uploaded) { user.profileImage = uploaded.secure_url; user.profileImagePublicId = uploaded.public_id; changed = true; }
    }
    if (user.resume && !/^https?:\/\//i.test(user.resume)) {
      const uploaded = await uploadIfLocal(user.resume, "jobify/resumes", "raw");
      if (uploaded) { user.resume = uploaded.secure_url; user.resumePublicId = uploaded.public_id; changed = true; }
    }
    if (changed) await user.save();
  }
  const companies = await Company.find({}).select("_id logo logoPublicId");
  for (const company of companies) {
    if (company.logo && !/^https?:\/\//i.test(company.logo)) {
      const uploaded = await uploadIfLocal(company.logo, "jobify/company-logos", "image");
      if (uploaded) { company.logo = uploaded.secure_url; company.logoPublicId = uploaded.public_id; await company.save(); }
    }
  }
  console.log("Cloudinary migration complete.");
  process.exit(0);
}
main().catch((error) => { console.error(error); process.exit(1); });
