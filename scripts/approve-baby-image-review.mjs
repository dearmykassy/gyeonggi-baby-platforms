import { createHash } from "node:crypto";
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
if (args.get("--approve") !== "ROOT_APPROVED") {
  throw new Error("USAGE: --approve ROOT_APPROVED --notes <root visual QA notes>");
}
const notes = args.get("--notes")?.trim();
if (!notes) throw new Error("BABY_ROOT_REVIEW_NOTES_REQUIRED");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const selectionFile = path.join(CAMPAIGN_ROOT, "root-review/selection.v1.json");
const selectionBuffer = await readFile(selectionFile);
const selection = JSON.parse(selectionBuffer.toString("utf8"));
if (
  selection.status !== "PENDING_ROOT_REVIEW" ||
  selection.counts?.sites !== 27 ||
  selection.counts?.logicalAssets !== 143 ||
  selection.counts?.sheets !== 27
) {
  throw new Error("BABY_ROOT_REVIEW_SELECTION_INVALID");
}
for (const sheet of selection.sheets) {
  const buffer = await readFile(path.join(ROOT, sheet.sheetFile));
  if (sha256(buffer) !== sheet.sha256) {
    throw new Error(`BABY_ROOT_REVIEW_SHEET_SHA:${sheet.siteKey}`);
  }
}
const receipt = {
  schemaVersion: 1,
  campaignId: selection.campaignId,
  status: "ROOT_APPROVED",
  selectionFile: path.relative(ROOT, selectionFile),
  selectionSha256: sha256(selectionBuffer),
  counts: selection.counts,
  sheetHashes: selection.sheets.map(({ siteKey, sha256: hash }) => ({
    siteKey,
    sha256: hash,
  })),
  visualCriteria: {
    adultKoreanWoman: true,
    opaqueCompleteClothing: true,
    nonsexual: true,
    singlePerson: true,
    coherentReflectionIfPresent: true,
    normalAnatomy: true,
    noTextLogoWatermark: true,
    plainUnbrandedPhoneIfPresent: true,
    noBedBathroomMachine: true,
    desktopCropSafe: true,
    mobileCropSafe: true,
  },
  notes,
  reviewedAt: "2026-08-19",
};
const output = path.join(CAMPAIGN_ROOT, "root-review/root-review.v1.json");
await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ output, sha256: sha256(await readFile(output)) }, null, 2));
