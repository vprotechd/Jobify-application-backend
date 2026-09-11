import mongoose from "mongoose";
import Company from "../models/Company.js";
import Job from "../models/Job.js";
import { uploadFileToCloudinary, deleteCloudinaryAsset, isCloudinaryConfigured } from "../utils/cloudinary.js";
import { createNotification } from "../utils/createNotification.js";

const publicLogoUrl = (req, logo) => {
  if (!logo) return "";
  if (/^https?:\/\//i.test(String(logo))) return String(logo);
  const clean = String(logo).replace(/^\/+/, "").replace(/^uploads[\\\/]/i, "");
  return `${req.protocol}://${req.get("host")}/api/files/image/${encodeURIComponent(clean)}`;
};
const serializeCompany = (req, company) => {
  const data = company?.toObject ? company.toObject() : { ...company };
  data.logo = publicLogoUrl(req, data.logo);
  return data;
};

export const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ isActive: true }).populate("recruiter", "name email").sort({ name: 1 });
    res.json({ success: true, companies: companies.map((c) => serializeCompany(req, c)) });
  } catch (error) {
    console.error("Get companies error:", error);
    res.status(500).json({ success: false, message: "Unable to load companies." });
  }
};

export const getCompanyById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid company ID." });
    const company = await Company.findOne({ _id: req.params.id, isActive: true }).populate("recruiter", "name email");
    if (!company) return res.status(404).json({ success: false, message: "Company not found." });
    const jobs = await Job.find({ company: company._id, status: "active" }).populate("company").sort({ createdAt: -1 });
    res.json({ success: true, company: serializeCompany(req, company), jobs });
  } catch (error) {
    console.error("Get company error:", error);
    res.status(500).json({ success: false, message: "Unable to load company." });
  }
};

export const getRecruiterCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ recruiter: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, companies: companies.map((c) => serializeCompany(req, c)) });
  } catch (error) {
    console.error("Get recruiter companies error:", error);
    res.status(500).json({ success: false, message: "Unable to load your companies." });
  }
};

export const createCompany = async (req, res) => {
  try {
    const { name, industry = "", location = "", description = "", website = "", employeeCount = "" } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: "Company name is required." });
    let company = await Company.findOne({ recruiter: req.user._id, name: name.trim() });
    if (company) return res.json({ success: true, company, existing: true });

    const logo = req.files?.logo?.[0];
    let logoUrl = "", logoPublicId = "";
    if (logo && isCloudinaryConfigured()) {
      const uploaded = await uploadFileToCloudinary(logo, { folder: "jobify/company-logos", resourceType: "image" });
      logoUrl = uploaded.secure_url;
      logoPublicId = uploaded.public_id;
    } else if (logo) {
      logoUrl = logo.filename;
    }

    company = await Company.create({
      recruiter: req.user._id, name: name.trim(), industry: String(industry).trim(), location: String(location).trim(),
      description: String(description).trim(), website: String(website).trim(), employeeCount: String(employeeCount).trim(),
      logo: logoUrl, logoPublicId,
    });
    res.status(201).json({ success: true, message: "Company created successfully.", company: serializeCompany(req, company) });
  } catch (error) {
    console.error("Create company error:", error);
    res.status(500).json({ success: false, message: error.message || "Unable to create company." });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid company ID." });
    const company = await Company.findOne({ _id: id, recruiter: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: "Company not found." });
    const fields = ["name", "industry", "location", "description", "website", "employeeCount"];
    for (const field of fields) if (req.body[field] !== undefined) company[field] = String(req.body[field]).trim();
    if (!company.name) return res.status(400).json({ success: false, message: "Company name is required." });

    const logo = req.files?.logo?.[0];
    if (logo) {
      if (isCloudinaryConfigured()) {
        const uploaded = await uploadFileToCloudinary(logo, { folder: "jobify/company-logos", resourceType: "image" });
        if (company.logoPublicId) await deleteCloudinaryAsset(company.logoPublicId, "image", "upload");
        company.logo = uploaded.secure_url;
        company.logoPublicId = uploaded.public_id;
      } else {
        company.logo = logo.filename;
        company.logoPublicId = "";
      }
    }
    await company.save();
    await createNotification({ recipient: req.user._id, type: "system", title: "Company profile updated", message: `Your company "${company.name}" was updated successfully.`, link: "CompanyManager" });
    res.json({ success: true, message: "Company updated successfully.", company: serializeCompany(req, company) });
  } catch (error) {
    console.error("Update company error:", error);
    res.status(500).json({ success: false, message: error.message || "Unable to update company." });
  }
};

export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid company ID." });
    const company = await Company.findOne({ _id: id, recruiter: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: "Company not found." });
    const jobCount = await Job.countDocuments({ company: company._id });
    if (jobCount > 0) return res.status(409).json({ success: false, message: "This company is linked to existing jobs. Update the company instead of deleting it, or remove its jobs first." });
    if (company.logoPublicId) await deleteCloudinaryAsset(company.logoPublicId, "image", "upload");
    await company.deleteOne();
    await createNotification({ recipient: req.user._id, type: "system", title: "Company deleted", message: `Your company "${company.name}" was deleted.`, link: "CompanyManager" });
    res.json({ success: true, message: "Company deleted successfully." });
  } catch (error) {
    console.error("Delete company error:", error);
    res.status(500).json({ success: false, message: "Unable to delete company." });
  }
};
