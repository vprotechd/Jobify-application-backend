import mongoose from "mongoose";
import Company from "../models/Company.js";
import Job from "../models/Job.js";

export const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ isActive: true })
      .populate("recruiter", "name email")
      .sort({ name: 1 });
    res.json({ success: true, companies });
  } catch (error) {
    console.error("Get companies error:", error);
    res.status(500).json({ success: false, message: "Unable to load companies." });
  }
};

export const getCompanyById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid company ID." });
    }
    const company = await Company.findOne({ _id: req.params.id, isActive: true })
      .populate("recruiter", "name email");
    if (!company) return res.status(404).json({ success: false, message: "Company not found." });

    const jobs = await Job.find({ company: company._id, status: "active" })
      .populate("company")
      .sort({ createdAt: -1 });

    res.json({ success: true, company, jobs });
  } catch (error) {
    console.error("Get company error:", error);
    res.status(500).json({ success: false, message: "Unable to load company." });
  }
};

export const getRecruiterCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ recruiter: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, companies });
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

    company = await Company.create({
      recruiter: req.user._id,
      name: name.trim(), industry: String(industry).trim(), location: String(location).trim(),
      description: String(description).trim(), website: String(website).trim(), employeeCount: String(employeeCount).trim(),
    });
    res.status(201).json({ success: true, message: "Company created successfully.", company });
  } catch (error) {
    console.error("Create company error:", error);
    res.status(500).json({ success: false, message: "Unable to create company." });
  }
};
