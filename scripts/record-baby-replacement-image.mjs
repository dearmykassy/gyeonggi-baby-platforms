import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

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
const sourceFile = args.get("--source");
const callReference = args.get("--call-reference");
if (!jobId || !sourceFile || !callReference) {
  throw new Error("USAGE: --job <replacement-id> --source <file> --call-reference <ref>");
}
const manifest = JSON.parse(
  await readFile(path.join(CAMPAIGN_ROOT, "replacements/replacements.v1.json"), "utf8"),
);
const entry = manifest.attempts.find((attempt) => attempt.logicalAssetId === jobId);
if (!entry) throw new Error(`BABY_REPLACEMENT_JOB_UNKNOWN:${jobId}`);
const job = JSON.parse(await readFile(path.join(ROOT, entry.jobFile), "utf8"));
const prompt = await readFile(path.join(ROOT, job.promptPath));
const promptSha256 = createHash("sha256").update(prompt).digest("hex");
if (promptSha256 !== job.promptSha256) {
  throw new Error(`BABY_REPLACEMENT_PROMPT_SHA:${jobId}`);
}
try {
  await readFile(path.join(ROOT, job.receiptFile));
  throw new Error(`BABY_REPLACEMENT_RECEIPT_EXISTS:${jobId}`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const source = await readFile(path.resolve(sourceFile));
const metadata = await sharp(source).metadata();
if (!metadata.width || !metadata.height || metadata.width < 1200 || metadata.height < 675) {
  throw new Error(`BABY_REPLACEMENT_DIMENSIONS:${jobId}`);
}
const ratio = metadata.width / metadata.height;
if (ratio < 1.45 || ratio > 1.9) throw new Error(`BABY_REPLACEMENT_RATIO:${jobId}`);
await mkdir(path.dirname(path.join(ROOT, job.outputFile)), { recursive: true });
await mkdir(path.dirname(path.join(ROOT, job.receiptFile)), { recursive: true });
await copyFile(path.resolve(sourceFile), path.join(ROOT, job.outputFile));
const receipt = {
  schemaVersion: 1,
  campaignId: job.campaignId,
  logicalAssetId: jobId,
  stableAssetId: job.stableAssetId,
  siteKey: job.siteKey,
  sourceAttemptId: job.sourceAttemptId,
  sourceReceiptSha256: job.sourceReceiptSha256,
  sourceRejectedOutputSha256: job.sourceRejectedOutputSha256,
  exactPromptPath: job.promptPath,
  promptSha256,
  // Never persist a workstation path in publication authority. The copied
  // immutable campaign master is the deterministic repository source.
  sourceOutputPath: job.outputFile,
  actualCallReference: callReference,
  builtInImageGenCallCount: 1,
  outputFile: job.outputFile,
  outputSha256: createHash("sha256").update(source).digest("hex"),
  width: metadata.width,
  height: metadata.height,
  format: metadata.format,
  review: {
    status: "PENDING_ROOT_REVIEW",
    criteria: {
      adultKoreanWoman: null,
      opaqueCompleteClothing: null,
      nonsexual: null,
      singlePerson: null,
      coherentReflectionIfPresent: null,
      normalAnatomy: null,
      noTextLogoWatermark: null,
      plainUnbrandedPhoneIfPresent: null,
      noBedBathroomMachine: null,
      responsiveCropSafe: null,
    },
    notes: "",
  },
};
await writeFile(path.join(ROOT, job.receiptFile), `${JSON.stringify(receipt, null, 2)}\n`, {
  flag: "wx",
});
console.log(JSON.stringify(receipt, null, 2));
