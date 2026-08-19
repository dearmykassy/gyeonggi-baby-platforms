import { createHash } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CAMPAIGN_ROOT = path.join(
  ROOT,
  "artifacts/image-campaign/gyeonggi-baby-template11-v1",
);
const CAMPAIGN_FILE = path.join(CAMPAIGN_ROOT, "campaign.v1.json");
const REPLACEMENTS_FILE = path.join(
  CAMPAIGN_ROOT,
  "replacements/replacements.v1.json",
);

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const apply = args.get("--apply") === "yes";

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

function assertRepositoryPath(value, label) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    path.isAbsolute(value) ||
    value.includes("\\") ||
    path.posix.normalize(value) !== value ||
    value === ".." ||
    value.startsWith("../")
  ) {
    throw new Error(`BABY_PUBLIC_AUTHORITY_PATH:${label}:${value}`);
  }
  const absolute = path.resolve(ROOT, value);
  if (absolute !== ROOT && !absolute.startsWith(`${ROOT}${path.sep}`)) {
    throw new Error(`BABY_PUBLIC_AUTHORITY_PATH_ESCAPE:${label}:${value}`);
  }
  return absolute;
}

async function readJsonDocument(file) {
  const bytes = await readFile(file);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) };
}

function versionOf(logicalAssetId) {
  const match = logicalAssetId.match(/-v(\d+)$/u);
  if (!match) throw new Error(`BABY_PUBLIC_AUTHORITY_VERSION:${logicalAssetId}`);
  return Number(match[1]);
}

function assertCallReference(value, logicalAssetId) {
  if (
    !/^(?:builtin:imagegen:exec-[0-9a-f-]+(?:\.png)?|imagegen:[^/\s]+\/exec-[0-9a-f-]+)$/u.test(
      value ?? "",
    )
  ) {
    throw new Error(`BABY_PUBLIC_AUTHORITY_CALL_REFERENCE:${logicalAssetId}`);
  }
}

async function verifyRawOutput(receipt) {
  const output = assertRepositoryPath(
    receipt.outputFile,
    `${receipt.logicalAssetId}:outputFile`,
  );
  const outputStat = await lstat(output);
  if (!outputStat.isFile() || outputStat.isSymbolicLink()) {
    throw new Error(`BABY_PUBLIC_AUTHORITY_RAW_FILE:${receipt.logicalAssetId}`);
  }
  if (sha256(await readFile(output)) !== receipt.outputSha256) {
    throw new Error(`BABY_PUBLIC_AUTHORITY_RAW_SHA:${receipt.logicalAssetId}`);
  }
}

function sanitizeReceipt(receipt, job) {
  if (
    receipt.logicalAssetId !== job.logicalAssetId ||
    receipt.siteKey !== job.siteKey ||
    receipt.exactPromptPath !== job.promptPath ||
    receipt.promptSha256 !== job.promptSha256 ||
    receipt.outputFile !== job.outputFile ||
    receipt.builtInImageGenCallCount !== 1 ||
    !/^[0-9a-f]{64}$/u.test(receipt.outputSha256 ?? "")
  ) {
    throw new Error(`BABY_PUBLIC_AUTHORITY_RECEIPT_CONTRACT:${job.logicalAssetId}`);
  }
  assertCallReference(receipt.actualCallReference, job.logicalAssetId);
  assertRepositoryPath(job.promptPath, `${job.logicalAssetId}:promptPath`);
  assertRepositoryPath(job.outputFile, `${job.logicalAssetId}:outputFile`);
  assertRepositoryPath(job.receiptFile, `${job.logicalAssetId}:receiptFile`);
  return {
    ...receipt,
    // The external generator path is machine-private and not authority. The
    // immutable copied master is the deterministic repository-relative source.
    sourceOutputPath: job.outputFile,
  };
}

const campaignDocument = await readJsonDocument(CAMPAIGN_FILE);
const replacementsDocument = await readJsonDocument(REPLACEMENTS_FILE);
const campaign = campaignDocument.value;
const replacements = replacementsDocument.value;
if (
  campaign.campaignId !== "gyeonggi-baby-template11-v1" ||
  campaign.jobs?.length !== 143 ||
  replacements.campaignId !== campaign.campaignId ||
  !Array.isArray(replacements.attempts)
) {
  throw new Error("BABY_PUBLIC_AUTHORITY_MANIFEST_CONTRACT");
}

const writes = new Map();
const attempts = new Map();
let sanitizedPaths = 0;
let reboundReferences = 0;

for (const entry of campaign.jobs) {
  const jobFile = path.join(
    CAMPAIGN_ROOT,
    "jobs",
    entry.siteKey,
    `${entry.logicalAssetId}.json`,
  );
  const jobDocument = await readJsonDocument(jobFile);
  const job = jobDocument.value;
  if (
    entry.logicalAssetId !== job.logicalAssetId ||
    entry.siteKey !== job.siteKey ||
    entry.promptSha256 !== job.promptSha256 ||
    entry.outputFile !== job.outputFile ||
    entry.receiptFile !== job.receiptFile ||
    job.builtInImageGenCallCountRequired !== 1
  ) {
    throw new Error(`BABY_PUBLIC_AUTHORITY_JOB_CONTRACT:${entry.logicalAssetId}`);
  }
  const prompt = await readFile(
    assertRepositoryPath(job.promptPath, `${job.logicalAssetId}:promptPath`),
  );
  if (sha256(prompt) !== job.promptSha256) {
    throw new Error(`BABY_PUBLIC_AUTHORITY_PROMPT_SHA:${job.logicalAssetId}`);
  }
  const receiptFile = assertRepositoryPath(
    job.receiptFile,
    `${job.logicalAssetId}:receiptFile`,
  );
  const receiptDocument = await readJsonDocument(receiptFile);
  const receipt = sanitizeReceipt(receiptDocument.value, job);
  await verifyRawOutput(receipt);
  const bytes = jsonBytes(receipt);
  if (!bytes.equals(receiptDocument.bytes)) {
    sanitizedPaths += 1;
    writes.set(receiptFile, bytes);
  }
  attempts.set(job.logicalAssetId, {
    receipt,
    oldReceiptSha256: sha256(receiptDocument.bytes),
    receiptSha256: sha256(bytes),
  });
}

const replacementEntries = [...replacements.attempts].sort(
  (left, right) =>
    versionOf(left.logicalAssetId) - versionOf(right.logicalAssetId) ||
    left.logicalAssetId.localeCompare(right.logicalAssetId),
);
const updatedEntries = new Map();
for (const entry of replacementEntries) {
  const source = attempts.get(entry.sourceAttemptId);
  if (!source || source.receipt.review?.status !== "REJECT") {
    throw new Error(`BABY_PUBLIC_AUTHORITY_SOURCE:${entry.logicalAssetId}`);
  }
  if (
    ![source.oldReceiptSha256, source.receiptSha256].includes(
      entry.sourceReceiptSha256,
    )
  ) {
    throw new Error(`BABY_PUBLIC_AUTHORITY_MANIFEST_SOURCE_SHA:${entry.logicalAssetId}`);
  }
  const jobFile = assertRepositoryPath(
    entry.jobFile,
    `${entry.logicalAssetId}:jobFile`,
  );
  const jobDocument = await readJsonDocument(jobFile);
  const job = {
    ...jobDocument.value,
    sourceReceiptSha256: source.receiptSha256,
    sourceRejectedOutputSha256: source.receipt.outputSha256,
  };
  if (
    job.logicalAssetId !== entry.logicalAssetId ||
    job.sourceAttemptId !== entry.sourceAttemptId ||
    job.stableAssetId !== entry.stableAssetId ||
    job.outputFile !== entry.outputFile ||
    job.receiptFile !== entry.receiptFile ||
    job.promptSha256 !== entry.promptSha256 ||
    ![source.oldReceiptSha256, source.receiptSha256].includes(
      jobDocument.value.sourceReceiptSha256,
    ) ||
    jobDocument.value.sourceRejectedOutputSha256 !== source.receipt.outputSha256
  ) {
    throw new Error(`BABY_PUBLIC_AUTHORITY_REPLACEMENT_JOB:${entry.logicalAssetId}`);
  }
  const prompt = await readFile(
    assertRepositoryPath(job.promptPath, `${job.logicalAssetId}:promptPath`),
  );
  if (sha256(prompt) !== job.promptSha256) {
    throw new Error(`BABY_PUBLIC_AUTHORITY_PROMPT_SHA:${job.logicalAssetId}`);
  }
  const receiptFile = assertRepositoryPath(
    job.receiptFile,
    `${job.logicalAssetId}:receiptFile`,
  );
  const receiptDocument = await readJsonDocument(receiptFile);
  if (
    ![source.oldReceiptSha256, source.receiptSha256].includes(
      receiptDocument.value.sourceReceiptSha256,
    ) ||
    receiptDocument.value.sourceRejectedOutputSha256 !== source.receipt.outputSha256
  ) {
    throw new Error(`BABY_PUBLIC_AUTHORITY_REPLACEMENT_RECEIPT:${entry.logicalAssetId}`);
  }
  const receipt = sanitizeReceipt(
    {
      ...receiptDocument.value,
      sourceReceiptSha256: source.receiptSha256,
      sourceRejectedOutputSha256: source.receipt.outputSha256,
    },
    job,
  );
  await verifyRawOutput(receipt);

  const jobBytes = jsonBytes(job);
  const receiptBytes = jsonBytes(receipt);
  if (!jobBytes.equals(jobDocument.bytes)) {
    reboundReferences += 1;
    writes.set(jobFile, jobBytes);
  }
  if (!receiptBytes.equals(receiptDocument.bytes)) {
    if (receipt.sourceOutputPath !== receiptDocument.value.sourceOutputPath) {
      sanitizedPaths += 1;
    }
    reboundReferences += 1;
    writes.set(receiptFile, receiptBytes);
  }
  const updatedEntry = {
    ...entry,
    sourceReceiptSha256: source.receiptSha256,
  };
  updatedEntries.set(entry.logicalAssetId, updatedEntry);
  attempts.set(job.logicalAssetId, {
    receipt,
    oldReceiptSha256: sha256(receiptDocument.bytes),
    receiptSha256: sha256(receiptBytes),
  });
}

const updatedManifest = {
  ...replacements,
  attempts: replacements.attempts.map(
    (entry) => updatedEntries.get(entry.logicalAssetId) ?? entry,
  ),
};
const updatedManifestBytes = jsonBytes(updatedManifest);
if (!updatedManifestBytes.equals(replacementsDocument.bytes)) {
  writes.set(REPLACEMENTS_FILE, updatedManifestBytes);
}

if (apply) {
  for (const [file, bytes] of writes) await writeFile(file, bytes);
}

const downstreamAuthority = [
  "artifacts/image-campaign/gyeonggi-baby-template11-v1/root-review/selection.v1.json",
  "artifacts/image-campaign/gyeonggi-baby-template11-v1/root-review/root-review.v1.json",
  "src/data/baby-image-release.v1.json",
];
const existingDownstream = [];
for (const file of downstreamAuthority) {
  try {
    await lstat(path.join(ROOT, file));
    existingDownstream.push(file);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
let publicReleaseDirectoryPresent = false;
try {
  await lstat(path.join(ROOT, "public/images/baby-template11"));
  publicReleaseDirectoryPresent = true;
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

console.log(
  JSON.stringify(
    {
      status: apply ? "APPLIED_DOWNSTREAM_REGEN_REQUIRED" : "DRY_RUN",
      campaignId: campaign.campaignId,
      baseAttempts: campaign.jobs.length,
      replacementAttempts: replacements.attempts.length,
      totalAttempts: attempts.size,
      sanitizedPaths,
      reboundReferences,
      filesChanged: writes.size,
      existingDownstreamAuthority: existingDownstream,
      downstreamRegenerationRequired: writes.size > 0 ? existingDownstream : [],
      publicReleaseDirectoryPresent,
      publicReleaseRegenerationRequired:
        writes.size > 0 && publicReleaseDirectoryPresent,
    },
    null,
    2,
  ),
);
