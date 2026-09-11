import PlatformSetting from "../models/PlatformSetting.js";
import CvPackage from "../models/CvPackage.js";

export default async function bootstrapDefaults() {
  await PlatformSetting.updateOne(
    { key: "global" },
    { $setOnInsert: { key: "global", freeCvCreditsPerMonth: 10, creditCostPerCandidate: 1, commissionPercent: 0, currency: "INR", platformName: "Jobify", features: { cvSearch: true, cvDownload: true, recruiterContact: true, payments: true } } },
    { upsert: true }
  );

  const count = await CvPackage.countDocuments();
  if (count === 0) {
    await CvPackage.insertMany([
      { name: "Starter", description: "A small top-up for occasional candidate sourcing.", credits: 10, price: 299, currency: "INR", sortOrder: 1 },
      { name: "Growth", description: "More CV unlocks for active recruitment campaigns.", credits: 30, price: 799, currency: "INR", sortOrder: 2 },
      { name: "Professional", description: "High-volume candidate sourcing credits.", credits: 75, price: 1499, currency: "INR", sortOrder: 3 },
    ]);
  }
}
