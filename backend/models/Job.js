import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      default: "",
    },

    workMode: {
      type: String,
      enum: [
        "onsite",
        "remote",
        "hybrid",
      ],
      default: "onsite",
    },

    jobType: {
      type: String,
      enum: [
        "full-time",
        "part-time",
        "contract",
        "internship",
        "freelance",
      ],
      default: "full-time",
    },

    experience: {
      type: String,
      default: "",
    },

    salaryMin: {
      type: Number,
      default: null,
    },

    salaryMax: {
      type: Number,
      default: null,
    },

    salaryCurrency: {
      type: String,
      default: "INR",
    },

    skills: [
      {
        type: String,
        trim: true,
      },
    ],

    requirements: [
      {
        type: String,
      },
    ],

    responsibilities: [
      {
        type: String,
      },
    ],

    status: {
      type: String,
      enum: [
        "draft",
        "active",
        "closed",
      ],
      default: "active",
    },

    applicationDeadline: {
      type: Date,
      default: null,
    },

    views: {
      type: Number,
      default: 0,
    },

    applicationsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Job = mongoose.model("Job", jobSchema);

export default Job;