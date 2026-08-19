import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CAMPAIGN_ROOT = path.join(
  ROOT,
  "artifacts/image-campaign/gyeonggi-baby-template11-v1",
);
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
const manifest = JSON.parse(
  await readFile(path.join(CAMPAIGN_ROOT, "replacements/replacements.v1.json"), "utf8"),
);
const entry = manifest.attempts.find((attempt) => attempt.logicalAssetId === jobId);
if (!entry) throw new Error(`BABY_REPLACEMENT_REVIEW_UNKNOWN:${jobId}`);
const receiptPath = path.join(ROOT, entry.receiptFile);
const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
if (receipt.review.status !== "PENDING_ROOT_REVIEW") {
  throw new Error(`BABY_REPLACEMENT_REVIEW_FINAL:${jobId}:${receipt.review.status}`);
}
const criteria = Object.fromEntries(
  Object.keys(receipt.review.criteria).map((criterion) => [criterion, true]),
);
if (status === "REJECT") {
  if (!failedCriterion || !(failedCriterion in criteria)) {
    throw new Error(`BABY_REPLACEMENT_REJECT_CRITERION:${Object.keys(criteria).join(",")}`);
  }
  criteria[failedCriterion] = false;
}
receipt.review = { status, criteria, notes, reviewedAt: "2026-08-19" };
await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ jobId, status, notes }, null, 2));
