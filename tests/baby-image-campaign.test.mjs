import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { BABY_SITE_KEYS } from "../src/data/site-registry.ts";
import { getSiteImageAssetIds } from "../src/lib/images.ts";

const ROOT = process.cwd();
const CAMPAIGN_ROOT = path.join(
  ROOT,
  "artifacts/image-campaign/gyeonggi-baby-template11-v1",
);
const CAMPAIGN_FILE = path.join(CAMPAIGN_ROOT, "campaign.v1.json");
const REPLACEMENTS_FILE = path.join(
  CAMPAIGN_ROOT,
  "replacements/replacements.v1.json",
);
const FORCE_PORTABLE = process.env.BABY_IMAGE_PORTABLE === "1";
const REQUIRE_AUTHORING_RAW =
  process.env.BABY_IMAGE_REQUIRE_AUTHORING_RAW === "1";
const AUTHORING_RAW_PRESENT = existsSync(path.join(CAMPAIGN_ROOT, "generated"));
if (FORCE_PORTABLE && REQUIRE_AUTHORING_RAW) {
  throw new Error("BABY_IMAGE_TEST_MODE_CONFLICT");
}
if (REQUIRE_AUTHORING_RAW && !AUTHORING_RAW_PRESENT) {
  throw new Error("BABY_IMAGE_AUTHORING_RAW_REQUIRED");
}
const RUN_AUTHORING_RAW_GATE = !FORCE_PORTABLE && AUTHORING_RAW_PRESENT;

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(file) : [file];
    }),
  );
  return nested.flat();
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function stableAssetId(logicalAssetId) {
  return logicalAssetId.replace(/-v\d+$/u, "");
}

function versionOf(logicalAssetId) {
  const match = logicalAssetId.match(/-v(\d+)$/u);
  if (!match) throw new Error(`BABY_TEST_BAD_ATTEMPT_ID:${logicalAssetId}`);
  return Number(match[1]);
}

async function loadAttempt({
  manifestEntry,
  jobFile,
  expectedStableAssetId,
  expectedVersion,
}) {
  const jobBuffer = await readFile(jobFile);
  const job = JSON.parse(jobBuffer.toString("utf8"));
  const receiptFile = path.join(ROOT, manifestEntry.receiptFile);
  const receiptBuffer = await readFile(receiptFile);
  const receipt = JSON.parse(receiptBuffer.toString("utf8"));
  const promptFile = path.join(ROOT, job.promptPath);
  const promptBuffer = await readFile(promptFile);
  const id = manifestEntry.logicalAssetId;

  expect(job.schemaVersion, `${id}: job schema`).toBe(1);
  expect(receipt.schemaVersion, `${id}: receipt schema`).toBe(1);
  expect(job.campaignId, `${id}: job campaign`).toBe("gyeonggi-baby-template11-v1");
  expect(receipt.campaignId, `${id}: receipt campaign`).toBe(
    "gyeonggi-baby-template11-v1",
  );
  expect(job.logicalAssetId, `${id}: job id`).toBe(id);
  expect(receipt.logicalAssetId, `${id}: receipt id`).toBe(id);
  expect(job.siteKey, `${id}: job site`).toBe(manifestEntry.siteKey);
  expect(receipt.siteKey, `${id}: receipt site`).toBe(manifestEntry.siteKey);
  expect(stableAssetId(id), `${id}: stable id`).toBe(expectedStableAssetId);
  expect(versionOf(id), `${id}: version`).toBe(expectedVersion);
  expect(job.builtInImageGenCallCountRequired, `${id}: required calls`).toBe(1);
  expect(receipt.builtInImageGenCallCount, `${id}: actual calls`).toBe(1);
  expect(receipt.actualCallReference, `${id}: call reference`).toMatch(
    /^(?:builtin:imagegen:exec-[0-9a-f-]+(?:\.png)?|imagegen:[^/\s]+\/exec-[0-9a-f-]+)$/u,
  );
  expect(job.promptSha256, `${id}: job prompt hash`).toBe(
    manifestEntry.promptSha256,
  );
  expect(receipt.promptSha256, `${id}: receipt prompt hash`).toBe(
    manifestEntry.promptSha256,
  );
  expect(receipt.exactPromptPath, `${id}: prompt path`).toBe(job.promptPath);
  expect(sha256(promptBuffer), `${id}: prompt bytes`).toBe(
    manifestEntry.promptSha256,
  );
  expect(job.outputFile, `${id}: job output path`).toBe(manifestEntry.outputFile);
  expect(receipt.outputFile, `${id}: receipt output path`).toBe(
    manifestEntry.outputFile,
  );
  expect(receipt.sourceOutputPath, `${id}: public source path`).toBe(
    manifestEntry.outputFile,
  );
  expect(path.isAbsolute(receipt.sourceOutputPath), `${id}: no absolute path`).toBe(
    false,
  );
  expect(
    path.posix.normalize(receipt.sourceOutputPath),
    `${id}: normalized repository path`,
  ).toBe(receipt.sourceOutputPath);
  expect(job.receiptFile, `${id}: job receipt path`).toBe(
    manifestEntry.receiptFile,
  );
  expect(receipt.outputSha256, `${id}: output hash authority`).toMatch(
    /^[0-9a-f]{64}$/u,
  );
  expect(receipt.format, `${id}: output format`).toBe("png");
  expect(receipt.width, `${id}: output width`).toBeGreaterThan(0);
  expect(receipt.height, `${id}: output height`).toBeGreaterThan(0);
  expect(["ACCEPT", "REJECT"], `${id}: finalized review`).toContain(
    receipt.review?.status,
  );
  expect(receipt.review?.notes?.trim().length, `${id}: review notes`).toBeGreaterThan(
    0,
  );
  const criteria = Object.values(receipt.review?.criteria ?? {});
  expect(criteria.length, `${id}: review criteria`).toBeGreaterThan(0);
  if (receipt.review.status === "ACCEPT") {
    expect(criteria.every(Boolean), `${id}: accepted criteria`).toBe(true);
  } else {
    expect(criteria.some((value) => value === false), `${id}: rejected criterion`).toBe(
      true,
    );
  }

  return {
    id,
    stableAssetId: expectedStableAssetId,
    version: expectedVersion,
    siteKey: manifestEntry.siteKey,
    promptSha256: receipt.promptSha256,
    outputSha256: receipt.outputSha256,
    actualCallReference: receipt.actualCallReference,
    reviewStatus: receipt.review.status,
    receipt,
    receiptFile,
    receiptSha256: sha256(receiptBuffer),
  };
}

describe("baby image campaign integrity", () => {
  it("binds all 143 stable assets and every immutable generation attempt", async () => {
    const campaign = await readJson(CAMPAIGN_FILE);
    const replacements = await readJson(REPLACEMENTS_FILE);

    expect(campaign).toMatchObject({
      schemaVersion: 1,
      campaignId: "gyeonggi-baby-template11-v1",
      siteCount: 27,
      jobCount: 143,
      maxPlacementsPerMaster: 6,
      allPlacementsIncludingHomeSlots: true,
    });
    expect(campaign.jobs).toHaveLength(143);
    expect(replacements).toMatchObject({
      schemaVersion: 1,
      campaignId: campaign.campaignId,
    });
    expect(Array.isArray(replacements.attempts)).toBe(true);

    const expectedStableIds = BABY_SITE_KEYS.flatMap((siteKey) =>
      getSiteImageAssetIds(siteKey),
    ).sort();
    expect(BABY_SITE_KEYS).toHaveLength(27);
    expect(expectedStableIds).toHaveLength(143);
    expect(new Set(expectedStableIds).size).toBe(143);

    const originalStableIds = campaign.jobs
      .map((entry) => stableAssetId(entry.logicalAssetId))
      .sort();
    expect(originalStableIds).toEqual(expectedStableIds);
    expect(new Set(campaign.jobs.map((entry) => entry.logicalAssetId)).size).toBe(
      143,
    );

    const attemptsById = new Map();
    const chains = new Map(expectedStableIds.map((id) => [id, []]));
    for (const entry of campaign.jobs) {
      const stableId = stableAssetId(entry.logicalAssetId);
      expect(entry.logicalAssetId).toBe(`${stableId}-v1`);
      expect(getSiteImageAssetIds(entry.siteKey)).toContain(stableId);
      const attempt = await loadAttempt({
        manifestEntry: entry,
        jobFile: path.join(
          CAMPAIGN_ROOT,
          "jobs",
          entry.siteKey,
          `${entry.logicalAssetId}.json`,
        ),
        expectedStableAssetId: stableId,
        expectedVersion: 1,
      });
      attemptsById.set(attempt.id, attempt);
      chains.get(stableId).push(attempt);
    }

    const replacementEntries = [...replacements.attempts].sort(
      (left, right) =>
        versionOf(left.logicalAssetId) - versionOf(right.logicalAssetId) ||
        left.logicalAssetId.localeCompare(right.logicalAssetId),
    );
    expect(
      new Set(replacementEntries.map((entry) => entry.logicalAssetId)).size,
    ).toBe(replacementEntries.length);

    for (const entry of replacementEntries) {
      const stableId = stableAssetId(entry.logicalAssetId);
      const version = versionOf(entry.logicalAssetId);
      expect(entry.stableAssetId, `${entry.logicalAssetId}: manifest stable id`).toBe(
        stableId,
      );
      expect(expectedStableIds).toContain(stableId);
      expect(getSiteImageAssetIds(entry.siteKey)).toContain(stableId);
      const source = attemptsById.get(entry.sourceAttemptId);
      expect(source, `${entry.logicalAssetId}: source exists`).toBeDefined();
      expect(source.stableAssetId, `${entry.logicalAssetId}: source stable id`).toBe(
        stableId,
      );
      expect(source.version, `${entry.logicalAssetId}: consecutive source`).toBe(
        version - 1,
      );
      expect(source.reviewStatus, `${entry.logicalAssetId}: replaces rejection`).toBe(
        "REJECT",
      );
      expect(entry.sourceReceiptSha256, `${entry.logicalAssetId}: source receipt hash`).toBe(
        source.receiptSha256,
      );

      const attempt = await loadAttempt({
        manifestEntry: entry,
        jobFile: path.join(ROOT, entry.jobFile),
        expectedStableAssetId: stableId,
        expectedVersion: version,
      });
      for (const document of [await readJson(path.join(ROOT, entry.jobFile)), attempt.receipt]) {
        expect(document.stableAssetId, `${attempt.id}: stable lineage`).toBe(stableId);
        expect(document.sourceAttemptId, `${attempt.id}: source lineage`).toBe(source.id);
        expect(document.sourceReceiptSha256, `${attempt.id}: source receipt lineage`).toBe(
          source.receiptSha256,
        );
        expect(
          document.sourceRejectedOutputSha256,
          `${attempt.id}: rejected output lineage`,
        ).toBe(source.outputSha256);
      }
      expect(entry.promptSha256, `${attempt.id}: replacement prompt hash`).toBe(
        attempt.promptSha256,
      );
      expect(entry.outputFile, `${attempt.id}: replacement output path`).toBe(
        attempt.receipt.outputFile,
      );
      expect(entry.receiptFile, `${attempt.id}: replacement receipt path`).toBe(
        relative(attempt.receiptFile),
      );
      attemptsById.set(attempt.id, attempt);
      chains.get(stableId).push(attempt);
    }

    const discoveredReplacementReceipts = (await listFiles(
      path.join(CAMPAIGN_ROOT, "replacements"),
    ))
      .map(relative)
      .filter((file) => /\/v\d+\/receipts\/.+\.json$/u.test(file))
      .sort();
    expect(discoveredReplacementReceipts).toEqual(
      replacementEntries.map((entry) => entry.receiptFile).sort(),
    );

    const discoveredReplacementJobs = (await listFiles(
      path.join(CAMPAIGN_ROOT, "replacements"),
    ))
      .map(relative)
      .filter((file) => /\/v\d+\/jobs\/.+\.json$/u.test(file))
      .sort();
    expect(discoveredReplacementJobs).toEqual(
      replacementEntries.map((entry) => entry.jobFile).sort(),
    );

    const discoveredReplacementPrompts = (await listFiles(
      path.join(CAMPAIGN_ROOT, "replacements"),
    ))
      .map(relative)
      .filter((file) => /\/v\d+\/prompts\/.+\.txt$/u.test(file))
      .sort();
    expect(discoveredReplacementPrompts).toEqual(
      replacementEntries
        .map((entry) =>
          entry.jobFile.replace("/jobs/", "/prompts/").replace(/\.json$/u, ".txt"),
        )
        .sort(),
    );

    const allAttempts = [...attemptsById.values()];
    expect(new Set(allAttempts.map((entry) => entry.actualCallReference)).size).toBe(
      allAttempts.length,
    );
    expect(new Set(allAttempts.map((entry) => entry.outputSha256)).size).toBe(
      allAttempts.length,
    );
    expect(new Set(allAttempts.map((entry) => entry.promptSha256)).size).toBe(
      allAttempts.length,
    );

    let accepted = 0;
    for (const [stableId, unsortedChain] of chains) {
      const chain = [...unsortedChain].sort((left, right) => left.version - right.version);
      expect(chain.map((entry) => entry.version), `${stableId}: contiguous versions`).toEqual(
        Array.from({ length: chain.length }, (_, index) => index + 1),
      );
      expect(
        chain.filter((entry) => entry.reviewStatus === "ACCEPT"),
        `${stableId}: exactly one selected ACCEPT`,
      ).toHaveLength(1);
      expect(chain.at(-1).reviewStatus, `${stableId}: terminal ACCEPT`).toBe("ACCEPT");
      expect(
        chain.slice(0, -1).every((entry) => entry.reviewStatus === "REJECT"),
        `${stableId}: rejected ancestors`,
      ).toBe(true);
      accepted += chain.filter((entry) => entry.reviewStatus === "ACCEPT").length;
    }
    expect(accepted).toBe(143);
  });

  it.skipIf(!RUN_AUTHORING_RAW_GATE)(
    "verifies every ignored authoring PNG against its immutable receipt",
    async () => {
      const campaign = await readJson(CAMPAIGN_FILE);
      const replacements = await readJson(REPLACEMENTS_FILE);
      const entries = [...campaign.jobs, ...replacements.attempts];
      expect(entries).toHaveLength(167);

      for (const entry of entries) {
        const receipt = await readJson(path.join(ROOT, entry.receiptFile));
        const outputFile = path.join(ROOT, entry.outputFile);
        const outputStat = await lstat(outputFile);
        expect(outputStat.isFile(), `${entry.logicalAssetId}: raw file`).toBe(true);
        expect(
          outputStat.isSymbolicLink(),
          `${entry.logicalAssetId}: raw symlink`,
        ).toBe(false);
        const output = await readFile(outputFile);
        expect(output.byteLength, `${entry.logicalAssetId}: raw bytes`).toBeGreaterThan(
          0,
        );
        expect(sha256(output), `${entry.logicalAssetId}: raw hash`).toBe(
          receipt.outputSha256,
        );
        const metadata = await sharp(output).metadata();
        expect(
          { format: metadata.format, width: metadata.width, height: metadata.height },
          `${entry.logicalAssetId}: raw metadata`,
        ).toEqual({
          format: receipt.format,
          width: receipt.width,
          height: receipt.height,
        });
      }

      const discoveredReplacementOutputs = (await listFiles(
        path.join(CAMPAIGN_ROOT, "replacements"),
      ))
        .map(relative)
        .filter((file) => /\/v\d+\/generated\/.+\.png$/u.test(file))
        .sort();
      expect(discoveredReplacementOutputs).toEqual(
        replacements.attempts.map((entry) => entry.outputFile).sort(),
      );
    },
  );
});
