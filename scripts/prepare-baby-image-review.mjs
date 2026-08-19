import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const CAMPAIGN_ROOT = path.join(
  ROOT,
  "artifacts/image-campaign/gyeonggi-baby-template11-v1",
);
const REVIEW_ROOT = path.join(CAMPAIGN_ROOT, "root-review");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const campaign = JSON.parse(
  await readFile(path.join(CAMPAIGN_ROOT, "campaign.v1.json"), "utf8"),
);
let replacements = { attempts: [] };
try {
  replacements = JSON.parse(
    await readFile(
      path.join(CAMPAIGN_ROOT, "replacements/replacements.v1.json"),
      "utf8",
    ),
  );
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

async function loadCandidate(entry, version, receiptFile, outputFile, promptSha256) {
  const receiptBuffer = await readFile(path.join(ROOT, receiptFile));
  const receipt = JSON.parse(receiptBuffer.toString("utf8"));
  const output = await readFile(path.join(ROOT, outputFile));
  if (
    receipt.logicalAssetId !== entry.logicalAssetId ||
    receipt.promptSha256 !== promptSha256 ||
    receipt.outputSha256 !== sha256(output) ||
    receipt.builtInImageGenCallCount !== 1 ||
    !["ACCEPT", "REJECT"].includes(receipt.review?.status)
  ) {
    throw new Error(`BABY_REVIEW_CANDIDATE_INTEGRITY:${entry.logicalAssetId}`);
  }
  return {
    logicalAssetId: entry.logicalAssetId,
    stableAssetId: entry.logicalAssetId.replace(/-v\d+$/u, ""),
    siteKey: entry.siteKey,
    version,
    receiptFile,
    receiptSha256: sha256(receiptBuffer),
    outputFile,
    outputSha256: receipt.outputSha256,
    promptSha256,
    actualCallReference: receipt.actualCallReference,
    status: receipt.review.status,
    width: receipt.width,
    height: receipt.height,
  };
}

const candidatesByStable = new Map();
for (const entry of campaign.jobs) {
  const version = Number(entry.logicalAssetId.match(/-v(\d+)$/u)?.[1]);
  const candidate = await loadCandidate(
    entry,
    version,
    entry.receiptFile,
    entry.outputFile,
    entry.promptSha256,
  );
  candidatesByStable.set(candidate.stableAssetId, [candidate]);
}
for (const entry of replacements.attempts) {
  const version = Number(entry.logicalAssetId.match(/-v(\d+)$/u)?.[1]);
  const candidate = await loadCandidate(
    entry,
    version,
    entry.receiptFile,
    entry.outputFile,
    entry.promptSha256,
  );
  const values = candidatesByStable.get(candidate.stableAssetId);
  if (!values) throw new Error(`BABY_REVIEW_REPLACEMENT_ORPHAN:${entry.logicalAssetId}`);
  values.push(candidate);
}

const selections = [];
for (const [stableAssetId, candidates] of candidatesByStable) {
  const accepted = candidates
    .filter((candidate) => candidate.status === "ACCEPT")
    .sort((left, right) => right.version - left.version);
  if (!accepted[0]) {
    throw new Error(`BABY_REVIEW_NO_ACCEPTED_CANDIDATE:${stableAssetId}`);
  }
  selections.push({
    ...accepted[0],
    lineage: candidates
      .sort((left, right) => left.version - right.version)
      .map((candidate) => ({
        logicalAssetId: candidate.logicalAssetId,
        version: candidate.version,
        status: candidate.status,
        outputSha256: candidate.outputSha256,
        receiptSha256: candidate.receiptSha256,
      })),
  });
}
selections.sort((left, right) => left.stableAssetId.localeCompare(right.stableAssetId));
if (
  selections.length !== 143 ||
  new Set(selections.map((item) => item.outputSha256)).size !== 143 ||
  new Set(selections.map((item) => item.actualCallReference)).size !== 143
) {
  throw new Error(`BABY_REVIEW_SELECTION_CONTRACT:${selections.length}`);
}

await rm(REVIEW_ROOT, { recursive: true, force: true });
await mkdir(path.join(REVIEW_ROOT, "sheets"), { recursive: true });
const siteKeys = [...new Set(selections.map((selection) => selection.siteKey))];
const sheets = [];
for (const siteKey of siteKeys) {
  const assets = selections.filter((selection) => selection.siteKey === siteKey);
  const rowHeight = 230;
  const width = 960;
  const canvas = sharp({
    create: {
      width,
      height: assets.length * rowHeight + 42,
      channels: 3,
      background: "#f7f7f7",
    },
  });
  const composites = [];
  composites.push({
    input: Buffer.from(
      `<svg width="${width}" height="42"><rect width="100%" height="100%" fill="#20242c"/><text x="18" y="28" font-family="Arial,sans-serif" font-size="20" fill="white">${siteKey} · source / desktop / mobile</text></svg>`,
    ),
    top: 0,
    left: 0,
  });
  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    const input = path.join(ROOT, asset.outputFile);
    const [source, desktop, mobile] = await Promise.all([
      sharp(input).resize(300, 200, { fit: "cover", position: "centre" }).png().toBuffer(),
      sharp(input).resize(360, 200, { fit: "cover", position: "centre" }).png().toBuffer(),
      sharp(input).resize(240, 200, { fit: "cover", position: "centre" }).png().toBuffer(),
    ]);
    const top = 42 + index * rowHeight;
    composites.push(
      { input: source, top, left: 0 },
      { input: desktop, top, left: 310 },
      { input: mobile, top, left: 680 },
      {
        input: Buffer.from(
          `<svg width="960" height="30"><rect width="100%" height="100%" fill="#ffffff"/><text x="12" y="21" font-family="Arial,sans-serif" font-size="15" fill="#20242c">${asset.stableAssetId} ← ${asset.logicalAssetId}</text></svg>`,
        ),
        top: top + 200,
        left: 0,
      },
    );
  }
  const sheetFile = path.join(
    "artifacts/image-campaign/gyeonggi-baby-template11-v1/root-review/sheets",
    `${siteKey}.png`,
  );
  await canvas.composite(composites).png().toFile(path.join(ROOT, sheetFile));
  const sheet = await readFile(path.join(ROOT, sheetFile));
  sheets.push({ siteKey, assetCount: assets.length, sheetFile, sha256: sha256(sheet) });
}

const selection = {
  schemaVersion: 1,
  campaignId: campaign.campaignId,
  status: "PENDING_ROOT_REVIEW",
  counts: {
    sites: siteKeys.length,
    logicalAssets: selections.length,
    sheets: sheets.length,
  },
  selections,
  sheets,
};
const selectionFile = path.join(REVIEW_ROOT, "selection.v1.json");
await writeFile(selectionFile, `${JSON.stringify(selection, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      status: selection.status,
      selectionFile,
      selectionSha256: sha256(await readFile(selectionFile)),
      counts: selection.counts,
    },
    null,
    2,
  ),
);
