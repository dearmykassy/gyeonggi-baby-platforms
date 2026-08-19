import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  createRegionalNormalizer,
  evaluateCrossPlatformCopyAuditBoundary,
  evaluateFactDerivedSelectionSource,
  evaluateNaverNearDuplicateGate,
  evaluateStagedIndexingSource,
} from "./lib/naver-near-duplicate-contract.mjs";
import { ALL_BABY_SITES } from "../src/lib/site-config.ts";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..");
const ACTIVE_SITE_RENDERER = path.join(
  ROOT,
  "scripts/lib/render-active-site-regional-corpus.tsx",
);
const COPY_AUDITOR = path.join(ROOT, "scripts/audit-copy-duplication.mjs");
const CONTENT_SOURCE = path.join(ROOT, "src/lib/content.ts");
const METADATA_SOURCE = path.join(ROOT, "src/lib/metadata.ts");
const SITEMAP_SOURCE = path.join(ROOT, "src/app/sitemap.ts");
const ANCILLARY_ROUTE_SOURCES = [
  "src/app/areas/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/guide/page.tsx",
  "src/app/notice/page.tsx",
  "src/app/blog/page.tsx",
  "src/app/blog/[slug]/page.tsx",
  "src/data/blog-posts.ts",
].map((relativePath) => path.join(ROOT, relativePath));
const MAX_CHILD_BUFFER = 64 * 1024 * 1024;
const RENDER_CONCURRENCY = 4;

function optionValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

async function renderOneSite(siteKey) {
  const { stdout } = await execFileAsync(
    process.execPath,
    ["--import", "tsx", ACTIVE_SITE_RENDERER],
    {
      cwd: ROOT,
      env: { ...process.env, BABY_SITE_KEY: siteKey },
      maxBuffer: MAX_CHILD_BUFFER,
    },
  );
  const corpus = JSON.parse(stdout);
  if (corpus.siteKey !== siteKey) {
    throw new Error(`BABY_NAVER_RENDER_SITE_MISMATCH:${siteKey}`);
  }
  return corpus;
}

async function renderAllSites() {
  const keys = ALL_BABY_SITES.map((site) => site.key);
  const output = new Array(keys.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < keys.length) {
      const index = nextIndex;
      nextIndex += 1;
      output[index] = await renderOneSite(keys[index]);
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(RENDER_CONCURRENCY, keys.length) },
      () => worker(),
    ),
  );
  return output;
}

function normalizer() {
  const brands = ALL_BABY_SITES.map((site) => site.brandName);
  return createRegionalNormalizer({ brands, labels: [] });
}

export function summarizeCopyAudit(report) {
  const boundary = evaluateCrossPlatformCopyAuditBoundary(report);
  return {
    status: boundary.status,
    sourceAuditStatus: report.status,
    failures: boundary.failures,
    command: "pnpm audit:copy",
    authoritativeRepositoryCount: report.authoritativeRepositoryCount,
    targetRegionalRouteCount: report.targetRegionalRouteCount,
    exactMetaTitleCollisions: report.exactMetaTitleCollisions,
    exactDescriptionCollisions: report.exactDescriptionCollisions,
    exactH1Collisions: report.exactH1Collisions,
    exactSignatureCollisions: report.exactSignatureCollisions,
    normalizedMetaTitleCollisions: report.normalizedMetaTitleCollisions,
    normalizedDescriptionCollisions: report.normalizedDescriptionCollisions,
    normalizedH1Collisions: report.normalizedH1Collisions,
    normalizedParagraphCollisions: report.normalizedParagraphCollisions,
    normalizedParagraphCollisionEnforcement:
      boundary.diagnostics.normalizedParagraphCollisionEnforcement,
    normalizedSignatureCollisions: report.normalizedSignatureCollisions,
    normalizedInternalCollisionEnforcement:
      report.normalizedInternalCollisionEnforcement ??
      "DIAGNOSTIC_EXACT_AND_ELIGIBLE_RENDERED_GATES_ARE_AUTHORITATIVE",
    officialSuffixLeakCount: report.officialSuffixLeakCount,
    externalCollisionCounts: Object.fromEntries(
      Object.entries(report.comparisons ?? {}).map(([key, comparison]) => [
        key,
        {
          exact: comparison.substantiveExactCollisions.count,
          normalized: comparison.brandRegionNormalizedCollisions.count,
        },
      ]),
    ),
  };
}

async function runCopyAudit() {
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--import", "tsx", COPY_AUDITOR],
      { cwd: ROOT, maxBuffer: MAX_CHILD_BUFFER },
    );
    return summarizeCopyAudit(JSON.parse(stdout));
  } catch (error) {
    const stdout = typeof error?.stdout === "string" ? error.stdout : "";
    if (stdout.trim()) {
      try {
        return summarizeCopyAudit(JSON.parse(stdout));
      } catch {
        // Fall through to a bounded command-error receipt.
      }
    }
    return {
      status: "ERROR",
      command: "pnpm audit:copy",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runNaverNearDuplicateAudit({
  includeCopyAudit = true,
} = {}) {
  const siteCorpora = await renderAllSites();
  const records = siteCorpora.flatMap((corpus) => corpus.records);
  const renderedRecords = siteCorpora.flatMap(
    (corpus) => corpus.renderedRecords,
  );
  const fixedRecords = siteCorpora.flatMap((corpus) => corpus.fixedRecords);
  const stagedRecords = siteCorpora.flatMap((corpus) => corpus.stagedRecords);
  const siteSitemapContracts = siteCorpora.map(
    (corpus) => corpus.sitemapContract,
  );
  const selectionSourceContract = evaluateFactDerivedSelectionSource(
    await readFile(CONTENT_SOURCE, "utf8"),
  );
  const stagedIndexingSourceContract = evaluateStagedIndexingSource({
    metadataSource: await readFile(METADATA_SOURCE, "utf8"),
    sitemapSource: await readFile(SITEMAP_SOURCE, "utf8"),
    ancillaryRouteSource: (
      await Promise.all(
        ANCILLARY_ROUTE_SOURCES.map((sourcePath) =>
          readFile(sourcePath, "utf8"),
        ),
      )
    ).join("\n/* FILE BOUNDARY */\n"),
  });
  const regionalReport = evaluateNaverNearDuplicateGate({
    records,
    renderedRecords,
    fixedRecords,
    stagedRecords,
    siteSitemapContracts,
    normalize: normalizer(),
    selectionSourceContract,
    stagedIndexingSourceContract,
  });
  const copyAudit = includeCopyAudit
    ? await runCopyAudit()
    : { status: "SKIPPED", command: "pnpm audit:copy" };
  const failures = [...regionalReport.failures];
  if (includeCopyAudit && copyAudit.status !== "PASS") {
    failures.push("CROSS_PLATFORM_COPY_AUDIT");
  }
  return {
    ...regionalReport,
    status: failures.length === 0 ? "PASS" : "FAIL",
    failures,
    copyAudit,
  };
}

async function main() {
  const includeCopyAudit = optionValue("--copy-audit", "yes") !== "no";
  const report = await runNaverNearDuplicateAudit({ includeCopyAudit });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== "PASS") process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
