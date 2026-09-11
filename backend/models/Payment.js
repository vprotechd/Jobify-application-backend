import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "CvPackage", required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    credits: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["created", "paid", "failed", "refunded"], default: "created" },
    razorpayOrderId: { type: String, unique: true, sparse: true },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    receipt: { type: String, default: "" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ recruiter: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Payment", paymentSchema);
