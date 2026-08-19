import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CAMPAIGN_ROOT = path.join(
  ROOT,
  "artifacts/image-campaign/gyeonggi-baby-template11-v1",
);
const MANIFEST_FILE = path.join(
  CAMPAIGN_ROOT,
  "replacements/replacements.v1.json",
);
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const sourceId = args.get("--source");
const version = Number(args.get("--version"));
const correction = args.get("--correction")?.trim();
if (!sourceId || !Number.isInteger(version) || version < 2 || !correction) {
  throw new Error(
    "USAGE: --source <rejected-id> --version <2+> --correction <exact correction>",
  );
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
async function readOptionalJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

const campaign = JSON.parse(
  await readFile(path.join(CAMPAIGN_ROOT, "campaign.v1.json"), "utf8"),
);
const manifest = await readOptionalJson(MANIFEST_FILE, {
  schemaVersion: 1,
  campaignId: campaign.campaignId,
  attempts: [],
});
const original = campaign.jobs.find((job) => job.logicalAssetId === sourceId);
const previousReplacement = manifest.attempts.find(
  (attempt) => attempt.logicalAssetId === sourceId,
);
const sourceJobFile = original
  ? path.join(CAMPAIGN_ROOT, "jobs", original.siteKey, `${sourceId}.json`)
  : previousReplacement
    ? path.join(ROOT, previousReplacement.jobFile)
    : null;
const sourceReceiptFile = original
  ? path.join(ROOT, original.receiptFile)
  : previousReplacement
    ? path.join(ROOT, previousReplacement.receiptFile)
    : null;
if (!sourceJobFile || !sourceReceiptFile) {
  throw new Error(`BABY_REPLACEMENT_SOURCE_UNKNOWN:${sourceId}`);
}
const sourceJob = JSON.parse(await readFile(sourceJobFile, "utf8"));
const sourceReceiptBuffer = await readFile(sourceReceiptFile);
const sourceReceipt = JSON.parse(sourceReceiptBuffer.toString("utf8"));
if (sourceReceipt.review?.status !== "REJECT") {
  throw new Error(`BABY_REPLACEMENT_SOURCE_NOT_REJECTED:${sourceId}`);
}

const baseId = sourceId.replace(/-v\d+$/u, "");
const logicalAssetId = `${baseId}-v${version}`;
if (logicalAssetId === sourceId || !sourceId.startsWith(baseId)) {
  throw new Error(`BABY_REPLACEMENT_VERSION_INVALID:${sourceId}:${version}`);
}
if (
  campaign.jobs.some((job) => job.logicalAssetId === logicalAssetId) ||
  manifest.attempts.some((attempt) => attempt.logicalAssetId === logicalAssetId)
) {
  throw new Error(`BABY_REPLACEMENT_ALREADY_EXISTS:${logicalAssetId}`);
}

const sourcePrompt = await readFile(path.join(ROOT, sourceJob.promptPath), "utf8");
const prompt = `${sourcePrompt.trim()}\nReplacement correction (mandatory): ${correction}\nThis is a fresh independent candidate for the same logical asset. Do not reproduce the rejected defect.\n`;
const versionRoot = path.join(
  "artifacts/image-campaign/gyeonggi-baby-template11-v1/replacements",
  `v${version}`,
);
const promptPath = path.join(versionRoot, "prompts", sourceJob.siteKey, `${logicalAssetId}.txt`);
const jobFile = path.join(versionRoot, "jobs", sourceJob.siteKey, `${logicalAssetId}.json`);
const outputFile = path.join(
  versionRoot,
  "generated",
  sourceJob.siteKey,
  `${logicalAssetId}.png`,
);
const receiptFile = path.join(
  versionRoot,
  "receipts",
  sourceJob.siteKey,
  `${logicalAssetId}.json`,
);
const job = {
  schemaVersion: 1,
  campaignId: campaign.campaignId,
  logicalAssetId,
  stableAssetId: baseId,
  siteKey: sourceJob.siteKey,
  sourceAttemptId: sourceId,
  sourceReceiptSha256: sha256(sourceReceiptBuffer),
  sourceRejectedOutputSha256: sourceReceipt.outputSha256,
  promptPath,
  promptSha256: sha256(prompt),
  correction,
  outputFile,
  receiptFile,
  builtInImageGenCallCountRequired: 1,
  reviewStatus: "PENDING_ROOT_REVIEW",
};
await mkdir(path.dirname(path.join(ROOT, promptPath)), { recursive: true });
await mkdir(path.dirname(path.join(ROOT, jobFile)), { recursive: true });
await writeFile(path.join(ROOT, promptPath), prompt, { flag: "wx" });
await writeFile(path.join(ROOT, jobFile), `${JSON.stringify(job, null, 2)}\n`, {
  flag: "wx",
});
manifest.attempts.push({
  logicalAssetId,
  stableAssetId: baseId,
  siteKey: sourceJob.siteKey,
  sourceAttemptId: sourceId,
  sourceReceiptSha256: job.sourceReceiptSha256,
  promptSha256: job.promptSha256,
  jobFile,
  outputFile,
  receiptFile,
});
manifest.attempts.sort((left, right) =>
  left.logicalAssetId.localeCompare(right.logicalAssetId),
);
await mkdir(path.dirname(MANIFEST_FILE), { recursive: true });
await writeFile(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(job, null, 2));
