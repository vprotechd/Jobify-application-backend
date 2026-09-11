import Job from "../models/Job.js";
import Application from "../models/Application.js";
import User from "../models/User.js";
import { getCvAccessState } from "../services/cvAccessService.js";

const publicFileUrl = (req, filename) => {
  if (!filename) return "";
  if (/^https?:\/\//i.test(String(filename))) return String(filename);
  const clean = String(filename).replace(/^\/+/, "").replace(/^uploads[\\/]/i, "");
  return `${req.protocol}://${req.get("host")}/api/files/image/${encodeURIComponent(clean)}`;
};

/**
 * GET /api/recruiter/dashboard
 * Protected - recruiter only
 */
export const getRecruiterDashboard = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const recruiter = await User.findById(recruiterId)
      .select("_id name email role phone company profileImage profilePicture avatar resumeCredits freeCvCreditsUsed freeCvCreditPeriodStart")
      .lean();

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "Recruiter not found.",
      });
    }

    if (recruiter.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message: "Recruiter access required.",
      });
    }

    const recruiterJobs = await Job.find({ recruiter: recruiterId })
      .select("_id title status views applicationsCount applicationDeadline createdAt company location")
      .populate("company", "_id name logo industry location website")
      .sort({ createdAt: -1 })
      .lean();

    const jobIds = recruiterJobs.map((job) => job._id);

    const [totalApplications, interviews, hired] = await Promise.all([
      Application.countDocuments({ recruiter: recruiterId }),
      Application.countDocuments({
        recruiter: recruiterId,
        status: "interview",
      }),
      Application.countDocuments({
        recruiter: recruiterId,
        status: "accepted",
      }),
    ]);

    const activeJobs = recruiterJobs.filter(
      (job) => job.status === "active"
    ).length;

    const closedJobs = recruiterJobs.filter(
      (job) => job.status === "closed"
    ).length;

    const totalViews = recruiterJobs.reduce(
      (sum, job) => sum + Number(job.views || 0),
      0
    );

    const recentApplications = await Application.find({
      recruiter: recruiterId,
    })
      .populate("candidate", "_id name headline location skills profileImage isVerified")
      .populate("job", "_id title location company")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentJobs = recruiterJobs.slice(0, 5);
    const cvAccess = await getCvAccessState(recruiterId);

    return res.status(200).json({
      success: true,
      message: "Recruiter dashboard loaded successfully.",
      recruiter: {
        id: recruiter._id,
        _id: recruiter._id,
        name: recruiter.name || "",
        email: recruiter.email || "",
        role: recruiter.role,
        phone: recruiter.phone || "",
        company: recruiter.company || "",
        profileImage: recruiter.profileImage || recruiter.profilePicture || recruiter.avatar || "",
        profilePicture: recruiter.profileImage || recruiter.profilePicture || recruiter.avatar || "",
      },
      statistics: {
        totalJobs: recruiterJobs.length,
        activeJobs,
        closedJobs,
        totalApplications,
        applications: totalApplications,
        interviews,
        hired,
        totalViews,
      },
      stats: {
        totalJobs: recruiterJobs.length,
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
      resumeAccess: { freeDownloadsTotal: cvAccess.freeTotal, freeDownloadsUsed: cvAccess.freeUsed, freeDownloadsRemaining: cvAccess.freeRemaining, credits: cvAccess.paidCredits, creditCost: cvAccess.creditCost },
    });
  } catch (error) {
    console.error("Get recruiter dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load recruiter dashboard.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


/**
 * GET /api/recruiter/profile
 * Protected - recruiter only
 */
export const getRecruiterProfile = async (req, res) => {
  try {
    const recruiterId = req.user?._id || req.user?.id;

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const recruiter = await User.findById(recruiterId)
      .select("-password -otp -otpExpires -resetPasswordToken -resetPasswordExpires")
      .lean();

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "Recruiter profile not found.",
      });
    }

    if (recruiter.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message: "Recruiter access required.",
      });
    }

    return res.status(200).json({
      success: true,
      profile: {
        ...recruiter,
        id: recruiter._id,
        profileImage: publicFileUrl(req, recruiter.profileImage || recruiter.profilePicture || recruiter.avatar || ""),
      },
    });
  } catch (error) {
    console.error("Get recruiter profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load recruiter profile.",
    });
  }
};

/**
 * PUT /api/recruiter/profile
 * Protected - recruiter only
 */
export const updateRecruiterProfile = async (req, res) => {
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
        message: "Recruiter profile not found.",
      });
    }

    if (recruiter.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message: "Recruiter access required.",
      });
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
        recruiter[field] = String(req.body[field]).trim();
      }
    }

    if (!recruiter.name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    const profileImage = req.files?.profileImage?.[0];
    if (profileImage) {
      recruiter.profileImage = profileImage.filename;
    }

    await recruiter.save();

    const saved = recruiter.toObject();
    delete saved.password;
    delete saved.otp;
    delete saved.otpExpires;
    delete saved.resetPasswordToken;
    delete saved.resetPasswordExpires;

    return res.status(200).json({
      success: true,
      message: "Recruiter profile updated successfully.",
      profile: {
        ...saved,
        id: saved._id,
        profileImage: publicFileUrl(req, saved.profileImage || ""),
      },
    });
  } catch (error) {
    console.error("Update recruiter profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update recruiter profile.",
    });
  }
};
