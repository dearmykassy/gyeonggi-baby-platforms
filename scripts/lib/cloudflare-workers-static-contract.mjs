import { lstat, readdir } from "node:fs/promises";
import path from "node:path";

import {
  WORKERS_STATIC_HOSTING_PROVIDER,
  classifyPublication,
} from "./cloudflare-pages-contract.mjs";

export const WORKERS_ACCOUNT_SUBDOMAIN = "guncraft2000";
export const WORKERS_COMPATIBILITY_DATE = "2026-08-19";
export const WORKERS_STATIC_RECEIPT_SCHEMA_VERSION = 1;
export const WORKERS_FREE_MAX_ASSET_FILES = 20_000;
export const WORKERS_MAX_ASSET_BYTES = 25 * 1024 * 1024;

const DNS_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;

const RAW_WORKER_SPECS = [
  ["uiwang", "uiwang-ondam"],
  ["uijeongbu", "uijeongbu-shimon"],
  ["paju", "paju-hyudam"],
  ["pyeongtaek", "pyeongtaek-ongyeol"],
  ["pocheon", "pocheon-harushim"],
  ["hanam", "hanam-hyuon"],
  ["hwaseong", "hwaseong-onshim"],
];

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

export function expectedWorkersOrigin(workerName) {
  if (!DNS_LABEL_PATTERN.test(workerName ?? "")) {
    fail("BABY_WORKERS_NAME_INVALID", String(workerName));
  }
  return `https://${workerName}.${WORKERS_ACCOUNT_SUBDOMAIN}.workers.dev`;
}

export const WORKERS_STATIC_SITE_SPECS = Object.freeze(
  RAW_WORKER_SPECS.map(([siteKey, workerName]) =>
    Object.freeze({
      siteKey,
      workerName,
      origin: expectedWorkersOrigin(workerName),
    }),
  ),
);

const SPEC_BY_SITE = new Map(
  WORKERS_STATIC_SITE_SPECS.map((spec) => [spec.siteKey, spec]),
);

if (
  WORKERS_STATIC_SITE_SPECS.length !== 7 ||
  SPEC_BY_SITE.size !== 7 ||
  new Set(WORKERS_STATIC_SITE_SPECS.map((spec) => spec.workerName)).size !== 7 ||
  new Set(WORKERS_STATIC_SITE_SPECS.map((spec) => spec.origin)).size !== 7
) {
  fail("BABY_WORKERS_SPEC_INTEGRITY_FAILURE");
}

export function getWorkersStaticSpec(siteKey) {
  const spec = SPEC_BY_SITE.get(siteKey);
  if (!spec) fail("BABY_WORKERS_SITE_SCOPE", String(siteKey));
  return spec;
}

export function findWorkersStaticSpec(siteKey) {
  return SPEC_BY_SITE.get(siteKey) ?? null;
}

/**
 * Validate the fixed seven-site bridge against the committed city inventory.
 *
 * The Pages project name is deliberately reused as the Worker name because
 * the two products have separate namespaces. A public tuple is accepted only
 * when both hostingOrigin and publicOrigin are the exact workers.dev route
 * below. Nonpublic staging remains available only through the explicit
 * allowNonpublic gate; it cannot alter the committed provider mapping.
 */
export function validateWorkersStaticInventory(sites) {
  if (!Array.isArray(sites) || sites.length !== 27) {
    fail("BABY_WORKERS_INVENTORY_COUNT", String(sites?.length ?? "missing"));
  }
  const byKey = new Map(sites.map((site) => [site.key, site]));
  if (byKey.size !== sites.length) fail("BABY_WORKERS_INVENTORY_DUPLICATE_KEY");

  return WORKERS_STATIC_SITE_SPECS.map((spec) => {
    const site = byKey.get(spec.siteKey);
    if (!site) fail("BABY_WORKERS_INVENTORY_SITE_MISSING", spec.siteKey);
    if (site.projectName !== spec.workerName) {
      fail(
        "BABY_WORKERS_NAME_MAPPING_MISMATCH",
        `${spec.siteKey}:${site.projectName}:${spec.workerName}`,
      );
    }

    if (
      site.hostingProvider !== WORKERS_STATIC_HOSTING_PROVIDER ||
      site.hostingOrigin !== spec.origin
    ) {
      fail(
        "BABY_WORKERS_PROVIDER_MAPPING_MISMATCH",
        `${spec.siteKey}:${site.hostingProvider}:${site.hostingOrigin}:${spec.origin}`,
      );
    }

    const mode = classifyPublication(site);
    if (mode === "public" && site.publicOrigin !== spec.origin) {
      fail(
        "BABY_WORKERS_PUBLIC_ORIGIN_MISMATCH",
        `${spec.siteKey}:${site.publicOrigin}:${spec.origin}`,
      );
    }
    return { site, spec, publicationMode: mode };
  });
}

export function assertWorkersPublicationPermission({
  site,
  spec,
  allowNonpublic,
}) {
  if (
    site.hostingProvider !== WORKERS_STATIC_HOSTING_PROVIDER ||
    site.hostingOrigin !== spec.origin
  ) {
    fail(
      "BABY_WORKERS_PROVIDER_MAPPING_MISMATCH",
      `${site.key}:${site.hostingProvider}:${site.hostingOrigin}:${spec.origin}`,
    );
  }
  const mode = classifyPublication(site);
  if (mode === "nonpublic") {
    if (!allowNonpublic) {
      fail("BABY_WORKERS_NONPUBLIC_BUILD_REFUSED", site.key);
    }
    if (site.publicOrigin !== null) {
      fail("BABY_WORKERS_NONPUBLIC_ORIGIN_PRESENT", site.key);
    }
    return mode;
  }
  if (site.publicOrigin !== spec.origin) {
    fail(
      "BABY_WORKERS_PUBLIC_ORIGIN_MISMATCH",
      `${site.key}:${site.publicOrigin}:${spec.origin}`,
    );
  }
  return mode;
}

export function buildWorkersStaticConfig({ spec, outputDirectory }) {
  if (!path.isAbsolute(outputDirectory)) {
    fail("BABY_WORKERS_OUTPUT_NOT_ABSOLUTE", outputDirectory);
  }
  return {
    name: spec.workerName,
    compatibility_date: WORKERS_COMPATIBILITY_DATE,
    workers_dev: true,
    preview_urls: false,
    assets: {
      directory: outputDirectory,
      not_found_handling: "404-page",
      html_handling: "force-trailing-slash",
      run_worker_first: false,
    },
  };
}

export function buildWorkersDeployArgs({ configPath, gitHead }) {
  if (!path.isAbsolute(configPath)) {
    fail("BABY_WORKERS_CONFIG_NOT_ABSOLUTE", configPath);
  }
  if (!/^[0-9a-f]{40}$/u.test(gitHead ?? "")) {
    fail("BABY_WORKERS_GIT_HEAD_REQUIRED");
  }
  return [
    "deploy",
    "--config",
    configPath,
    "--strict",
    "--message",
    `baby-release:${gitHead}`,
  ];
}

async function walkStaticAssets(root, current, state) {
  const entries = await readdir(current, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (relative === ".baby-build.json") continue;
    if (entry.isSymbolicLink()) {
      fail("BABY_WORKERS_ASSET_SYMLINK", relative);
    }
    if (entry.isDirectory()) {
      await walkStaticAssets(root, absolute, state);
      continue;
    }
    if (!entry.isFile()) fail("BABY_WORKERS_ASSET_SPECIAL_FILE", relative);

    const stat = await lstat(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      fail("BABY_WORKERS_ASSET_NOT_REGULAR", relative);
    }
    state.fileCount += 1;
    state.totalBytes += stat.size;
    if (stat.size > state.maxFileBytes) {
      state.maxFileBytes = stat.size;
      state.maxFile = relative;
    }
    state.paths.add(relative);
  }
}

export async function inspectWorkersStaticAssets(outputDirectory) {
  const rootStat = await lstat(outputDirectory).catch((error) => {
    if (error?.code === "ENOENT") {
      fail("BABY_WORKERS_OUTPUT_MISSING", outputDirectory);
    }
    throw error;
  });
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    fail("BABY_WORKERS_OUTPUT_NOT_DIRECTORY", outputDirectory);
  }

  const state = {
    fileCount: 0,
    totalBytes: 0,
    maxFileBytes: 0,
    maxFile: null,
    paths: new Set(),
  };
  await walkStaticAssets(outputDirectory, outputDirectory, state);

  if (!state.fileCount) fail("BABY_WORKERS_OUTPUT_EMPTY", outputDirectory);
  if (state.fileCount > WORKERS_FREE_MAX_ASSET_FILES) {
    fail(
      "BABY_WORKERS_ASSET_FILE_LIMIT",
      `${state.fileCount}:${WORKERS_FREE_MAX_ASSET_FILES}`,
    );
  }
  if (state.maxFileBytes > WORKERS_MAX_ASSET_BYTES) {
    fail(
      "BABY_WORKERS_ASSET_SIZE_LIMIT",
      `${state.maxFile}:${state.maxFileBytes}:${WORKERS_MAX_ASSET_BYTES}`,
    );
  }
  for (const required of [
    "index.html",
    "404.html",
    "robots.txt",
    "sitemap.xml",
    "rss.xml",
  ]) {
    if (!state.paths.has(required)) {
      fail("BABY_WORKERS_REQUIRED_ASSET_MISSING", required);
    }
  }

  return Object.freeze({
    fileCount: state.fileCount,
    totalBytes: state.totalBytes,
    maxFileBytes: state.maxFileBytes,
    maxFile: state.maxFile,
  });
}

export function parseWorkerInspectionResult({ status, stdout = "", stderr = "" }) {
  if (status === 0) {
    let deployments;
    try {
      deployments = JSON.parse(stdout);
    } catch {
      fail("BABY_WORKERS_DEPLOYMENT_LIST_JSON_INVALID");
    }
    if (!Array.isArray(deployments)) {
      fail("BABY_WORKERS_DEPLOYMENT_LIST_SHAPE_INVALID");
    }
    return { exists: true, deploymentCount: deployments.length };
  }

  const combined = `${stdout}\n${stderr}`;
  if (/\bcode:\s*10007\b/u.test(combined)) {
    return { exists: false, deploymentCount: 0 };
  }
  fail("BABY_WORKERS_INSPECTION_FAILED", String(status ?? "signal"));
}

export function assertObservedWorkersOrigin(output, spec) {
  const urls = [
    ...new Set(
      [...String(output).matchAll(/https:\/\/[^\s]+/gu)].map((match) =>
        match[0].replace(/[),.;]+$/u, "").replace(/\/$/u, ""),
      ),
    ),
  ];
  if (urls.includes(spec.origin)) return urls;
  // Wrangler output formatting is not an authority boundary. The caller must
  // still complete the live origin probe when the exact route is omitted.
  return urls;
}
