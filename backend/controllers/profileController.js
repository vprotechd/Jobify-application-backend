import fs from "fs";
import path from "path";
import User from "../models/User.js";

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
    data.resume = publicFileUrl(
      req,
      data.resume
    );
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
| PUT /api/profile/me
|--------------------------------------------------------------------------
|
| Supports:
| - Name
| - Phone
| - Location
| - Headline
| - Bio
| - Skills
| - Education
| - Experience
| - LinkedIn
| - Portfolio
| - Profile picture
| - Resume
|--------------------------------------------------------------------------
*/

export const updateMyProfile = async (
  req,
  res
) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ONLY JOBSEEKERS CAN UPDATE CANDIDATE PROFILE
    |--------------------------------------------------------------------------
    */

    if (user.role !== "jobseeker") {
      return res.status(403).json({
        success: false,
        message:
          "Only jobseekers can update candidate profiles.",
      });
    }

    const {
      name,
      phone,
      location,
      headline,
      bio,
      skills,
      education,
      experience,
      linkedin,
      portfolio,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | BASIC INFORMATION
    |--------------------------------------------------------------------------
    */

    if (name !== undefined) {
      const cleanedName = String(name).trim();

      if (!cleanedName) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty.",
        });
      }

      user.name = cleanedName;
    }

    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }

    if (location !== undefined) {
      user.location = String(location).trim();
    }

    if (headline !== undefined) {
      user.headline = String(headline).trim();
    }

    if (bio !== undefined) {
      user.bio = String(bio).trim();
    }

    if (education !== undefined) {
      user.education =
        String(education).trim();
    }

    if (experience !== undefined) {
      user.experience =
        String(experience).trim();
    }

    if (linkedin !== undefined) {
      user.linkedin =
        String(linkedin).trim();
    }

    if (portfolio !== undefined) {
      user.portfolio =
        String(portfolio).trim();
    }

    /*
    |--------------------------------------------------------------------------
    | SKILLS
    |--------------------------------------------------------------------------
    |
    | Accepts:
    | skills: ["React", "Node.js", "MongoDB"]
    |
    | OR:
    | skills: "React, Node.js, MongoDB"
    |--------------------------------------------------------------------------
    */

    if (skills !== undefined) {
      if (Array.isArray(skills)) {
        user.skills = skills
          .map((skill) =>
            String(skill).trim()
          )
          .filter(Boolean);
      } else {
        user.skills = String(skills)
          .split(",")
          .map((skill) =>
            skill.trim()
          )
          .filter(Boolean);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | PROFILE IMAGE
    |--------------------------------------------------------------------------
    |
    | Multer field name:
    | profileImage
    |--------------------------------------------------------------------------
    */

    const profileImage =
      req.files?.profileImage?.[0];

    if (profileImage) {
      const oldImage =
        user.profileImage;

      user.profileImage =
        profileImage.filename;

      // Delete previous image
      if (oldImage) {
        deleteOldFile(oldImage);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | RESUME
    |--------------------------------------------------------------------------
    |
    | Multer field name:
    | resume
    |--------------------------------------------------------------------------
    */

    const resume =
      req.files?.resume?.[0];

    if (resume) {
      const oldResume =
        user.resume;

      user.resume =
        resume.filename;

      // Delete previous resume
      if (oldResume) {
        deleteOldFile(oldResume);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | SAVE
    |--------------------------------------------------------------------------
    */

    await user.save();

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message:
        "Profile updated successfully.",
      profile: sanitizeUser(
        user,
        req
      ),
    });
  } catch (error) {
    console.error(
      "Update profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to update profile.",
    });
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
      user.profileImage = profileImage.filename;
      if (oldImage) deleteOldFile(oldImage);
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
