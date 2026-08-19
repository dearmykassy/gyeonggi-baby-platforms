import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { BABY_SITE_KEYS } from "../src/data/site-registry.ts";
import {
  getHeroAssignmentsForSite,
  getRegionImageSetForSite,
  getSiteImageAssetIds,
} from "../src/lib/images.ts";
import { getRegionNodesForSite } from "../src/lib/regions.ts";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const CAMPAIGN_ROOT = path.join(
  ROOT,
  "artifacts/image-campaign/gyeonggi-baby-template11-v1",
);
const SELECTION_FILE = path.join(CAMPAIGN_ROOT, "root-review/selection.v1.json");
const ROOT_REVIEW_FILE = path.join(
  CAMPAIGN_ROOT,
  "root-review/root-review.v1.json",
);
const RELEASE_FILE = path.join(ROOT, "src/data/baby-image-release.v1.json");
const PUBLIC_ROOT = path.join(ROOT, "public/images/baby-template11");
const RELEASE_SCRIPT = path.join(ROOT, "scripts/release-baby-images.mjs");

const releaseStarted = [
  SELECTION_FILE,
  ROOT_REVIEW_FILE,
  RELEASE_FILE,
  PUBLIC_ROOT,
].some(existsSync);
const FORCE_PORTABLE = process.env.BABY_IMAGE_PORTABLE === "1";
const REQUIRE_AUTHORING_RAW =
  process.env.BABY_IMAGE_REQUIRE_AUTHORING_RAW === "1";
const AUTHORING_RELEASE_INPUTS_PRESENT =
  existsSync(path.join(CAMPAIGN_ROOT, "generated")) &&
  existsSync(path.join(CAMPAIGN_ROOT, "root-review/sheets"));
if (FORCE_PORTABLE && REQUIRE_AUTHORING_RAW) {
  throw new Error("BABY_IMAGE_TEST_MODE_CONFLICT");
}
if (
  REQUIRE_AUTHORING_RAW &&
  releaseStarted &&
  !AUTHORING_RELEASE_INPUTS_PRESENT
) {
  throw new Error("BABY_IMAGE_RELEASE_AUTHORING_RAW_REQUIRED");
}
const RUN_AUTHORING_RELEASE_GATE =
  !FORCE_PORTABLE && AUTHORING_RELEASE_INPUTS_PRESENT;

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const DERIVATIVE_PROFILES = [
  { key: "desktop", width: 1600, height: 900 },
  { key: "tablet", width: 1200, height: 675 },
  { key: "mobile", width: 768, height: 600 },
];

async function readJsonBuffer(file) {
  const buffer = await readFile(file);
  return { buffer, json: JSON.parse(buffer.toString("utf8")) };
}

async function entryNames(directory) {
  return (await readdir(directory)).sort();
}

async function treeHashes(directory) {
  const result = {};
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const file = path.join(current, entry.name);
      const fileStat = await lstat(file);
      expect(fileStat.isSymbolicLink(), `release symlink: ${file}`).toBe(false);
      if (fileStat.isDirectory()) await visit(file);
      else result[path.relative(directory, file).split(path.sep).join("/")] = sha256(await readFile(file));
    }
  }
  await visit(directory);
  return result;
}

const releaseDescribe = releaseStarted ? describe : describe.skip;

releaseDescribe("baby image release gate", () => {
  it("binds selection, root visual approval, and release authority hashes", async () => {
    const selectionDocument = await readJsonBuffer(SELECTION_FILE);
    const reviewDocument = await readJsonBuffer(ROOT_REVIEW_FILE);
    const releaseDocument = await readJsonBuffer(RELEASE_FILE);
    const selection = selectionDocument.json;
    const review = reviewDocument.json;
    const release = releaseDocument.json;

    expect(selection).toMatchObject({
      schemaVersion: 1,
      campaignId: "gyeonggi-baby-template11-v1",
      status: "PENDING_ROOT_REVIEW",
      counts: { sites: 27, logicalAssets: 143, sheets: 27 },
    });
    expect(selection.selections).toHaveLength(143);
    expect(selection.sheets).toHaveLength(27);
    expect(new Set(selection.selections.map((item) => item.stableAssetId)).size).toBe(
      143,
    );
    expect(new Set(selection.selections.map((item) => item.logicalAssetId)).size).toBe(
      143,
    );
    expect(new Set(selection.selections.map((item) => item.outputSha256)).size).toBe(
      143,
    );
    expect(
      new Set(selection.selections.map((item) => item.actualCallReference)).size,
    ).toBe(143);

    for (const item of selection.selections) {
      expect(item.status, `${item.stableAssetId}: selected review`).toBe("ACCEPT");
      const receiptDocument = await readJsonBuffer(path.join(ROOT, item.receiptFile));
      expect(sha256(receiptDocument.buffer), `${item.stableAssetId}: receipt authority`).toBe(
        item.receiptSha256,
      );
      expect(receiptDocument.json.logicalAssetId).toBe(item.logicalAssetId);
      expect(receiptDocument.json.review?.status).toBe("ACCEPT");
      expect(receiptDocument.json.outputSha256).toBe(item.outputSha256);
      expect(receiptDocument.json.sourceOutputPath).toBe(item.outputFile);
      expect(path.isAbsolute(receiptDocument.json.sourceOutputPath)).toBe(false);
      expect(item.outputSha256).toMatch(/^[0-9a-f]{64}$/u);
      expect(
        sha256(await readFile(path.join(ROOT, receiptDocument.json.exactPromptPath))),
      ).toBe(
        item.promptSha256,
      );
      expect(item.lineage.filter((attempt) => attempt.status === "ACCEPT")).toHaveLength(
        1,
      );
      expect(item.lineage.at(-1)?.logicalAssetId).toBe(item.logicalAssetId);
    }

    expect(review).toMatchObject({
      schemaVersion: 1,
      campaignId: selection.campaignId,
      status: "ROOT_APPROVED",
      selectionFile: path.relative(ROOT, SELECTION_FILE),
      selectionSha256: sha256(selectionDocument.buffer),
      counts: selection.counts,
    });
    expect(review.notes?.trim().length).toBeGreaterThan(0);
    expect(Object.values(review.visualCriteria ?? {}).every(Boolean)).toBe(true);
    expect(review.sheetHashes).toHaveLength(27);
    expect(new Set(review.sheetHashes.map((entry) => entry.siteKey)).size).toBe(27);
    for (const sheet of selection.sheets) {
      expect(sheet.sha256).toMatch(/^[0-9a-f]{64}$/u);
      expect(review.sheetHashes).toContainEqual({
        siteKey: sheet.siteKey,
        sha256: sheet.sha256,
      });
    }

    expect(release).toMatchObject({
      schemaVersion: 1,
      campaignId: selection.campaignId,
      status: "ROOT_APPROVED_RELEASED",
      rootReviewFile: path.relative(ROOT, ROOT_REVIEW_FILE),
      rootReviewSha256: sha256(reviewDocument.buffer),
      counts: { sites: 27, masters: 143, derivatives: 429 },
    });
    expect(release.released).toHaveLength(143);
    const selectedByStable = new Map(
      selection.selections.map((item) => [item.stableAssetId, item]),
    );
    for (const item of release.released) {
      const selected = selectedByStable.get(item.stableAssetId);
      expect(selected, `${item.stableAssetId}: released selection`).toBeDefined();
      expect(item.selectedAttemptId).toBe(selected.logicalAssetId);
      expect(item.siteKey).toBe(selected.siteKey);
      expect(item.sourceSha256).toBe(selected.outputSha256);
    }
  });

  it("reconstructs release authority byte-identically from tracked public files", async () => {
    const selectionDocument = await readJsonBuffer(SELECTION_FILE);
    const reviewDocument = await readJsonBuffer(ROOT_REVIEW_FILE);
    const releaseDocument = await readJsonBuffer(RELEASE_FILE);
    const selection = selectionDocument.json;
    const review = reviewDocument.json;
    const released = [];

    expect(review.selectionSha256).toBe(sha256(selectionDocument.buffer));
    for (const item of selection.selections) {
      const assetRoot = path.join(PUBLIC_ROOT, item.siteKey, item.stableAssetId);
      const derivatives = [];
      for (const profile of DERIVATIVE_PROFILES) {
        const file = path.join(assetRoot, `${profile.key}.webp`);
        const buffer = await readFile(file);
        const metadata = await sharp(buffer).metadata();
        expect(
          { format: metadata.format, width: metadata.width, height: metadata.height },
          `${item.stableAssetId}:${profile.key}`,
        ).toEqual({ format: "webp", width: profile.width, height: profile.height });
        derivatives.push({
          key: profile.key,
          path: `/${path.relative(path.join(ROOT, "public"), file).split(path.sep).join("/")}`,
          width: profile.width,
          height: profile.height,
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
        rootReviewFile: path.relative(ROOT, ROOT_REVIEW_FILE),
        rootReviewSha256: sha256(reviewDocument.buffer),
        derivatives,
      };
      const provenanceFile = path.join(assetRoot, "provenance.v1.json");
      const provenanceBytes = await readFile(provenanceFile);
      const expectedProvenanceBytes = jsonBytes(provenance);
      expect(
        provenanceBytes.equals(expectedProvenanceBytes),
        `${item.stableAssetId}: canonical provenance`,
      ).toBe(true);
      released.push({
        stableAssetId: item.stableAssetId,
        selectedAttemptId: item.logicalAssetId,
        siteKey: item.siteKey,
        sourceSha256: item.outputSha256,
        provenanceFile: path.relative(ROOT, provenanceFile),
        provenanceSha256: sha256(expectedProvenanceBytes),
        derivatives,
      });
    }

    const expectedRelease = {
      schemaVersion: 1,
      campaignId: selection.campaignId,
      status: "ROOT_APPROVED_RELEASED",
      rootReviewFile: path.relative(ROOT, ROOT_REVIEW_FILE),
      rootReviewSha256: sha256(reviewDocument.buffer),
      counts: { sites: 27, masters: 143, derivatives: 429 },
      released,
    };
    expect(releaseDocument.buffer.equals(jsonBytes(expectedRelease))).toBe(true);
  });

  it("contains exactly 143 site-scoped masters and 429 unique responsive WebPs", async () => {
    const { buffer: reviewBuffer } = await readJsonBuffer(ROOT_REVIEW_FILE);
    const { json: selection } = await readJsonBuffer(SELECTION_FILE);
    const { json: release } = await readJsonBuffer(RELEASE_FILE);
    const expectedDimensions = {
      desktop: { width: 1600, height: 900 },
      tablet: { width: 1200, height: 675 },
      mobile: { width: 768, height: 600 },
    };
    const selectedByStable = new Map(
      selection.selections.map((item) => [item.stableAssetId, item]),
    );

    expect(await entryNames(PUBLIC_ROOT)).toEqual([...BABY_SITE_KEYS].sort());
    const derivativeHashes = new Set();
    const derivativePaths = new Set();
    const provenanceHashes = new Set();
    const releasedBySite = new Map(BABY_SITE_KEYS.map((siteKey) => [siteKey, []]));

    for (const item of release.released) {
      expect(getSiteImageAssetIds(item.siteKey)).toContain(item.stableAssetId);
      releasedBySite.get(item.siteKey).push(item.stableAssetId);
      const assetDirectory = path.join(PUBLIC_ROOT, item.siteKey, item.stableAssetId);
      expect(await entryNames(assetDirectory)).toEqual([
        "desktop.webp",
        "mobile.webp",
        "provenance.v1.json",
        "tablet.webp",
      ]);
      expect(item.derivatives.map((entry) => entry.key).sort()).toEqual([
        "desktop",
        "mobile",
        "tablet",
      ]);

      const provenanceDocument = await readJsonBuffer(
        path.join(ROOT, item.provenanceFile),
      );
      expect(sha256(provenanceDocument.buffer)).toBe(item.provenanceSha256);
      provenanceHashes.add(item.provenanceSha256);
      const selected = selectedByStable.get(item.stableAssetId);
      expect(provenanceDocument.json).toMatchObject({
        schemaVersion: 1,
        campaignId: release.campaignId,
        stableAssetId: item.stableAssetId,
        selectedAttemptId: item.selectedAttemptId,
        siteKey: item.siteKey,
        sourceFile: selected.outputFile,
        sourceSha256: item.sourceSha256,
        sourceReceiptFile: selected.receiptFile,
        sourceReceiptSha256: selected.receiptSha256,
        rootReviewFile: path.relative(ROOT, ROOT_REVIEW_FILE),
        rootReviewSha256: sha256(reviewBuffer),
      });
      expect(provenanceDocument.json.derivatives).toEqual(item.derivatives);

      for (const derivative of item.derivatives) {
        const expected = expectedDimensions[derivative.key];
        expect(expected, `${item.stableAssetId}: derivative key`).toBeDefined();
        expect(derivative).toMatchObject(expected);
        const expectedPath = `/images/baby-template11/${item.siteKey}/${item.stableAssetId}/${derivative.key}.webp`;
        expect(derivative.path).toBe(expectedPath);
        expect(derivativePaths.has(derivative.path), `duplicate path: ${derivative.path}`).toBe(
          false,
        );
        derivativePaths.add(derivative.path);
        const file = path.join(ROOT, "public", derivative.path.slice(1));
        const fileStat = await lstat(file);
        expect(fileStat.isFile()).toBe(true);
        expect(fileStat.isSymbolicLink()).toBe(false);
        const buffer = await readFile(file);
        expect(sha256(buffer)).toBe(derivative.sha256);
        expect(derivativeHashes.has(derivative.sha256), `duplicate bytes: ${derivative.path}`).toBe(
          false,
        );
        derivativeHashes.add(derivative.sha256);
        const metadata = await sharp(buffer).metadata();
        expect(metadata.format).toBe("webp");
        expect({ width: metadata.width, height: metadata.height }).toEqual(expected);
      }
    }

    expect(provenanceHashes.size).toBe(143);
    expect(derivativePaths.size).toBe(429);
    expect(derivativeHashes.size).toBe(429);
    for (const siteKey of BABY_SITE_KEYS) {
      const expectedAssets = [...getSiteImageAssetIds(siteKey)].sort();
      expect((releasedBySite.get(siteKey) ?? []).sort()).toEqual(expectedAssets);
      expect(await entryNames(path.join(PUBLIC_ROOT, siteKey))).toEqual(
        expectedAssets,
      );
    }
    const publicFiles = await treeHashes(PUBLIC_ROOT);
    expect(Object.keys(publicFiles)).toHaveLength(572);
  });

  it("keeps runtime assignment within release, max-six, parent-child, and sibling contracts", async () => {
    const { json: release } = await readJsonBuffer(RELEASE_FILE);
    const releasedPaths = new Set(
      release.released.flatMap((item) => item.derivatives.map((entry) => entry.path)),
    );
    let routeCount = 0;

    for (const siteKey of BABY_SITE_KEYS) {
      const runtimeAssets = getSiteImageAssetIds(siteKey);
      const releasedAssets = release.released
        .filter((item) => item.siteKey === siteKey)
        .map((item) => item.stableAssetId)
        .sort();
      expect(releasedAssets).toEqual([...runtimeAssets].sort());

      const nodes = getRegionNodesForSite(siteKey);
      const assignments = getHeroAssignmentsForSite(siteKey);
      expect(assignments).toHaveLength(nodes.length);
      expect(new Set(assignments.map((entry) => entry.path)).size).toBe(nodes.length);
      const byPath = new Map(assignments.map((entry) => [entry.path, entry]));
      const previousSibling = new Map();
      const usage = new Map(runtimeAssets.map((assetId) => [assetId, 0]));

      for (const assignment of assignments) {
        expect(runtimeAssets).toContain(assignment.assetId);
        usage.set(assignment.assetId, (usage.get(assignment.assetId) ?? 0) + 1);
        if (assignment.parentPath) {
          expect(assignment.assetId).not.toBe(
            byPath.get(assignment.parentPath)?.assetId,
          );
        }
        const siblingGroup = assignment.parentPath ?? "__root__";
        expect(assignment.assetId).not.toBe(previousSibling.get(siblingGroup));
        previousSibling.set(siblingGroup, assignment.assetId);

        const imageSet = getRegionImageSetForSite(siteKey, assignment.path);
        const slots = [
          imageSet.hero,
          imageSet.hero2,
          imageSet.bodyA,
          imageSet.bodyB,
          imageSet.closing,
        ];
        expect(new Set(slots.map((slot) => slot.desktop)).size).toBe(5);
        for (const slot of slots) {
          expect(releasedPaths).toContain(slot.desktop);
          expect(releasedPaths).toContain(slot.tablet);
          expect(releasedPaths).toContain(slot.mobile);
        }
      }
      expect(Math.max(...usage.values())).toBeLessThanOrEqual(6);
      routeCount += assignments.length;
    }
    expect(routeCount).toBe(455);
  });

  it.skipIf(!RUN_AUTHORING_RELEASE_GATE)(
    "re-runs the release in isolation with byte-identical output",
    async () => {
      const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "baby-release-gate-"));
      try {
        await symlink(path.join(ROOT, "artifacts"), path.join(temporaryRoot, "artifacts"), "dir");
        await mkdir(path.join(temporaryRoot, "src/data"), { recursive: true });
        await execFileAsync(process.execPath, [RELEASE_SCRIPT], {
          cwd: temporaryRoot,
          maxBuffer: 10 * 1024 * 1024,
          timeout: 10 * 60 * 1000,
        });
        expect(
          sha256(await readFile(path.join(temporaryRoot, "src/data/baby-image-release.v1.json"))),
        ).toBe(sha256(await readFile(RELEASE_FILE)));
        expect(
          await treeHashes(path.join(temporaryRoot, "public/images/baby-template11")),
        ).toEqual(await treeHashes(PUBLIC_ROOT));
      } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
      }
    },
    10 * 60 * 1000,
  );
});
