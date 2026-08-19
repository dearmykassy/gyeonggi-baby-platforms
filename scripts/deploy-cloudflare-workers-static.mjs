import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertDeployableGitState,
  computeDirectoryDigest,
  sha256,
  validateBuildReceipt,
  validateInventory,
} from "./lib/cloudflare-pages-contract.mjs";
import {
  WORKERS_STATIC_RECEIPT_SCHEMA_VERSION,
  assertObservedWorkersOrigin,
  assertWorkersPublicationPermission,
  buildWorkersDeployArgs,
  buildWorkersStaticConfig,
  inspectWorkersStaticAssets,
  parseWorkerInspectionResult,
  validateWorkersStaticInventory,
} from "./lib/cloudflare-workers-static-contract.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const INVENTORY_PATH = "src/data/city-regions.generated.json";
const RECEIPT_PATH =
  "artifacts/deployments/cloudflare-workers-static.latest.json";
const YES_NO = new Set(["yes", "no"]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

export function parseWorkersDeployArgs(argv) {
  const cliArgs = argv.filter((argument) => argument !== "--");
  const allowed = new Set([
    "--site",
    "--create-workers",
    "--allow-nonpublic",
    "--dry-run",
  ]);
  if (cliArgs.length % 2 !== 0) {
    fail("BABY_WORKERS_ARGUMENT_VALUE_MISSING");
  }

  const values = new Map();
  for (let index = 0; index < cliArgs.length; index += 2) {
    const key = cliArgs[index];
    const value = cliArgs[index + 1];
    if (!allowed.has(key)) fail("BABY_WORKERS_ARGUMENT_UNKNOWN", key);
    if (values.has(key)) fail("BABY_WORKERS_ARGUMENT_DUPLICATE", key);
    if (!value || value.startsWith("--")) {
      fail("BABY_WORKERS_ARGUMENT_VALUE_MISSING", key);
    }
    values.set(key, value);
  }
  for (const key of [
    "--create-workers",
    "--allow-nonpublic",
    "--dry-run",
  ]) {
    const value = values.get(key) ?? "no";
    if (!YES_NO.has(value)) {
      fail("BABY_WORKERS_ARGUMENT_BOOLEAN", `${key}:${value}`);
    }
  }
  return {
    requestedSite: values.get("--site") ?? "all",
    createWorkers: values.get("--create-workers") === "yes",
    allowNonpublic: values.get("--allow-nonpublic") === "yes",
    dryRun: values.get("--dry-run") === "yes",
  };
}

function runGitChecked(args, root) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    fail("BABY_WORKERS_GIT_COMMAND_FAILED", `${args.join(" ")}:${result.status}`);
  }
  return result.stdout ?? "";
}

async function getGitState(root) {
  const headResult = spawnSync("git", ["rev-parse", "--verify", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  const head = headResult.status === 0 ? headResult.stdout.trim() : null;
  const status = runGitChecked(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    root,
  ).trim();
  return { head, clean: status.length === 0 };
}

function inspectRemoteWorker(workerName, root) {
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "wrangler",
      "deployments",
      "list",
      "--name",
      workerName,
      "--json",
    ],
    { cwd: root, encoding: "utf8" },
  );
  return parseWorkerInspectionResult({
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  });
}

function runWranglerChecked(args, root) {
  const result = spawnSync("pnpm", ["exec", "wrangler", ...args], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    fail("BABY_WORKERS_COMMAND_FAILED", `${args.join(" ")}:${result.status}`);
  }
  return result.stdout ?? "";
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function withTemporaryConfig(config, action) {
  const directory = await mkdtemp(path.join(tmpdir(), "baby-workers-static-"));
  const configPath = path.join(directory, "wrangler.json");
  try {
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    return await action(configPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function htmlAttribute(tag, name) {
  const expression = new RegExp(
    `\\b${name}\\s*=\\s*["']([^"']*)["']`,
    "iu",
  );
  return tag.match(expression)?.[1] ?? null;
}

function extractCanonical(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/giu)) {
    const rel = htmlAttribute(match[0], "rel");
    if (rel?.toLowerCase().split(/\s+/u).includes("canonical")) {
      return htmlAttribute(match[0], "href");
    }
  }
  return null;
}

function extractRobots(html) {
  for (const match of html.matchAll(/<meta\b[^>]*>/giu)) {
    if (htmlAttribute(match[0], "name")?.toLowerCase() === "robots") {
      return (htmlAttribute(match[0], "content") ?? "")
        .toLowerCase()
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }
  return [];
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: "manual",
    headers: { "User-Agent": "baby-workers-release-probe/1.0" },
    signal: AbortSignal.timeout(10_000),
  });
  return {
    status: response.status,
    location: response.headers.get("location"),
    contentType: response.headers.get("content-type") ?? "",
    text: await response.text(),
  };
}

async function fetchTextWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const result = await fetchText(url);
      if (result.status === 200) return result;
      lastError = new Error(`HTTP_${result.status}:${result.location ?? "none"}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 6) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw lastError;
}

async function probeLiveOrigin({ site, spec, publicationMode }) {
  const home = await fetchTextWithRetry(`${spec.origin}/`);
  if (!home.contentType.toLowerCase().includes("text/html")) {
    fail("BABY_WORKERS_LIVE_HOME_CONTENT_TYPE", site.key);
  }
  const canonical = extractCanonical(home.text);
  const robots = extractRobots(home.text);

  if (publicationMode === "public") {
    if (canonical !== `${spec.origin}/`) {
      fail(
        "BABY_WORKERS_LIVE_CANONICAL_MISMATCH",
        `${site.key}:${canonical}:${spec.origin}/`,
      );
    }
    if (!robots.includes("index") || !robots.includes("follow")) {
      fail("BABY_WORKERS_LIVE_ROBOTS_NOT_PUBLIC", `${site.key}:${robots.join(",")}`);
    }
  } else {
    if (!robots.includes("noindex") || !robots.includes("nofollow")) {
      fail(
        "BABY_WORKERS_LIVE_NONPUBLIC_ROBOTS_MISMATCH",
        `${site.key}:${robots.join(",")}`,
      );
    }
    if (!canonical || !canonical.includes(".invalid/")) {
      fail(
        "BABY_WORKERS_LIVE_NONPUBLIC_CANONICAL_MISMATCH",
        `${site.key}:${canonical}`,
      );
    }
  }

  const robotsFile = await fetchTextWithRetry(`${spec.origin}/robots.txt`);
  const sitemap = await fetchTextWithRetry(`${spec.origin}/sitemap.xml`);
  await fetchTextWithRetry(`${spec.origin}/rss.xml`);

  if (publicationMode === "public") {
    if (
      /Disallow:\s*\//iu.test(robotsFile.text) ||
      !robotsFile.text.includes(`Sitemap: ${spec.origin}/sitemap.xml`)
    ) {
      fail("BABY_WORKERS_LIVE_ROBOTS_FILE_MISMATCH", site.key);
    }
    const locCount = [...sitemap.text.matchAll(/<loc>/gu)].length;
    if (
      locCount !== site.counts.regionalCanonicals ||
      !sitemap.text.includes(`<loc>${spec.origin}/</loc>`)
    ) {
      fail(
        "BABY_WORKERS_LIVE_SITEMAP_MISMATCH",
        `${site.key}:${locCount}:${site.counts.regionalCanonicals}`,
      );
    }

    const firstRegionalPath = site.regions?.[0]?.path;
    if (typeof firstRegionalPath !== "string" || !firstRegionalPath.startsWith("/")) {
      fail("BABY_WORKERS_LIVE_REGIONAL_PATH_MISSING", site.key);
    }
    const regional = await fetchTextWithRetry(`${spec.origin}${firstRegionalPath}`);
    if (
      extractCanonical(regional.text) !== `${spec.origin}${firstRegionalPath}` ||
      !extractRobots(regional.text).includes("index")
    ) {
      fail("BABY_WORKERS_LIVE_REGIONAL_METADATA_MISMATCH", site.key);
    }
  } else if (!/Disallow:\s*\//iu.test(robotsFile.text)) {
    fail("BABY_WORKERS_LIVE_NONPUBLIC_ROBOTS_FILE_MISMATCH", site.key);
  }

  return {
    origin: spec.origin,
    homeStatus: home.status,
    canonical,
    robots,
    sitemapStatus: sitemap.status,
  };
}

const DEFAULT_DEPENDENCIES = {
  readText: (file) => readFile(file, "utf8"),
  getGitState,
  computeDirectoryDigest,
  inspectStaticAssets: inspectWorkersStaticAssets,
  inspectRemoteWorker,
  runWrangler: runWranglerChecked,
  withTemporaryConfig,
  probeLiveOrigin,
  writeReceipt: writeJsonAtomic,
  now: () => new Date().toISOString(),
};

function parseJson(value, code, detail) {
  try {
    return JSON.parse(value);
  } catch {
    fail(code, detail);
  }
}

function selectWorkerSites(rows, requestedSite) {
  const selected =
    requestedSite === "all"
      ? rows
      : rows.filter(({ site }) => site.key === requestedSite);
  if (
    !selected.length ||
    (requestedSite === "all" && selected.length !== 7) ||
    (requestedSite !== "all" && selected.length !== 1)
  ) {
    fail("BABY_WORKERS_SITE_SCOPE", `${requestedSite}:${selected.length}`);
  }
  return selected;
}

export async function runWorkersStaticDeploymentPipeline({
  argv = [],
  root = ROOT,
  dependencies = {},
} = {}) {
  const deps = { ...DEFAULT_DEPENDENCIES, ...dependencies };
  const options = parseWorkersDeployArgs(argv);
  const inventoryFile = path.join(root, INVENTORY_PATH);
  const inventoryRaw = await deps.readText(inventoryFile);
  const inventory = parseJson(
    inventoryRaw,
    "BABY_WORKERS_INVENTORY_JSON_INVALID",
    inventoryFile,
  );
  const allSites = validateInventory(inventory);
  const workerRows = validateWorkersStaticInventory(allSites);
  const selectedRows = selectWorkerSites(workerRows, options.requestedSite);
  const inventoryFileDigest = sha256(inventoryRaw);

  const modes = new Map();
  for (const { site, spec } of selectedRows) {
    modes.set(
      site.key,
      assertWorkersPublicationPermission({
        site,
        spec,
        allowNonpublic: options.allowNonpublic,
      }),
    );
  }

  const gitState = await deps.getGitState(root);
  const gitHead = assertDeployableGitState(gitState);
  const prepared = [];
  for (const { site, spec } of selectedRows) {
    const outputDirectory = path.join(root, "dist", site.key);
    const receiptFile = path.join(outputDirectory, ".baby-build.json");
    const receiptRaw = await deps.readText(receiptFile).catch((error) => {
      if (error?.code === "ENOENT") {
        fail("BABY_WORKERS_BUILD_RECEIPT_MISSING", site.key);
      }
      throw error;
    });
    const buildReceipt = parseJson(
      receiptRaw,
      "BABY_WORKERS_BUILD_RECEIPT_JSON_INVALID",
      site.key,
    );
    const artifact = await deps.computeDirectoryDigest(outputDirectory);
    validateBuildReceipt({
      receipt: buildReceipt,
      site,
      inventory,
      inventoryFileDigest,
      gitState,
      artifact,
    });
    const staticAssets = await deps.inspectStaticAssets(outputDirectory);
    const config = buildWorkersStaticConfig({ spec, outputDirectory });
    prepared.push({ site, spec, artifact, staticAssets, config });
  }

  const receiptBase = {
    schemaVersion: WORKERS_STATIC_RECEIPT_SCHEMA_VERSION,
    provider: "cloudflare-workers-static-assets",
    wranglerVersion: "4.124.0",
    accountSubdomain: "guncraft2000",
    generatedAt: deps.now(),
    requestedSite: options.requestedSite,
    dryRun: options.dryRun,
    createWorkers: options.createWorkers,
    allowNonpublic: options.allowNonpublic,
    gitHead,
    sourceTreeClean: true,
    inventoryDigest: inventory.inventoryDigest,
    inventoryFileDigest,
    deploymentCount: prepared.length,
  };
  const plan = prepared.map(({ site, spec, artifact, staticAssets, config }) => ({
    siteKey: site.key,
    workerName: spec.workerName,
    expectedOrigin: spec.origin,
    publicOrigin: site.publicOrigin,
    publicationMode: modes.get(site.key),
    artifact,
    staticAssets,
    config,
    observedUrls: [],
    liveProbe: null,
  }));

  if (options.dryRun) {
    return {
      status: "DRY_RUN",
      receiptPath: null,
      receipt: { ...receiptBase, status: "DRY_RUN", deployments: plan },
    };
  }

  const inspections = new Map();
  for (const item of prepared) {
    inspections.set(
      item.site.key,
      await deps.inspectRemoteWorker(item.spec.workerName, root),
    );
  }
  const missing = prepared.filter(
    (item) => inspections.get(item.site.key)?.exists !== true,
  );
  if (missing.length && !options.createWorkers) {
    fail(
      "BABY_WORKERS_REMOTE_MISSING",
      missing.map((item) => item.spec.workerName).join(","),
    );
  }

  const deployments = [];
  for (const item of prepared) {
    const deployment = await deps.withTemporaryConfig(
      item.config,
      async (configPath) => {
        const wranglerArgs = buildWorkersDeployArgs({ configPath, gitHead });
        const output = await deps.runWrangler(wranglerArgs, root);
        const observedUrls = assertObservedWorkersOrigin(output, item.spec);
        const liveProbe = await deps.probeLiveOrigin({
          site: item.site,
          spec: item.spec,
          publicationMode: modes.get(item.site.key),
        });
        return { wranglerArgs, observedUrls, liveProbe };
      },
    );
    deployments.push({
      siteKey: item.site.key,
      workerName: item.spec.workerName,
      expectedOrigin: item.spec.origin,
      publicOrigin: item.site.publicOrigin,
      publicationMode: modes.get(item.site.key),
      artifact: item.artifact,
      staticAssets: item.staticAssets,
      config: item.config,
      remoteExistedBeforeDeploy: inspections.get(item.site.key).exists,
      ...deployment,
    });
  }

  const receipt = { ...receiptBase, status: "PASS", deployments };
  const receiptPath = path.join(root, RECEIPT_PATH);
  await deps.writeReceipt(receiptPath, receipt);
  return { status: "PASS", receiptPath, receipt };
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const result = await runWorkersStaticDeploymentPipeline({
    argv: process.argv.slice(2),
  });
  console.log(JSON.stringify(result, null, 2));
}
