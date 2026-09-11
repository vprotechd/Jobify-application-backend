import mongoose from "mongoose";

const cvAccessSchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    source: { type: String, enum: ["free", "credit"], required: true },
    creditCost: { type: Number, default: 1, min: 1 },
    viewedAt: { type: Date, default: null },
    downloadedAt: { type: Date, default: null },
    contactedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

cvAccessSchema.index({ recruiter: 1, candidate: 1 }, { unique: true });
cvAccessSchema.index({ recruiter: 1, createdAt: -1 });

export default mongoose.model("CvAccess", cvAccessSchema);
