import User from "../models/User.js";
import PlatformSetting from "../models/PlatformSetting.js";
import CvAccess from "../models/CvAccess.js";

const monthStart = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);

export async function getGlobalSettings() {
  let settings = await PlatformSetting.findOne({ key: "global" });
  if (!settings) settings = await PlatformSetting.create({ key: "global" });
  return settings;
}

export async function normalizeRecruiterAllowance(recruiterId) {
  const start = monthStart();
  const recruiter = await User.findById(recruiterId).select("role freeCvCreditsUsed freeCvCreditPeriodStart resumeCredits resumeFreeDownloadsUsed");
  if (!recruiter) return null;
  if (recruiter.role !== "recruiter") return recruiter;
  const existing = recruiter.freeCvCreditPeriodStart ? monthStart(new Date(recruiter.freeCvCreditPeriodStart)) : null;
  if (!existing || existing.getTime() !== start.getTime()) {
    recruiter.freeCvCreditsUsed = 0;
    recruiter.freeCvCreditPeriodStart = start;
    // Keep legacy field in sync for old recruiter screens.
    recruiter.resumeFreeDownloadsUsed = 0;
    await recruiter.save();
  }
  return recruiter;
}

export async function getCvAccessState(recruiterId) {
  const recruiter = await normalizeRecruiterAllowance(recruiterId);
  const settings = await getGlobalSettings();
  const allowance = Math.max(0, Number(settings.freeCvCreditsPerMonth ?? 10));
  const freeUsed = Math.min(allowance, Number(recruiter?.freeCvCreditsUsed || 0));
  return {
    freeTotal: allowance,
    freeUsed,
    freeRemaining: Math.max(0, allowance - freeUsed),
    paidCredits: Number(recruiter?.resumeCredits || 0),
    creditCost: Math.max(1, Number(settings.creditCostPerCandidate || 1)),
  };
}

/**
 * Unlock a candidate CV for a recruiter exactly once.
 * Basic candidate information can be searched without spending credits.
 * The first unlock consumes one free monthly unit when available,
 * otherwise the configured number of paid credits (normally 1).
 */
export async function unlockCandidate({ recruiterId, candidateId }) {
  const existing = await CvAccess.findOne({ recruiter: recruiterId, candidate: candidateId });
  if (existing) {
    if (!existing.viewedAt) {
      existing.viewedAt = new Date();
      await existing.save();
    }
    return { access: existing, charged: false, source: existing.source };
  }

  const recruiter = await normalizeRecruiterAllowance(recruiterId);
  if (!recruiter || recruiter.role !== "recruiter") {
    const error = new Error("Recruiter access required.");
    error.status = 403;
    throw error;
  }
  const settings = await getGlobalSettings();
  const freeLimit = Math.max(0, Number(settings.freeCvCreditsPerMonth ?? 10));
  const cost = Math.max(1, Number(settings.creditCostPerCandidate || 1));

  let source = "credit";
  let charged = false;

  if (Number(recruiter.freeCvCreditsUsed || 0) < freeLimit) {
    const updated = await User.findOneAndUpdate(
      { _id: recruiterId, role: "recruiter", freeCvCreditsUsed: { $lt: freeLimit } },
      { $inc: { freeCvCreditsUsed: 1, resumeFreeDownloadsUsed: 1 } },
      { new: true }
    );
    if (updated) {
      source = "free";
      charged = true;
    }
  }

  if (!charged) {
    const updated = await User.findOneAndUpdate(
      { _id: recruiterId, role: "recruiter", resumeCredits: { $gte: cost } },
      { $inc: { resumeCredits: -cost } },
      { new: true }
    );
    if (!updated) {
      const error = new Error(`Your free CV allowance is used. Please purchase CV credits to unlock more candidate CVs.`);
      error.status = 402;
      throw error;
    }
    source = "credit";
    charged = true;
  }

  try {
    const access = await CvAccess.create({
      recruiter: recruiterId,
      candidate: candidateId,
      source,
      creditCost: cost,
      viewedAt: new Date(),
    });
    return { access, charged, source };
  } catch (error) {
    // If a concurrent request created the access first, refund the charge and return it.
    if (error?.code === 11000) {
      if (source === "free") {
        await User.findByIdAndUpdate(recruiterId, { $inc: { freeCvCreditsUsed: -1, resumeFreeDownloadsUsed: -1 } });
      } else {
        await User.findByIdAndUpdate(recruiterId, { $inc: { resumeCredits: cost } });
      }
      const access = await CvAccess.findOne({ recruiter: recruiterId, candidate: candidateId });
      if (access && !access.viewedAt) {
        access.viewedAt = new Date();
        await access.save();
      }
      return { access, charged: false, source: access?.source || source };
    }
    // Refund on any other failure.
    if (source === "free") {
      await User.findByIdAndUpdate(recruiterId, { $inc: { freeCvCreditsUsed: -1, resumeFreeDownloadsUsed: -1 } });
    } else {
      await User.findByIdAndUpdate(recruiterId, { $inc: { resumeCredits: cost } });
    }
    throw error;
  }
}
