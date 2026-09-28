import mongoose from "mongoose";
import Application from "../models/Application.js";
import CvAccess from "../models/CvAccess.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Job from "../models/Job.js";
import { createNotification } from "../utils/createNotification.js";

const userId = (req) => req.user?._id || req.user?.id;

async function getAuthorizedApplication(req, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: [400, "Invalid application ID."] };
  const application = await Application.findById(id).populate("job", "_id title").lean();
  if (!application) return { error: [404, "Application not found."] };

  const requester = String(userId(req));
  const candidate = String(application.candidate);
  const recruiter = String(application.recruiter);

  if (req.user.role === "jobseeker") {
    if (requester !== candidate) return { error: [403, "You can only access your own application messages."] };
    return { application, role: "candidate", otherUserId: application.recruiter };
  }

  if (req.user.role === "recruiter") {
    if (requester !== recruiter) return { error: [403, "You can only access applications for your jobs."] };
    const access = await CvAccess.exists({ recruiter: application.recruiter, candidate: application.candidate });
    if (!access) return { error: [403, "Unlock the candidate CV before viewing or sending messages."] };
    return { application, role: "recruiter", otherUserId: application.candidate };
  }

  return { error: [403, "Only candidates and recruiters can use messaging."] };
}

export const listConversations = async (req, res) => {
  try {
    const me = userId(req);
    if (!me || !["jobseeker", "recruiter"].includes(req.user.role)) return res.status(403).json({ success: false, message: "Messaging is available to candidates and recruiters." });
    const filter = req.user.role === "jobseeker" ? { candidate: me } : { recruiter: me };
    const applications = await Application.find(filter).populate("job", "title location").populate("candidate", "_id name profileImage").sort({ updatedAt: -1 }).lean();
    let visibleApplications = applications;
    if (req.user.role === "recruiter") {
      const accesses = await CvAccess.find({ recruiter: me, candidate: { $in: applications.map(a => a.candidate?._id).filter(Boolean) } }).select("candidate").lean();
      const allowed = new Set(accesses.map(a => String(a.candidate)));
      visibleApplications = applications.filter(a => allowed.has(String(a.candidate?._id || a.candidate)));
    }
    const ids = visibleApplications.map(a => a._id);
    const latest = await Message.aggregate([
      { $match: { application: { $in: ids } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$application", lastMessage: { $first: "$$ROOT" }, unread: { $sum: { $cond: [{ $and: [{ $eq: ["$recipient", new mongoose.Types.ObjectId(me)] }, { $eq: ["$readAt", null] }] }, 1, 0] } } } },
    ]);
    const map = new Map(latest.map(x => [String(x._id), x]));
    const conversations = visibleApplications.map(a => {
      const item = map.get(String(a._id));
      const other = req.user.role === "jobseeker" ? a.recruiter : a.candidate;
      return { applicationId: a._id, job: a.job, candidate: a.candidate, recruiter: a.recruiter, otherUser: other, lastMessage: item?.lastMessage || null, unread: item?.unread || 0 };
    }).filter(x => x.lastMessage || x.job);
    return res.json({ success: true, conversations });
  } catch (error) {
    console.error("List message conversations error:", error);
    return res.status(500).json({ success: false, message: "Unable to load conversations." });
  }
};

export const getMessages = async (req, res) => {
  try {
    const access = await getAuthorizedApplication(req, req.params.applicationId);
    if (access.error) return res.status(access.error[0]).json({ success: false, message: access.error[1] });
    const messages = await Message.find({ application: access.application._id }).populate("sender", "_id name role profileImage").sort({ createdAt: 1 }).lean();
    await Message.updateMany({ application: access.application._id, recipient: userId(req), readAt: null }, { $set: { readAt: new Date() } });
    return res.json({ success: true, application: access.application, messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({ success: false, message: "Unable to load messages." });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const body = String(req.body?.body || "").trim();
    if (!body) return res.status(400).json({ success: false, message: "Message cannot be empty." });
    if (body.length > 5000) return res.status(400).json({ success: false, message: "Message is too long." });
    const access = await getAuthorizedApplication(req, req.params.applicationId);
    if (access.error) return res.status(access.error[0]).json({ success: false, message: access.error[1] });
    const sender = userId(req);
    const recipient = access.otherUserId;
    const message = await Message.create({ application: access.application._id, sender, recipient, body });
    const populated = await Message.findById(message._id).populate("sender", "_id name role profileImage").lean();
    const jobTitle = access.application.job?.title || "your Jobify application";
    await createNotification({ recipient, type: "message", title: "New message", message: `You have a new message about ${jobTitle}.`, link: "Messages" });
    if (globalThis.__jobifyIO) {
      globalThis.__jobifyIO.to(`user:${String(recipient)}`).emit("message:new", populated);
      globalThis.__jobifyIO.to(`user:${String(sender)}`).emit("message:sent", populated);
    }
    return res.status(201).json({ success: true, message: populated });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({ success: false, message: "Unable to send message." });
  }
};

export const unreadMessageCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({ recipient: userId(req), readAt: null });
    return res.json({ success: true, unreadCount: count });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to load message count." }); }
};
