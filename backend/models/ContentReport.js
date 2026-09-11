import mongoose from "mongoose";

const contentReportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["job", "company", "user", "application"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    status: { type: String, enum: ["open", "reviewing", "resolved", "dismissed"], default: "open" },
    adminNotes: { type: String, default: "" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

contentReportSchema.index({ status: 1, createdAt: -1 });
contentReportSchema.index({ targetType: 1, targetId: 1 });

export default mongoose.model("ContentReport", contentReportSchema);
