import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const CAMPAIGN_ROOT = path.join(
  ROOT,
  "artifacts/image-campaign/gyeonggi-baby-template11-v1",
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const selectionFile = path.join(CAMPAIGN_ROOT, "root-review/selection.v1.json");
const reviewFile = path.join(CAMPAIGN_ROOT, "root-review/root-review.v1.json");
const selectionBuffer = await readFile(selectionFile);
const reviewBuffer = await readFile(reviewFile);
const selection = JSON.parse(selectionBuffer.toString("utf8"));
const review = JSON.parse(reviewBuffer.toString("utf8"));
if (
  review.status !== "ROOT_APPROVED" ||
  review.selectionSha256 !== sha256(selectionBuffer) ||
  selection.selections.length !== 143
) {
  throw new Error("BABY_RELEASE_ROOT_AUTHORITY_INVALID");
}

const publicRoot = path.join(ROOT, "public/images/baby-template11");
await rm(publicRoot, { recursive: true, force: true });
const released = [];
for (const item of selection.selections) {
  const sourcePath = path.join(ROOT, item.outputFile);
  const source = await readFile(sourcePath);
  if (sha256(source) !== item.outputSha256) {
    throw new Error(`BABY_RELEASE_SOURCE_SHA:${item.stableAssetId}`);
  }
  const assetRoot = path.join(publicRoot, item.siteKey, item.stableAssetId);
  await mkdir(assetRoot, { recursive: true });
  const derivatives = [
    { key: "desktop", width: 1600, height: 900 },
    { key: "tablet", width: 1200, height: 675 },
    { key: "mobile", width: 768, height: 600 },
  ];
  const derivativeReceipts = [];
  for (const derivative of derivatives) {
    const file = path.join(assetRoot, `${derivative.key}.webp`);
    await sharp(source)
      .resize(derivative.width, derivative.height, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 84, effort: 5 })
      .toFile(file);
    const buffer = await readFile(file);
    derivativeReceipts.push({
      key: derivative.key,
      path: `/${path.relative(path.join(ROOT, "public"), file).split(path.sep).join("/")}`,
      width: derivative.width,
      height: derivative.height,
      sha256: sha256(buffer),
    });
  }
  const provenance = {
    schemaVersion: 1,
    campaignId: selection.campaignId,
    stableAssetId: item.stableAssetId,
    selectedAttemptId: item.logicalAssetId,
    siteKey: item.siteKey,
    sourceFile: item.outputFile,
    sourceSha256: item.outputSha256,
    sourceReceiptFile: item.receiptFile,
    sourceReceiptSha256: item.receiptSha256,
    rootReviewFile: path.relative(ROOT, reviewFile),
    rootReviewSha256: sha256(reviewBuffer),
    derivatives: derivativeReceipts,
  };
  const provenanceFile = path.join(assetRoot, "provenance.v1.json");
  await writeFile(provenanceFile, `${JSON.stringify(provenance, null, 2)}\n`);
  released.push({
    stableAssetId: item.stableAssetId,
    selectedAttemptId: item.logicalAssetId,
    siteKey: item.siteKey,
    sourceSha256: item.outputSha256,
    provenanceFile: path.relative(ROOT, provenanceFile),
    provenanceSha256: sha256(await readFile(provenanceFile)),
    derivatives: derivativeReceipts,
  });
}
if (
  released.length !== 143 ||
  new Set(released.flatMap((item) => item.derivatives.map((entry) => entry.sha256))).size !== 429
) {
  throw new Error(`BABY_RELEASE_COUNT_OR_COLLISION:${released.length}`);
}
const manifest = {
  schemaVersion: 1,
  campaignId: selection.campaignId,
  status: "ROOT_APPROVED_RELEASED",
  rootReviewFile: path.relative(ROOT, reviewFile),
  rootReviewSha256: sha256(reviewBuffer),
  counts: { sites: 27, masters: 143, derivatives: 429 },
  released,
};
const manifestFile = path.join(ROOT, "src/data/baby-image-release.v1.json");
await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      status: manifest.status,
      manifestFile,
      sha256: sha256(await readFile(manifestFile)),
      counts: manifest.counts,
    },
    null,
    2,
  ),
);
