import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ application: 1, createdAt: 1 });
messageSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
