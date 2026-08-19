import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const EXPECTED_SITE_COUNT = 27;
export const BUILD_RECEIPT_SCHEMA_VERSION = 2;
export const DEPLOY_RECEIPT_SCHEMA_VERSION = 2;

const PROJECT_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;
const GIT_HEAD_PATTERN = /^[0-9a-f]{40}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

export function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function expectedPagesOrigin(projectName) {
  return `https://${projectName}.pages.dev`;
}

function exactHttpsOrigin(value, siteKey) {
  if (typeof value !== "string") {
    fail("BABY_CLOUDFLARE_PUBLIC_ORIGIN_INVALID", siteKey);
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("BABY_CLOUDFLARE_PUBLIC_ORIGIN_INVALID", `${siteKey}:${value}`);
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.hostname.endsWith(".invalid") ||
    parsed.origin !== value
  ) {
    fail("BABY_CLOUDFLARE_PUBLIC_ORIGIN_INVALID", `${siteKey}:${value}`);
  }
  return parsed.origin;
}

export function classifyPublication(site) {
  const publicTuple =
    site.deploymentState === "public" &&
    site.isPublic === true &&
    site.indexingEnabled === true &&
    site.publicOrigin !== null;
  const nonpublicTuple =
    (site.deploymentState === "planned" || site.deploymentState === "preview") &&
    site.isPublic === false &&
    site.indexingEnabled === false &&
    site.publicOrigin === null;

  if (publicTuple) {
    exactHttpsOrigin(site.publicOrigin, site.key);
    return "public";
  }
  if (nonpublicTuple) return "nonpublic";

  fail("BABY_CLOUDFLARE_PUBLICATION_STATE_INCONSISTENT", site.key);
}

function assertUnique(sites, field) {
  const seen = new Set();
  for (const site of sites) {
    const value = site[field];
    if (seen.has(value)) {
      fail("BABY_CLOUDFLARE_INVENTORY_DUPLICATE", `${field}:${value}`);
    }
    seen.add(value);
  }
}

export function validateInventory(inventory) {
  if (
    !inventory ||
    inventory.schemaVersion !== 1 ||
    inventory.status !== "COMMITTED" ||
    inventory.counts?.targetSites !== EXPECTED_SITE_COUNT ||
    !Array.isArray(inventory.sites) ||
    inventory.sites.length !== EXPECTED_SITE_COUNT
  ) {
    fail(
      "BABY_CLOUDFLARE_INVENTORY_COUNT",
      `${inventory?.counts?.targetSites ?? "missing"}:${inventory?.sites?.length ?? "missing"}`,
    );
  }
  if (!/^sha256:[0-9a-f]{64}$/u.test(inventory.inventoryDigest ?? "")) {
    fail("BABY_CLOUDFLARE_INVENTORY_DIGEST_INVALID");
  }

  for (const field of ["key", "projectName", "plannedOrigin", "previewOrigin"]) {
    assertUnique(inventory.sites, field);
  }

  for (const site of inventory.sites) {
    if (!site.key || !PROJECT_NAME_PATTERN.test(site.projectName ?? "")) {
      fail(
        "BABY_CLOUDFLARE_PROJECT_NAME_INVALID",
        `${site.key ?? "missing"}:${site.projectName ?? "missing"}`,
      );
    }
    const expected = expectedPagesOrigin(site.projectName);
    if (site.plannedOrigin !== expected || site.previewOrigin !== expected) {
      fail(
        "BABY_CLOUDFLARE_PROJECT_ORIGIN_MISMATCH",
        `${site.key}:${site.projectName}:${site.plannedOrigin}:${site.previewOrigin}:${expected}`,
      );
    }
    classifyPublication(site);
  }

  return inventory.sites;
}

function normalizeHostname(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  let parsed;
  try {
    parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    fail("BABY_CLOUDFLARE_PROJECT_DOMAIN_INVALID", raw);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    fail("BABY_CLOUDFLARE_PROJECT_DOMAIN_INVALID", raw);
  }
  return parsed.hostname.toLowerCase();
}

export function normalizeWranglerProjects(value) {
  const rows = Array.isArray(value) ? value : value?.result;
  if (!Array.isArray(rows)) {
    fail("BABY_CLOUDFLARE_PROJECT_LIST_INVALID");
  }

  const projects = new Map();
  for (const row of rows) {
    const name = row?.["Project Name"] ?? row?.name;
    if (typeof name !== "string" || !PROJECT_NAME_PATTERN.test(name)) {
      fail("BABY_CLOUDFLARE_PROJECT_LIST_ROW_INVALID", String(name));
    }
    if (projects.has(name)) {
      fail("BABY_CLOUDFLARE_PROJECT_LIST_DUPLICATE", name);
    }

    const displayDomains = row?.["Project Domains"];
    const rawDomains = Array.isArray(row?.domains)
      ? [...row.domains]
      : typeof displayDomains === "string"
        ? displayDomains.split(",")
        : [];
    if (typeof row?.subdomain === "string") rawDomains.push(row.subdomain);
    const domains = new Set(
      rawDomains.map(normalizeHostname).filter((domain) => domain !== null),
    );
    projects.set(name, { name, domains });
  }
  return projects;
}

export function parseWranglerProjectList(output) {
  let value;
  try {
    value = JSON.parse(output);
  } catch {
    fail("BABY_CLOUDFLARE_PROJECT_LIST_JSON_INVALID");
  }
  return normalizeWranglerProjects(value);
}

export function assertRemoteProjectMapping(site, projects) {
  const project = projects.get(site.projectName);
  if (!project) {
    fail("BABY_CLOUDFLARE_PROJECT_MISSING", site.projectName);
  }
  const expectedHostname = new URL(site.plannedOrigin).hostname;
  if (!project.domains.has(expectedHostname)) {
    fail(
      "BABY_CLOUDFLARE_REMOTE_ORIGIN_MISMATCH",
      `${site.projectName}:${expectedHostname}:${[...project.domains].join(",") || "none"}`,
    );
  }
}

async function collectFiles(root, current, files) {
  const entries = await readdir(current, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (relative === ".baby-build.json") continue;
    if (entry.isSymbolicLink()) {
      fail("BABY_DEPLOY_ARTIFACT_SYMLINK", relative);
    }
    if (entry.isDirectory()) {
      await collectFiles(root, absolute, files);
    } else if (entry.isFile()) {
      files.push({ absolute, relative });
    } else {
      fail("BABY_DEPLOY_ARTIFACT_SPECIAL_FILE", relative);
    }
  }
}

export async function computeDirectoryDigest(root) {
  const rootStat = await lstat(root).catch((error) => {
    if (error?.code === "ENOENT") fail("BABY_DEPLOY_OUTPUT_MISSING", root);
    throw error;
  });
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    fail("BABY_DEPLOY_OUTPUT_NOT_DIRECTORY", root);
  }

  const files = [];
  await collectFiles(root, root, files);
  if (!files.length) fail("BABY_DEPLOY_OUTPUT_EMPTY", root);

  const manifestHash = createHash("sha256");
  manifestHash.update("baby-static-artifact-v1\0");
  let totalBytes = 0;
  for (const file of files) {
    const fileStat = await lstat(file.absolute);
    if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
      fail("BABY_DEPLOY_ARTIFACT_NOT_REGULAR", file.relative);
    }
    const bytes = await readFile(file.absolute);
    totalBytes += bytes.byteLength;
    const fileDigest = createHash("sha256").update(bytes).digest("hex");
    manifestHash.update(`${file.relative}\0${fileStat.size}\0${fileDigest}\0`);
  }

  return {
    digest: `sha256:${manifestHash.digest("hex")}`,
    fileCount: files.length,
    totalBytes,
  };
}

export function assertDeployableGitState(gitState) {
  if (!GIT_HEAD_PATTERN.test(gitState?.head ?? "")) {
    fail("BABY_DEPLOY_GIT_HEAD_REQUIRED");
  }
  if (gitState.clean !== true) {
    fail("BABY_DEPLOY_GIT_TREE_DIRTY");
  }
  return gitState.head;
}

export function buildDeployArgs({ outputDirectory, site, branch, gitHead }) {
  if (!GIT_HEAD_PATTERN.test(gitHead ?? "")) {
    fail("BABY_DEPLOY_GIT_HEAD_REQUIRED");
  }
  return [
    "pages",
    "deploy",
    outputDirectory,
    "--project-name",
    site.projectName,
    "--branch",
    branch,
    "--commit-hash",
    gitHead,
    "--commit-dirty=false",
  ];
}

export function validateBuildReceipt({
  receipt,
  site,
  inventory,
  inventoryFileDigest,
  gitState,
  artifact,
}) {
  const publicationMode = classifyPublication(site);
  const expected = {
    schemaVersion: BUILD_RECEIPT_SCHEMA_VERSION,
    siteKey: site.key,
    projectName: site.projectName,
    inventoryDigest: inventory.inventoryDigest,
    inventoryFileDigest,
    plannedOrigin: site.plannedOrigin,
    previewOrigin: site.previewOrigin,
    publicOrigin: site.publicOrigin,
    deploymentState: site.deploymentState,
    isPublic: site.isPublic,
    indexingEnabled: site.indexingEnabled,
    publicationMode,
    regionalCanonicals: site.counts.regionalCanonicals,
    gitHead: gitState.head,
    sourceTreeClean: true,
    buildTimeDerivedSeoFields: false,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (receipt?.[field] !== value) {
      fail(
        "BABY_DEPLOY_BUILD_RECEIPT_MISMATCH",
        `${site.key}:${field}:${JSON.stringify(receipt?.[field])}:${JSON.stringify(value)}`,
      );
    }
  }
  if (
    receipt?.artifact?.digest !== artifact.digest ||
    receipt?.artifact?.fileCount !== artifact.fileCount ||
    receipt?.artifact?.totalBytes !== artifact.totalBytes
  ) {
    fail("BABY_DEPLOY_BUILD_ARTIFACT_MISMATCH", site.key);
  }
  return publicationMode;
}

export function extractDeploymentUrls(output) {
  return [
    ...new Set(
      [...String(output).matchAll(/https:\/\/[^\s]+/gu)].map((match) =>
        match[0].replace(/[),.;]+$/u, ""),
      ),
    ),
  ];
}
