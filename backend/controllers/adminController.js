import mongoose from "mongoose";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import Application from "../models/Application.js";
import Payment from "../models/Payment.js";
import ContentReport from "../models/ContentReport.js";
import { createNotification } from "../utils/createNotification.js";

const idIsValid = (id) => mongoose.Types.ObjectId.isValid(id);

export const getAdminDashboard = async (req, res) => {
  try {
    const [totalUsers, totalRecruiters, totalJobseekers, totalJobs, activeJobs, totalApplications, totalCompanies, activeUsers, openReports, revenueAgg, paidTransactions] = await Promise.all([
      User.countDocuments(), User.countDocuments({ role: "recruiter" }), User.countDocuments({ role: "jobseeker" }),
      Job.countDocuments(), Job.countDocuments({ status: "active" }), Application.countDocuments(), Company.countDocuments(),
      User.countDocuments({ isActive: { $ne: false } }), ContentReport.countDocuments({ status: { $in: ["open", "reviewing"] } }),
      Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, revenue: { $sum: "$amount" } } }]),
      Payment.countDocuments({ status: "paid" }),
    ]);
    const revenue = revenueAgg[0]?.revenue || 0;
    res.json({ success: true, dashboard: { totalUsers, totalRecruiters, totalJobseekers, totalJobs, activeJobs, totalApplications, totalCompanies, activeUsers, openReports, revenue, paidTransactions } });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ success: false, message: "Unable to load admin dashboard." });
  }
};

export const getAdminUsers = async (req, res) => {
  const users = await User.find().select("-password -otp -resetPasswordToken -resetPasswordExpires").sort({ createdAt: -1 });
  res.json({ success: true, users });
};

export const getAdminRecruiters = async (req, res) => {
  const recruiters = await User.find({ role: "recruiter" }).select("-password -otp -resetPasswordToken -resetPasswordExpires").sort({ createdAt: -1 });
  res.json({ success: true, recruiters });
};

export const getAdminJobs = async (req, res) => {
  const jobs = await Job.find().populate("recruiter", "name email").populate("company", "name industry location").sort({ createdAt: -1 });
  res.json({ success: true, jobs });
};

export const getAdminApplications = async (req, res) => {
  const applications = await Application.find()
    .populate("candidate", "name email phone")
    .populate("job", "title location")
    .populate("recruiter", "name email")
    .sort({ createdAt: -1 });
  res.json({ success: true, applications });
};

export const getAdminCompanies = async (req, res) => {
  const companies = await Company.find().populate("recruiter", "name email").sort({ createdAt: -1 });
  res.json({ success: true, companies });
};

export const updateAdminUser = async (req, res) => {
  if (!idIsValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid user ID." });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  if (req.body.isActive !== undefined) user.isActive = Boolean(req.body.isActive);
  if (req.body.isVerified !== undefined) user.isVerified = Boolean(req.body.isVerified);
  await user.save();
  await createNotification({ recipient: user._id, type: "system", title: "Account updated by Jobify admin", message: `Your account status is ${user.isActive === false ? "inactive" : "active"}${user.isVerified ? " and verified" : ""}.`, link: user.role === "recruiter" ? "Recruiter" : "Candidate" });
  res.json({ success: true, message: "User updated successfully.", user: user.toObject({ transform: (_doc, ret) => { delete ret.password; delete ret.otp; delete ret.resetPasswordToken; return ret; } }) });
};

export const deleteAdminJob = async (req, res) => {
  if (!idIsValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid job ID." });
  const job = await Job.findByIdAndDelete(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: "Job not found." });
  await Application.deleteMany({ job: job._id });
  res.json({ success: true, message: "Job deleted successfully." });
};

export const updateAdminJob = async (req, res) => {
  if (!idIsValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid job ID." });
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: "Job not found." });
  if (req.body.status && ["draft", "active", "closed"].includes(req.body.status)) job.status = req.body.status;
  await job.save();
  if (job.recruiter) await createNotification({ recipient: job.recruiter, type: "job", title: "Job listing updated", message: `Your job "${job.title}" is now ${job.status}.`, link: "Recruiter" });
  res.json({ success: true, message: "Job updated successfully.", job });
};

export const updateAdminApplication = async (req, res) => {
  if (!idIsValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid application ID." });
  const application = await Application.findById(req.params.id);
  if (!application) return res.status(404).json({ success: false, message: "Application not found." });
  if (req.body.status && ["pending", "reviewing", "shortlisted", "interview", "accepted", "rejected"].includes(req.body.status)) application.status = req.body.status;
  await application.save();
  if (application.candidate) await createNotification({ recipient: application.candidate, type: "application", title: "Application status updated", message: `Your application status is now ${application.status}.`, link: "Applications" });
  res.json({ success: true, message: "Application updated successfully.", application });
};

export const updateAdminCompany = async (req, res) => {
  if (!idIsValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid company ID." });
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ success: false, message: "Company not found." });
  if (req.body.isVerified !== undefined) company.isVerified = Boolean(req.body.isVerified);
  if (req.body.isActive !== undefined) company.isActive = Boolean(req.body.isActive);
  await company.save();
  if (company.recruiter) await createNotification({ recipient: company.recruiter, type: "system", title: "Company profile updated", message: `Your company "${company.name}" was updated by a Jobify administrator.`, link: "CompanyManager" });
  res.json({ success: true, message: "Company updated successfully.", company });
};
