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
  if (!fs.existsSync(file)) {
    throw new Error(`Local upload file is missing: ${filename}`);
  }
  const uploaded = await uploadFileToCloudinary(
    {
      path: file,
      filename,
      originalname: filename,
      mimetype: resourceType === "image" ? "image/jpeg" : "application/pdf",
    },
    { folder, resourceType, removeLocalFile: false }
  );
  return { uploaded, file };
};

async function main() {
  if (!isCloudinaryConfigured()) throw new Error("Cloudinary environment variables are required.");
  await connectDB();
  const users = await User.find({}).select("_id role profileImage profileImagePublicId resume resumePublicId");
  for (const user of users) {
    let changed = false;
    const uploadedFiles = [];
    if (user.profileImage && !/^https?:\/\//i.test(user.profileImage)) {
      const result = await uploadIfLocal(user.profileImage, user.role === "recruiter" ? "jobify/recruiter-profiles" : "jobify/profile-images", "image");
      if (result) {
        user.profileImage = result.uploaded.secure_url;
        user.profileImagePublicId = result.uploaded.public_id;
        uploadedFiles.push(result.file);
        changed = true;
      }
    }
    if (user.resume && !/^https?:\/\//i.test(user.resume)) {
      const result = await uploadIfLocal(user.resume, "jobify/resumes", "raw");
      if (result) {
        user.resume = result.uploaded.secure_url;
        user.resumePublicId = result.uploaded.public_id;
        uploadedFiles.push(result.file);
        changed = true;
      }
    }
    if (changed) {
      await user.save();
      for (const file of uploadedFiles) fs.unlinkSync(file);
    }
  }
  const companies = await Company.find({}).select("_id logo logoPublicId");
  for (const company of companies) {
    if (company.logo && !/^https?:\/\//i.test(company.logo)) {
      const result = await uploadIfLocal(company.logo, "jobify/company-logos", "image");
      if (result) {
        company.logo = result.uploaded.secure_url;
        company.logoPublicId = result.uploaded.public_id;
        await company.save();
        fs.unlinkSync(result.file);
      }
    }
  }
  console.log("Cloudinary migration complete.");
  process.exit(0);
}
main().catch((error) => { console.error(error); process.exit(1); });
