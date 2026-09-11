import mongoose from "mongoose";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import Application from "../models/Application.js";
import CvPackage from "../models/CvPackage.js";
import Payment from "../models/Payment.js";
import ContentReport from "../models/ContentReport.js";
import PlatformSetting from "../models/PlatformSetting.js";

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getSettings = async (_req, res) => {
  try {
    let settings = await PlatformSetting.findOne({ key: "global" }).lean();
    if (!settings) settings = await PlatformSetting.create({ key: "global" });
    return res.json({ success: true, settings });
  } catch (error) {
    console.error("Admin settings error:", error);
    return res.status(500).json({ success: false, message: "Unable to load system settings." });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const update = {};
    const numeric = ["freeCvCreditsPerMonth", "creditCostPerCandidate", "commissionPercent"];
    for (const key of numeric) {
      if (body[key] !== undefined) update[key] = Number(body[key]);
    }
    for (const key of ["currency", "platformName", "contactEmail", "supportPhone"]) {
      if (body[key] !== undefined) update[key] = String(body[key]).trim();
    }
    for (const key of ["maintenanceMode", "allowCandidateContact", "allowCandidateSearch"]) {
      if (body[key] !== undefined) update[key] = Boolean(body[key]);
    }
    if (body.features && typeof body.features === "object") {
      for (const key of ["cvSearch", "cvDownload", "recruiterContact", "payments"]) {
        if (body.features[key] !== undefined) update[`features.${key}`] = Boolean(body.features[key]);
      }
    }
    if (update.freeCvCreditsPerMonth !== undefined && update.freeCvCreditsPerMonth < 0) {
      return res.status(400).json({ success: false, message: "Free CV credits cannot be negative." });
    }
    if (update.commissionPercent !== undefined && (update.commissionPercent < 0 || update.commissionPercent > 100)) {
      return res.status(400).json({ success: false, message: "Commission must be between 0 and 100." });
    }
    const settings = await PlatformSetting.findOneAndUpdate(
      { key: "global" },
      { $set: update, $setOnInsert: { key: "global" } },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    return res.json({ success: true, message: "Settings updated successfully.", settings });
  } catch (error) {
    console.error("Update settings error:", error);
    return res.status(400).json({ success: false, message: error.message || "Unable to update settings." });
  }
};

export const listPackages = async (_req, res) => {
  try {
    const packages = await CvPackage.find().sort({ sortOrder: 1, price: 1, createdAt: -1 }).lean();
    return res.json({ success: true, packages });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load CV packages." });
  }
};

export const createPackage = async (req, res) => {
  try {
    const { name, description = "", credits, price, currency = "INR", active = true, sortOrder = 0 } = req.body || {};
    if (!name?.trim() || Number(credits) <= 0 || Number(price) < 0) {
      return res.status(400).json({ success: false, message: "Name, positive credits and a valid price are required." });
    }
    const pkg = await CvPackage.create({ name: name.trim(), description: String(description).trim(), credits: Number(credits), price: Number(price), currency, active: Boolean(active), sortOrder: Number(sortOrder) || 0 });
    return res.status(201).json({ success: true, message: "CV package created successfully.", package: pkg });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Unable to create package." });
  }
};

export const updatePackage = async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid package ID." });
    const pkg = await CvPackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found." });
    const allowed = ["name", "description", "credits", "price", "currency", "active", "sortOrder"];
    for (const key of allowed) if (req.body[key] !== undefined) pkg[key] = ["credits", "price", "sortOrder"].includes(key) ? Number(req.body[key]) : req.body[key];
    if (!pkg.name?.trim() || pkg.credits <= 0 || pkg.price < 0) return res.status(400).json({ success: false, message: "Invalid package values." });
    await pkg.save();
    return res.json({ success: true, message: "CV package updated successfully.", package: pkg });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Unable to update package." });
  }
};

export const deletePackage = async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid package ID." });
    const pkg = await CvPackage.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found." });
    return res.json({ success: true, message: "CV package deleted successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to delete package." });
  }
};

export const listPayments = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const payments = await Payment.find()
      .populate("recruiter", "name email company")
      .populate("package", "name credits price")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ success: true, payments });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load payments." });
  }
};

export const listReports = async (_req, res) => {
  try {
    const reports = await ContentReport.find()
      .populate("reporter", "name email role")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, reports });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load reports." });
  }
};

export const updateReport = async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid report ID." });
    const report = await ContentReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found." });
    if (req.body.status && ["open", "reviewing", "resolved", "dismissed"].includes(req.body.status)) report.status = req.body.status;
    if (req.body.adminNotes !== undefined) report.adminNotes = String(req.body.adminNotes);
    if (["resolved", "dismissed"].includes(report.status)) { report.resolvedBy = req.user._id; report.resolvedAt = new Date(); }
    await report.save();
    return res.json({ success: true, message: "Report updated successfully.", report });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Unable to update report." });
  }
};

export const getAnalytics = async (_req, res) => {
  try {
    const [usersByRole, jobsByStatus, applicationsByStatus, revenueAgg, monthlyUsers, monthlyPayments] = await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, revenue: { $sum: "$amount" }, transactions: { $sum: 1 }, credits: { $sum: "$credits" } } }]),
      User.aggregate([{ $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $limit: 12 }]),
      Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, revenue: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $limit: 12 }]),
    ]);
    return res.json({ success: true, analytics: { usersByRole, jobsByStatus, applicationsByStatus, revenue: revenueAgg[0] || { revenue: 0, transactions: 0, credits: 0 }, monthlyUsers, monthlyPayments } });
  } catch (error) {
    console.error("Analytics error:", error);
    return res.status(500).json({ success: false, message: "Unable to load analytics." });
  }
};

export const getCommission = async (_req, res) => {
  try {
    const settings = await PlatformSetting.findOne({ key: "global" }).lean() || { commissionPercent: 0 };
    const revenue = await Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, gross: { $sum: "$amount" } } }]);
    const gross = revenue[0]?.gross || 0;
    const commission = gross * (Number(settings.commissionPercent || 0) / 100);
    return res.json({ success: true, commission: { percent: settings.commissionPercent || 0, grossRevenue: gross, commission, netRevenue: gross - commission } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load commission analysis." });
  }
};

export const getFeatureConfiguration = async (_req, res) => {
  try {
    const settings = await PlatformSetting.findOne({ key: "global" }).lean() || {};
    return res.json({ success: true, features: settings.features || {} });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load feature configuration." });
  }
};
