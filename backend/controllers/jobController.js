import mongoose from "mongoose";
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import { createNotification } from "../utils/createNotification.js";
import User from "../models/User.js";
import Application from "../models/Application.js";

// =====================================================
// CREATE JOB
// =====================================================

export const createJob = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const recruiter = await User.findById(recruiterId);

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "Recruiter not found.",
      });
    }

    if (recruiter.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message: "Only recruiters can create jobs.",
      });
    }

    const {
      company,
      title,
      description,
      location,
      workMode,
      jobType,
      experience,
      salaryMin,
      salaryMax,
      salaryCurrency,
      skills,
      requirements,
      responsibilities,
      applicationDeadline,
    } = req.body;

    if (!company) {
      return res.status(400).json({
        success: false,
        message: "Company is required.",
      });
    }

    let companyDoc = null;

    if (mongoose.Types.ObjectId.isValid(company)) {
      companyDoc = await Company.findOne({ _id: company, recruiter: recruiterId });
    } else {
      const companyName = String(company).trim();
      if (companyName) {
        companyDoc = await Company.findOne({ recruiter: recruiterId, name: companyName });
        if (!companyDoc) {
          companyDoc = await Company.create({ recruiter: recruiterId, name: companyName });
        }
      }
    }

    if (!companyDoc) {
      return res.status(404).json({ success: false, message: "Company not found or could not be created." });
    }

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Job title is required.",
      });
    }

    if (!description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Job description is required.",
      });
    }

    if (!location?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Location is required.",
      });
    }

    if (
      salaryMin !== null &&
      salaryMin !== undefined &&
      salaryMin !== "" &&
      salaryMax !== null &&
      salaryMax !== undefined &&
      salaryMax !== "" &&
      Number(salaryMin) > Number(salaryMax)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimum salary cannot be greater than maximum salary.",
      });
    }

    let deadline = null;

    if (applicationDeadline) {
      const deadlineValue = String(applicationDeadline).trim().replace(
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
        (_, year, month, day) => `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      );
      const parsedDeadline = new Date(deadlineValue);

      if (Number.isNaN(parsedDeadline.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid application deadline.",
        });
      }

      deadline = parsedDeadline;
    }

    const job = await Job.create({
      recruiter: recruiterId,
      company: companyDoc._id,

      title: title.trim(),
      description: description.trim(),
      location: location.trim(),

      workMode: ({ Remote: "remote", Hybrid: "hybrid", "On-site": "onsite", onsite: "onsite", remote: "remote", hybrid: "hybrid" })[workMode] || "onsite",
      jobType: ({ "Full-time": "full-time", "Part-time": "part-time", Contract: "contract", Internship: "internship", Freelance: "freelance", "full-time": "full-time", "part-time": "part-time", contract: "contract", internship: "internship", freelance: "freelance" })[jobType] || "full-time",

      experience: experience?.trim() || "",

      salaryMin:
        salaryMin === "" ||
        salaryMin === null ||
        salaryMin === undefined
          ? null
          : Number(salaryMin),

      salaryMax:
        salaryMax === "" ||
        salaryMax === null ||
        salaryMax === undefined
          ? null
          : Number(salaryMax),

      salaryCurrency: salaryCurrency || "INR",

      skills: Array.isArray(skills)
        ? skills
            .map((skill) => String(skill).trim())
            .filter(Boolean)
        : typeof skills === "string"
          ? skills.split(",").map((skill) => skill.trim()).filter(Boolean)
          : [],

      requirements: Array.isArray(requirements)
        ? requirements
            .map((item) => String(item).trim())
            .filter(Boolean)
        : typeof requirements === "string"
          ? requirements.split("\n").map((item) => item.trim()).filter(Boolean)
          : [],

      responsibilities: Array.isArray(responsibilities)
        ? responsibilities
            .map((item) => String(item).trim())
            .filter(Boolean)
        : typeof responsibilities === "string"
          ? responsibilities.split("\n").map((item) => item.trim()).filter(Boolean)
          : [],

      status: "active",

      applicationDeadline: deadline,

      views: 0,
      applicationsCount: 0,
    });

    const populatedJob = await Job.findById(job._id)
      .populate("recruiter", "name email")
      .populate("company");

    return res.status(201).json({
      success: true,
      message: "Job posted successfully.",
      job: populatedJob,
    });
  } catch (error) {
    console.error("Create job error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create job.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

// =====================================================
// GET RECRUITER DASHBOARD
// =====================================================

// =====================================================
// GET RECRUITER DASHBOARD
// =====================================================

export const getRecruiterDashboard = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(recruiterId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recruiter ID.",
      });
    }

    // ===================================================
    // GET RECRUITER
    // ===================================================

    const recruiter = await User.findById(recruiterId).select(
      "_id name email role resumeFreeDownloadsUsed resumeCredits"
    );

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "Recruiter not found.",
      });
    }

    if (recruiter.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message: "Only recruiters can access this dashboard.",
      });
    }

    // ===================================================
    // GET RECRUITER JOBS
    // ===================================================

    const recruiterJobs = await Job.find({
      recruiter: recruiterId,
    })
      .select(
        "_id title status views applicationsCount applicationDeadline createdAt company"
      )
      .populate("company")
      .sort({ createdAt: -1 })
      .lean();

    const jobIds = recruiterJobs.map((job) => job._id);

    // ===================================================
    // JOB STATISTICS
    // ===================================================

    const totalJobs = recruiterJobs.length;

    const activeJobs = recruiterJobs.filter(
      (job) => job.status === "active"
    ).length;

    const closedJobs = recruiterJobs.filter(
      (job) => job.status === "closed"
    ).length;

    const totalViews = recruiterJobs.reduce(
      (total, job) => total + Number(job.views || 0),
      0
    );

    // ===================================================
    // APPLICATION STATISTICS
    // ===================================================

    let totalApplications = 0;
    let interviews = 0;
    let hired = 0;

    if (jobIds.length > 0) {
      [
        totalApplications,
        interviews,
        hired,
      ] = await Promise.all([
        Application.countDocuments({
          job: { $in: jobIds },
        }),

        Application.countDocuments({
          job: { $in: jobIds },
          status: {
            $in: [
              "interview",
              "interview scheduled",
            ],
          },
        }),

        Application.countDocuments({
          job: { $in: jobIds },
          status: "accepted",
        }),
      ]);
    }

    // ===================================================
    // RECENT APPLICATIONS
    // ===================================================

    let recentApplications = [];

    if (jobIds.length > 0) {
      recentApplications = await Application.find({
        job: { $in: jobIds },
      })
        .populate({
          path: "candidate",
          select: "_id name email phone resume profileImage headline location skills education experience linkedin portfolio",
        })
        .populate({
          path: "job",
          select: "_id title",
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    }

    // ===================================================
    // RESPONSE
    // ===================================================

    return res.status(200).json({
      success: true,

      recruiter: {
        id: recruiter._id,
        name: recruiter.name,
        email: recruiter.email,
        role: recruiter.role,
        resumeFreeDownloadsUsed: recruiter.resumeFreeDownloadsUsed || 0,
        resumeFreeDownloadsRemaining: Math.max(0, 10 - (recruiter.resumeFreeDownloadsUsed || 0)),
        resumeCredits: recruiter.resumeCredits || 0,
      },

      statistics: {
        totalJobs,
        activeJobs,
        closedJobs,
        totalApplications,
        totalViews,

        interviews,
        hired,
      },

      resumeAccess: {
        freeDownloadsTotal: 10,
        freeDownloadsUsed: recruiter.resumeFreeDownloadsUsed || 0,
        freeDownloadsRemaining: Math.max(0, 10 - (recruiter.resumeFreeDownloadsUsed || 0)),
        credits: recruiter.resumeCredits || 0,
      },

      // Keep this because other recruiter pages
      // may already use recentJobs.
      recentJobs: recruiterJobs,

      // Used by RecruiterDashboard.jsx
      recentApplications,
    });
  } catch (error) {
    console.error(
      "Get recruiter dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load recruiter dashboard.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

// =====================================================
// GET RECRUITER JOBS
// =====================================================

export const getRecruiterJobs = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const jobs = await Job.find({
      recruiter: recruiterId,
    })
      .populate("company")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error("Get recruiter jobs error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load recruiter jobs.",
    });
  }
};

// =====================================================
// GET SINGLE RECRUITER JOB
// =====================================================

export const getJobById = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const job = await Job.findOne({
      _id: id,
      recruiter: recruiterId,
    })
      .populate("company")
      .populate("recruiter", "name email");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    return res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("Get job error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load job.",
    });
  }
};

// =====================================================
// UPDATE JOB
// =====================================================

export const updateJob = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const job = await Job.findOne({
      _id: id,
      recruiter: recruiterId,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "location",
      "workMode",
      "jobType",
      "experience",
      "salaryMin",
      "salaryMax",
      "salaryCurrency",
      "skills",
      "requirements",
      "responsibilities",
      "applicationDeadline",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    });

    if (job.title) {
      job.title = job.title.trim();
    }

    if (job.description) {
      job.description = job.description.trim();
    }

    if (job.location) {
      job.location = job.location.trim();
    }

    if (
      job.salaryMin !== null &&
      job.salaryMin !== undefined &&
      job.salaryMax !== null &&
      job.salaryMax !== undefined &&
      Number(job.salaryMin) > Number(job.salaryMax)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimum salary cannot be greater than maximum salary.",
      });
    }

    await job.save();

    const updatedJob = await Job.findById(job._id)
      .populate("company")
      .populate("recruiter", "name email");

    return res.status(200).json({
      success: true,
      message: "Job updated successfully.",
      job: updatedJob,
    });
  } catch (error) {
    console.error("Update job error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update job.",
    });
  }
};

// =====================================================
// CLOSE JOB
// =====================================================

export const closeJob = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const job = await Job.findOne({
      _id: id,
      recruiter: recruiterId,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    job.status = "closed";

    await job.save();
    await createNotification({
      recipient: recruiterId,
      type: "job",
      title: "Job closed",
      message: `${job.title} has been closed.`,
      link: "Jobs",
    });

    return res.status(200).json({
      success: true,
      message: "Job closed successfully.",
      job,
    });
  } catch (error) {
    console.error("Close job error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to close job.",
    });
  }
};

// =====================================================
// PUBLISH JOB
// =====================================================

export const publishJob = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const job = await Job.findOne({
      _id: id,
      recruiter: recruiterId,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    job.status = "active";

    await job.save();
    await createNotification({
      recipient: recruiterId,
      type: "job",
      title: "Job published",
      message: `${job.title} is now live and accepting applications.`,
      link: "Jobs",
    });

    return res.status(200).json({
      success: true,
      message: "Job published successfully.",
      job,
    });
  } catch (error) {
    console.error("Publish job error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to publish job.",
    });
  }
};

// =====================================================
// DELETE JOB
// =====================================================

export const deleteJob = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const job = await Job.findOneAndDelete({
      _id: id,
      recruiter: recruiterId,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job deleted successfully.",
    });
  } catch (error) {
    console.error("Delete job error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete job.",
    });
  }
};
// =====================================================
// PUBLIC JOB LIST / DETAILS
// =====================================================

export const getPublicJobs = async (req, res) => {
  try {
    const query = { status: "active" };
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { location: { $regex: req.query.search, $options: "i" } },
      ];
    }
    if (req.query.location) query.location = { $regex: req.query.location, $options: "i" };
    if (req.query.jobType) query.jobType = req.query.jobType;
    if (req.query.workMode) query.workMode = req.query.workMode;

    const jobs = await Job.find(query)
      .populate("company")
      .populate("recruiter", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, jobs, count: jobs.length });
  } catch (error) {
    console.error("Get public jobs error:", error);
    res.status(500).json({ success: false, message: "Unable to load jobs." });
  }
};

export const getPublicJobById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid job ID." });
    }
    const job = await Job.findOne({ _id: req.params.id, status: "active" })
      .populate("company")
      .populate("recruiter", "name email");
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });

    await Job.findByIdAndUpdate(job._id, { $inc: { views: 1 } });
    job.views += 1;
    res.json({ success: true, job });
  } catch (error) {
    console.error("Get public job error:", error);
    res.status(500).json({ success: false, message: "Unable to load job." });
  }
};
