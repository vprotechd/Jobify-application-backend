import mongoose from "mongoose";

const platformSettingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "global" },
    freeCvCreditsPerMonth: { type: Number, default: 10, min: 0 },
    creditCostPerCandidate: { type: Number, default: 1, min: 1 },
    commissionPercent: { type: Number, default: 0, min: 0, max: 100 },
    currency: { type: String, default: "INR" },
    platformName: { type: String, default: "Jobify" },
    contactEmail: { type: String, default: "" },
    supportPhone: { type: String, default: "" },
    maintenanceMode: { type: Boolean, default: false },
    allowCandidateContact: { type: Boolean, default: true },
    allowCandidateSearch: { type: Boolean, default: true },
    features: {
      cvSearch: { type: Boolean, default: true },
      cvDownload: { type: Boolean, default: true },
      recruiterContact: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model("PlatformSetting", platformSettingSchema);
