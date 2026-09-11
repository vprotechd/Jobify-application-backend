import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    // Candidate who applied
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Job applied for
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    // Recruiter who owns the job
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Application status
    status: {
      type: String,
      enum: [
        "pending",
        "reviewing",
        "shortlisted",
        "interview",
        "accepted",
        "rejected",
      ],
      default: "pending",
    },

    // Candidate's cover letter
    coverLetter: {
      type: String,
      trim: true,
      default: "",
    },

    // Resume URL
    resume: {
      type: String,
      trim: true,
      default: "",
    },

    // Whether this candidate application has already consumed a
    // recruiter resume-download allowance/credit. This prevents
    // repeatedly downloading the same application from consuming
    // multiple downloads.
    resumeDownloaded: {
      type: Boolean,
      default: false,
    },

    resumeDownloadedAt: {
      type: Date,
      default: null,
    },

    // Optional recruiter notes
    recruiterNotes: {
      type: String,
      trim: true,
      default: "",
    },

    // Interview information
    interviewDate: {
      type: Date,
      default: null,
    },

    interviewNotes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent the same candidate from applying to the same job twice
applicationSchema.index(
  {
    candidate: 1,
    job: 1,
  },
  {
    unique: true,
  }
);

applicationSchema.index({
  recruiter: 1,
  status: 1,
});

applicationSchema.index({
  job: 1,
  status: 1,
});

const Application = mongoose.model(
  "Application",
  applicationSchema
);

export default Application;