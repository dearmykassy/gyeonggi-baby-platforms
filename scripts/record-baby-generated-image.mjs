import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const jobId = args.get("--job");
const sourceFile = args.get("--source");
const callReference = args.get("--call-reference");
if (!jobId || !sourceFile || !callReference) {
  throw new Error("USAGE: --job <logicalAssetId> --source <file> --call-reference <actual-call-ref>");
}

const ROOT = process.cwd();
const CAMPAIGN_ROOT = path.join(ROOT, "artifacts", "image-campaign", "gyeonggi-baby-template11-v1");
const campaign = JSON.parse(await readFile(path.join(CAMPAIGN_ROOT, "campaign.v1.json"), "utf8"));
const entry = campaign.jobs.find((job) => job.logicalAssetId === jobId);
if (!entry) throw new Error(`UNKNOWN_JOB:${jobId}`);

const jobFile = path.join(CAMPAIGN_ROOT, "jobs", entry.siteKey, `${jobId}.json`);
const job = JSON.parse(await readFile(jobFile, "utf8"));
const prompt = await readFile(path.join(ROOT, job.promptPath));
const promptSha256 = createHash("sha256").update(prompt).digest("hex");
if (promptSha256 !== job.promptSha256) throw new Error(`PROMPT_SHA_MISMATCH:${jobId}`);

const sourceBuffer = await readFile(path.resolve(sourceFile));
const metadata = await sharp(sourceBuffer).metadata();
if (!metadata.width || !metadata.height || metadata.width < 1200 || metadata.height < 675) {
  throw new Error(`IMAGE_DIMENSIONS_TOO_SMALL:${jobId}:${metadata.width}x${metadata.height}`);
}
const ratio = metadata.width / metadata.height;
// Built-in image generation may return a 3:2 landscape master. Release crops
// that source to the 16:9 and mobile derivatives after root visual review.
if (ratio < 1.45 || ratio > 1.9) throw new Error(`IMAGE_RATIO_INVALID:${jobId}:${ratio}`);

const outputFile = path.join(ROOT, job.outputFile);
const receiptFile = path.join(ROOT, job.receiptFile);
try {
  await readFile(receiptFile);
  throw new Error(`IMMUTABLE_RECEIPT_EXISTS:${jobId}`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

await mkdir(path.dirname(outputFile), { recursive: true });
await mkdir(path.dirname(receiptFile), { recursive: true });
await copyFile(path.resolve(sourceFile), outputFile);

const outputSha256 = createHash("sha256").update(sourceBuffer).digest("hex");
const receipt = {
  schemaVersion: 1,
  campaignId: job.campaignId,
  logicalAssetId: jobId,
  siteKey: job.siteKey,
  exactPromptPath: job.promptPath,
  promptSha256,
  // Never persist a workstation path in publication authority. The copied
  // immutable campaign master is the deterministic repository source.
  sourceOutputPath: job.outputFile,
  actualCallReference: callReference,
  builtInImageGenCallCount: 1,
  outputFile: job.outputFile,
  outputSha256,
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
      noBedBathroomMachine: null,
      responsiveCropSafe: null,
    },
    notes: "",
  },
};
await writeFile(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ jobId, outputFile: job.outputFile, outputSha256, width: metadata.width, height: metadata.height }, null, 2));
