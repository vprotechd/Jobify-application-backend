import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: ["jobseeker", "recruiter", "admin"],
      default: "jobseeker",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    otp: {
      type: String,
      default: null,
    },

    otpExpires: {
      type: Date,
      default: null,
    },

    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    favoriteJobs: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
      default: [],
    },

    // ==========================
    // CANDIDATE PROFILE
    // ==========================

    profileImage: {
      type: String,
      default: "",
    },

    profileImagePublicId: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    headline: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },

    bio: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    skills: {
      type: [String],
      default: [],
    },

    education: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    experience: {
      type: String,
      default: "",
      maxlength: 3000,
    },

    linkedin: {
      type: String,
      default: "",
      trim: true,
    },

    portfolio: {
      type: String,
      default: "",
      trim: true,
    },

    resume: {
      type: String,
      default: "",
    },

    resumePublicId: {
      type: String,
      default: "",
    },

    // ==========================
    // RECRUITER PROFILE
    // ==========================

    company: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },

    designation: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    website: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ==========================
    // RECRUITER RESUME ACCESS
    // ==========================
    // Every recruiter receives 10 free candidate-resume downloads.
    // After the free allowance is exhausted, one credit is consumed
    // for each new candidate application resume downloaded.
    resumeFreeDownloadsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    resumeCredits: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Configurable monthly recruiter CV allowance. The server resets this
    // lazily when a new calendar month is detected.
    freeCvCreditsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    freeCvCreditPeriodStart: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================
// PASSWORD HASHING
// ==========================

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(
    this.password,
    salt
  );
});

// ==========================
// PASSWORD COMPARISON
// ==========================

userSchema.methods.comparePassword =
  async function (enteredPassword) {
    return bcrypt.compare(
      enteredPassword,
      this.password
    );
  };

const User = mongoose.model(
  "User",
  userSchema
);

export default User;