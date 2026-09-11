import crypto from "crypto";
import axios from "axios";
import mongoose from "mongoose";
import CvPackage from "../models/CvPackage.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import PlatformSetting from "../models/PlatformSetting.js";
import { createNotification } from "../utils/createNotification.js";

const razorpayBase = "https://api.razorpay.com/v1";

const getCredentials = () => ({
  keyId: String(process.env.RAZORPAY_KEY_ID || "").trim(),
  keySecret: String(process.env.RAZORPAY_KEY_SECRET || "").trim(),
});

export const getRecruiterPackages = async (_req, res) => {
  try {
    const packages = await CvPackage.find({ active: true }).sort({ sortOrder: 1, price: 1 }).lean();
    const settings = await PlatformSetting.findOne({ key: "global" }).lean();
    return res.json({ success: true, packages, freeCvCreditsPerMonth: settings?.freeCvCreditsPerMonth ?? 10 });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load CV packages." });
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const settings = await PlatformSetting.findOne({ key: "global" }).lean();
    if (settings?.features?.payments === false) return res.status(403).json({ success: false, message: "Payments are currently disabled by the administrator." });
    const { packageId } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(packageId)) return res.status(400).json({ success: false, message: "Invalid package." });
    const pkg = await CvPackage.findOne({ _id: packageId, active: true });
    if (!pkg) return res.status(404).json({ success: false, message: "CV package not found or inactive." });
    const { keyId, keySecret } = getCredentials();
    if (!keyId || !keySecret) return res.status(503).json({ success: false, message: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env." });
    if (pkg.price <= 0) return res.status(400).json({ success: false, message: "This package does not require payment." });

    const receipt = `jobify_${Date.now()}_${String(req.user._id).slice(-6)}`.slice(0, 40);
    let order;
    try {
      const razorResponse = await axios.post(`${razorpayBase}/orders`, {
        amount: Math.round(pkg.price * 100),
        currency: pkg.currency || "INR",
        receipt,
        notes: { packageId: String(pkg._id), recruiterId: String(req.user._id), credits: String(pkg.credits) },
      }, { auth: { username: keyId, password: keySecret }, timeout: 15000 });
      order = razorResponse.data;
    } catch (error) {
      console.error("Razorpay API error:", error.response?.data || error.message);
      return res.status(502).json({ success: false, message: error.response?.data?.error?.description || "Unable to create Razorpay order." });
    }

    if (!order?.id) {
      console.error("Razorpay returned an invalid order response:", order);
      return res.status(502).json({ success: false, message: "Razorpay returned an invalid order response." });
    }

    let payment;
    try {
      payment = await Payment.create({ recruiter: req.user._id, package: pkg._id, amount: pkg.price, currency: pkg.currency || "INR", credits: pkg.credits, status: "created", razorpayOrderId: order.id, receipt });
    } catch (error) {
      console.error("Payment record error after Razorpay order creation:", error);
      return res.status(500).json({ success: false, message: "Razorpay order was created, but the local payment record could not be saved. Please try again." });
    }
    return res.status(201).json({ success: true, keyId, order: { id: order.id, amount: order.amount, currency: order.currency }, paymentId: payment._id, package: pkg });
  } catch (error) {
    console.error("Create payment order error:", error);
    return res.status(500).json({ success: false, message: "Unable to create payment order." });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    if (!orderId || !paymentId || !signature) return res.status(400).json({ success: false, message: "Incomplete Razorpay payment response." });
    const { keySecret } = getCredentials();
    if (!keySecret) return res.status(503).json({ success: false, message: "Razorpay is not configured on the server." });

    const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    const received = Buffer.from(String(signature));
    const expectedBuffer = Buffer.from(expected);
    const valid = received.length === expectedBuffer.length && crypto.timingSafeEqual(expectedBuffer, received);
    if (!valid) return res.status(400).json({ success: false, message: "Invalid payment signature." });

    const payment = await Payment.findOne({ razorpayOrderId: orderId, recruiter: req.user._id });
    if (!payment) return res.status(404).json({ success: false, message: "Payment order not found." });

    if (payment.status !== "paid") {
      payment.status = "paid";
      payment.razorpayPaymentId = paymentId;
      payment.razorpaySignature = signature;
      payment.paidAt = new Date();
      await payment.save();
      await User.findByIdAndUpdate(req.user._id, { $inc: { resumeCredits: payment.credits } });
      await createNotification({
        recipient: req.user._id,
        type: "payment",
        title: "Payment successful",
        message: `${payment.credits} CV credits have been added to your Jobify account.`,
        link: "CvPackages",
      });
    }

    const recruiter = await User.findById(req.user._id).select("resumeCredits").lean();
    return res.json({ success: true, message: "Payment verified and CV credits added successfully.", payment, resumeCredits: recruiter?.resumeCredits || 0 });
  } catch (error) {
    console.error("Razorpay verification error:", error);
    return res.status(500).json({ success: false, message: "Unable to verify payment." });
  }
};

export const getRecruiterPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ recruiter: req.user._id }).populate("package", "name credits price").sort({ createdAt: -1 }).lean();
    return res.json({ success: true, payments });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load payment history." });
  }
};
