import mongoose from "mongoose";
import axios from "axios";
import fs from "fs";
import path from "path";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import CvAccess from "../models/CvAccess.js";
import { getCvAccessState, unlockCandidate } from "../services/cvAccessService.js";
import { createNotification } from "../utils/createNotification.js";

// =====================================================
// CANDIDATE APPLY FOR JOB
// =====================================================

export const applyForJob = async (req, res) => {
  try {
    const candidateId = req.user?._id || req.user?.id;
    const { jobId } = req.params;

    if (!candidateId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const candidate = await User.findById(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found.",
      });
    }

    if (candidate.role !== "jobseeker") {
      return res.status(403).json({
        success: false,
        message: "Only jobseekers can apply for jobs.",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    if (job.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This job is no longer accepting applications.",
      });
    }

    // Check deadline
    if (
      job.applicationDeadline &&
      new Date() > new Date(job.applicationDeadline)
    ) {
      return res.status(400).json({
        success: false,
        message: "The application deadline has passed.",
      });
    }

    // Prevent duplicate application
    const existingApplication =
      await Application.findOne({
        candidate: candidateId,
        job: jobId,
      });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this job.",
      });
    }

    const {
      coverLetter = "",
      resume = "",
    } = req.body;

    const applicationResume = String(resume || candidate.resume || "").trim();

    const application = await Application.create({
      candidate: candidateId,
      job: job._id,
      recruiter: job.recruiter,
      coverLetter: String(coverLetter).trim(),
      resume: applicationResume,
      status: "pending",
    });

    // Update job application counter
    await Job.findByIdAndUpdate(job._id, {
      $inc: {
        applicationsCount: 1,
      },
    });

    await createNotification({
      recipient: candidateId,
      type: "application",
      title: "Application submitted",
      message: `Your application for ${job.title} was submitted successfully.`,
      link: "CandidateApplications",
    });
    if (job.recruiter) {
      await createNotification({
        recipient: job.recruiter,
        type: "application",
        title: "New application received",
        message: `${candidate.name} applied for ${job.title}.`,
        link: "RecruiterApplications",
      });
    }

    const populatedApplication =
      await Application.findById(application._id)
        .populate(
          "candidate",
          "name email phone resume profileImage"
        )
        .populate(
          "job",
          "title location"
        )
        .populate(
          "recruiter",
          "name email"
        );

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
      application: populatedApplication,
    });
  } catch (error) {
    console.error(
      "Apply for job error:",
      error
    );

    // Duplicate key protection
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this job.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to submit application.",
    });
  }
};

export const getRecruiterDashboard = async (req, res) => {
  try {
    const recruiterId =
      req.user?._id || req.user?.id;

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const recruiter =
      await User.findById(recruiterId).select(
        "name email role resumeFreeDownloadsUsed resumeCredits"
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
        message:
          "Only recruiters can access this dashboard.",
      });
    }

    // =====================================================
    // JOB STATISTICS
    // =====================================================

    const totalJobs = await Job.countDocuments({
      recruiter: recruiterId,
    });

    const activeJobs = await Job.countDocuments({
      recruiter: recruiterId,
      status: "active",
    });

    const closedJobs = await Job.countDocuments({
      recruiter: recruiterId,
      status: "closed",
    });

    // =====================================================
    // APPLICATION STATISTICS
    // =====================================================

    const totalApplications =
      await Application.countDocuments({
        recruiter: recruiterId,
      });

    const interviews =
      await Application.countDocuments({
        recruiter: recruiterId,
        status: "interview",
      });

    const hired =
      await Application.countDocuments({
        recruiter: recruiterId,
        status: "accepted",
      });

    // =====================================================
    // TOTAL VIEWS
    // =====================================================

    const viewsResult = await Job.aggregate([
      {
        $match: {
          recruiter:
            new mongoose.Types.ObjectId(
              recruiterId
            ),
        },
      },
      {
        $group: {
          _id: null,
          totalViews: {
            $sum: {
              $ifNull: ["$views", 0],
            },
          },
        },
      },
    ]);

    const totalViews =
      viewsResult.length > 0
        ? viewsResult[0].totalViews
        : 0;

    // =====================================================
    // RECENT JOBS
    // =====================================================

    const recentJobs =
      await Job.find({
        recruiter: recruiterId,
      })
        .populate("company")
        .sort({
          createdAt: -1,
        })
        .limit(5);

    // =====================================================
    // RECENT APPLICATIONS
    // =====================================================

    const recentApplications =
      await Application.find({
        recruiter: recruiterId,
      })
        .populate(
          "candidate",
          "name email phone resume profileImage headline location skills education experience linkedin portfolio"
        )
        .populate(
          "job",
          "title location"
        )
        .sort({
          createdAt: -1,
        })
        .limit(5);

    // =====================================================
    // RESPONSE
    // =====================================================

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
        applications: totalApplications,
        interviews,
        hired,
        totalViews,
      },

      // Keep stats too for compatibility
      stats: {
        totalJobs,
        activeJobs,
        closedJobs,
        totalApplications,
        applications: totalApplications,
        interviews,
        hired,
        totalViews,
      },

      recentJobs,

      recentApplications,

      resumeAccess: {
        freeDownloadsTotal: 10,
        freeDownloadsUsed: recruiter.resumeFreeDownloadsUsed || 0,
        freeDownloadsRemaining: Math.max(0, 10 - (recruiter.resumeFreeDownloadsUsed || 0)),
        credits: recruiter.resumeCredits || 0,
      },
    });
  } catch (error) {
    console.error(
      "Get recruiter dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load recruiter dashboard.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

// =====================================================
// GET RECRUITER APPLICATIONS
// =====================================================

export const getRecruiterApplications = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;
    if (!recruiterId) return res.status(401).json({ success: false, message: "Authentication required." });

    const applications = await Application.find({ recruiter: recruiterId })
      .populate("candidate", "_id name headline location skills experience education profileImage isVerified")
      .populate("job", "_id title location workMode jobType")
      .sort({ createdAt: -1 })
      .lean();

    const accessRows = await CvAccess.find({ recruiter: recruiterId, candidate: { $in: applications.map(a => a.candidate?._id).filter(Boolean) } })
      .select("candidate source viewedAt downloadedAt contactedAt")
      .lean();
    const accessMap = new Map(accessRows.map(a => [String(a.candidate), a]));

    const safeApplications = applications.map((application) => {
      const candidate = application.candidate || {};
      const access = accessMap.get(String(candidate._id));
      return {
        ...application,
        candidate: {
          _id: candidate._id,
          name: candidate.name,
          headline: candidate.headline || "",
          location: candidate.location || "",
          skills: candidate.skills || [],
          experience: candidate.experience || "",
          education: candidate.education || "",
          profileImage: candidate.profileImage || "",
          isVerified: Boolean(candidate.isVerified),
          email: access ? undefined : undefined,
          phone: access ? undefined : undefined,
        },
        cvUnlocked: Boolean(access),
        cvAccess: access || null,
      };
    });

    return res.status(200).json({ success: true, count: safeApplications.length, applications: safeApplications, resumeAccess: await getCvAccessState(recruiterId) });
  } catch (error) {
    console.error("Get recruiter applications error:", error);
    return res.status(500).json({ success: false, message: "Unable to load recruiter applications." });
  }
};

// =====================================================
// GET SINGLE APPLICATION
// =====================================================

export const getApplicationById = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;
    const { id } = req.params;
    if (!recruiterId) return res.status(401).json({ success: false, message: "Authentication required." });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid application ID." });

    const application = await Application.findOne({ _id: id, recruiter: recruiterId })
      .populate("candidate", "_id name headline location skills experience education profileImage isVerified")
      .populate("job", "_id title description location workMode jobType experience salaryMin salaryMax salaryCurrency")
      .populate("recruiter", "name email")
      .lean();
    if (!application) return res.status(404).json({ success: false, message: "Application not found." });

    const access = await CvAccess.findOne({ recruiter: recruiterId, candidate: application.candidate?._id }).lean();
    let candidate = application.candidate || {};
    if (access) {
      const unlocked = await User.findById(candidate._id).select("_id name email phone headline location skills education experience linkedin portfolio profileImage resume isVerified").lean();
      candidate = unlocked || candidate;
    }
    return res.status(200).json({ success: true, application: { ...application, candidate, cvUnlocked: Boolean(access), cvAccess: access || null }, resumeAccess: await getCvAccessState(recruiterId) });
  } catch (error) {
    console.error("Get application error:", error);
    return res.status(500).json({ success: false, message: "Unable to load application." });
  }
};

// =====================================================
// UPDATE APPLICATION STATUS
// =====================================================

export const updateApplicationStatus = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;
    const { id } = req.params;
    const { status, interviewDate, notes } = req.body;
    if (!recruiterId) return res.status(401).json({ success: false, message: "Authentication required." });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid application ID." });
    const allowedStatuses = ["pending", "reviewing", "interview", "accepted", "rejected"];
    if (!allowedStatuses.includes(status)) return res.status(400).json({ success: false, message: "Invalid application status." });
    const application = await Application.findOne({ _id: id, recruiter: recruiterId });
    if (!application) return res.status(404).json({ success: false, message: "Application not found." });
    application.status = status;
    if (interviewDate !== undefined) application.interviewDate = interviewDate ? new Date(interviewDate) : null;
    if (notes !== undefined) { application.recruiterNotes = String(notes).trim(); application.interviewNotes = String(notes).trim(); }
    await application.save();
    const candidate = await User.findById(application.candidate).select("name").lean();
    const job = await Job.findById(application.job).select("title").lean();
    await createNotification({
      recipient: application.candidate,
      type: "application_status",
      title: "Application status updated",
      message: `Your application for ${job?.title || "a job"} is now ${status}.`,
      link: "CandidateApplications",
    });
    const updatedApplication = await Application.findById(application._id).populate("candidate", "_id name headline location skills profileImage isVerified").populate("job", "title location").lean();
    return res.status(200).json({ success: true, message: "Application status updated successfully.", application: updatedApplication });
  } catch (error) {
    console.error("Update application status error:", error);
    return res.status(500).json({ success: false, message: "Unable to update application status." });
  }
};

// =====================================================
// DOWNLOAD CANDIDATE RESUME
// =====================================================

export const downloadCandidateResume = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;
    const { id } = req.params;
    if (!recruiterId) return res.status(401).json({ success: false, message: "Authentication required." });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid application ID." });

    const application = await Application.findOne({ _id: id, recruiter: recruiterId }).populate("candidate", "_id name resume").lean();
    if (!application) return res.status(404).json({ success: false, message: "Application not found." });
    const candidate = application.candidate;
    if (!candidate?.resume) return res.status(404).json({ success: false, message: "This candidate has not uploaded a resume." });

    const result = await unlockCandidate({ recruiterId, candidateId: candidate._id });
    const access = result.access;
    await createNotification({
      recipient: recruiterId,
      type: "candidate",
      title: "Candidate CV unlocked",
      message: `${candidate.name || "Candidate"}'s CV is now available to you.`,
      link: "Candidates",
    });
    access.downloadedAt = access.downloadedAt || new Date();
    await access.save();

    let filename = String(candidate.resume).trim();
    if (/^https?:\/\//i.test(filename)) {
      const parsed = new URL(filename);
      if (!/(^|\.)res\.cloudinary\.com$/i.test(parsed.hostname)) return res.status(400).json({ success: false, message: "External resume URLs cannot be downloaded through Jobify." });
      const remote = await axios.get(filename, { responseType: "stream", timeout: 30000 });
      const safeName = String(candidate.name || "candidate").replace(/[^a-zA-Z0-9_-]+/g, "-") || "candidate";
      res.setHeader("Content-Type", remote.headers["content-type"] || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}-resume.pdf"`);
      return remote.data.pipe(res);
    }
    filename = path.basename(filename.replace(/^\/+/, "").replace(/^uploads[\\/]/i, ""));
    const filePath = path.join(process.cwd(), "uploads", filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: "Resume file is no longer available on the server." });
    const safeName = String(candidate.name || "candidate").replace(/[^a-zA-Z0-9_-]+/g, "-") || "candidate";
    return res.download(filePath, `${safeName}-resume${path.extname(filename) || ".pdf"}`);
  } catch (error) {
    console.error("Download candidate resume error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Unable to download candidate resume." });
  }
};

// =====================================================
// GET CANDIDATE APPLICATIONS
// =====================================================

export const getCandidateApplications = async (
  req,
  res
) => {
  try {
    const candidateId =
      req.user?._id || req.user?.id;

    if (!candidateId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const applications =
      await Application.find({
        candidate: candidateId,
      })
        .populate(
          "job",
          "title location workMode jobType company"
        )
        .populate(
          "recruiter",
          "name email"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error(
      "Get candidate applications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load your applications.",
    });
  }
};