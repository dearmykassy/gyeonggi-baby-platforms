import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const jobId = args.get("--job");
const status = args.get("--status");
const notes = args.get("--notes") ?? "";
const failedCriterion = args.get("--failed-criterion");
if (!jobId || !["ACCEPT", "REJECT"].includes(status)) {
  throw new Error("USAGE: --job <id> --status <ACCEPT|REJECT> --notes <text>");
}

const ROOT = process.cwd();
const campaignRoot = path.join(ROOT, "artifacts", "image-campaign", "gyeonggi-baby-template11-v1");
const campaign = JSON.parse(await readFile(path.join(campaignRoot, "campaign.v1.json"), "utf8"));
const entry = campaign.jobs.find((job) => job.logicalAssetId === jobId);
if (!entry) throw new Error(`UNKNOWN_JOB:${jobId}`);
const receiptFile = path.join(ROOT, entry.receiptFile);
const receipt = JSON.parse(await readFile(receiptFile, "utf8"));
if (receipt.review.status !== "PENDING_ROOT_REVIEW") {
  throw new Error(`REVIEW_ALREADY_FINAL:${jobId}:${receipt.review.status}`);
}
const accepted = status === "ACCEPT";
const criteria = {
  adultKoreanWoman: true,
  opaqueCompleteClothing: true,
  nonsexual: true,
  singlePerson: true,
  coherentReflectionIfPresent: true,
  normalAnatomy: true,
  noTextLogoWatermark: true,
  plainUnbrandedPhoneIfPresent: true,
  noBedBathroomMachine: true,
  responsiveCropSafe: true,
};
if (!accepted) {
  if (!failedCriterion || !(failedCriterion in criteria)) {
    throw new Error(`REJECT_REQUIRES_FAILED_CRITERION:${Object.keys(criteria).join(",")}`);
  }
  criteria[failedCriterion] = false;
}
receipt.review = {
  status,
  criteria,
  notes,
  reviewedAt: "2026-08-19",
};
await writeFile(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ jobId, status, notes }, null, 2));
