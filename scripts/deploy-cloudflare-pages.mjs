import { spawnSync } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEPLOY_RECEIPT_SCHEMA_VERSION,
  PAGES_HOSTING_PROVIDER,
  assertPagesHostingProvider,
  assertDeployableGitState,
  assertRemoteProjectMapping,
  buildDeployArgs,
  classifyPublication,
  computeDirectoryDigest,
  extractDeploymentUrls,
  parseWranglerProjectList,
  sha256,
  validateBuildReceipt,
  validateInventory,
} from "./lib/cloudflare-pages-contract.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const INVENTORY_PATH = "src/data/city-regions.generated.json";
const RECEIPT_PATH = "artifacts/deployments/cloudflare-pages.latest.json";
const YES_NO = new Set(["yes", "no"]);
const BRANCH_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._/-]{0,127})$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

export function parseDeployArgs(argv) {
  const cliArgs = argv.filter((argument) => argument !== "--");
  const allowed = new Set([
    "--site",
    "--create-projects",
    "--allow-nonpublic",
    "--branch",
    "--dry-run",
  ]);
  if (cliArgs.length % 2 !== 0) fail("BABY_DEPLOY_ARGUMENT_VALUE_MISSING");

  const values = new Map();
  for (let index = 0; index < cliArgs.length; index += 2) {
    const key = cliArgs[index];
    const value = cliArgs[index + 1];
    if (!allowed.has(key)) fail("BABY_DEPLOY_ARGUMENT_UNKNOWN", key);
    if (values.has(key)) fail("BABY_DEPLOY_ARGUMENT_DUPLICATE", key);
    if (!value || value.startsWith("--")) {
      fail("BABY_DEPLOY_ARGUMENT_VALUE_MISSING", key);
    }
    values.set(key, value);
  }

  for (const key of ["--create-projects", "--allow-nonpublic", "--dry-run"]) {
    const value = values.get(key) ?? "no";
    if (!YES_NO.has(value)) fail("BABY_DEPLOY_ARGUMENT_BOOLEAN", `${key}:${value}`);
  }
  const branch = values.get("--branch") ?? "main";
  if (
    !BRANCH_PATTERN.test(branch) ||
    branch.includes("..") ||
    branch.includes("//") ||
    branch.endsWith("/")
  ) {
    fail("BABY_DEPLOY_BRANCH_INVALID", branch);
  }

  return {
    requestedSite: values.get("--site") ?? "all",
    createProjects: values.get("--create-projects") === "yes",
    allowNonpublic: values.get("--allow-nonpublic") === "yes",
    dryRun: values.get("--dry-run") === "yes",
    branch,
  };
}

function runChecked(program, commandArgs, root) {
  const result = spawnSync(program, commandArgs, {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    fail(
      program === "git"
        ? "BABY_DEPLOY_GIT_COMMAND_FAILED"
        : "BABY_CLOUDFLARE_COMMAND_FAILED",
      `${commandArgs.join(" ")}:${result.status ?? "signal"}`,
    );
  }
  return result.stdout ?? "";
}

async function getGitState(root) {
  const headResult = spawnSync("git", ["rev-parse", "--verify", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  const head = headResult.status === 0 ? headResult.stdout.trim() : null;
  const status = runChecked(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    root,
  ).trim();
  return { head, clean: status.length === 0 };
}

function runWrangler(commandArgs, root) {
  const stdout = runChecked("pnpm", ["exec", "wrangler", ...commandArgs], root);
  if (stdout) process.stdout.write(stdout);
  return stdout;
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

const DEFAULT_DEPENDENCIES = {
  readText: (file) => readFile(file, "utf8"),
  getGitState,
  computeDirectoryDigest,
  runWrangler,
  writeReceipt: writeJsonAtomic,
  now: () => new Date().toISOString(),
};

function selectSites(sites, requestedSite) {
  const selected =
    requestedSite === "all"
      ? sites
      : requestedSite === "pages"
        ? sites.filter(
            (site) => site.hostingProvider === PAGES_HOSTING_PROVIDER,
          )
      : sites.filter((site) => site.key === requestedSite);
  const expectedCount = requestedSite === "all"
    ? 27
    : requestedSite === "pages"
      ? 20
      : 1;
  if (selected.length !== expectedCount) {
    fail("BABY_DEPLOY_SITE_SCOPE", `${requestedSite}:${selected.length}`);
  }
  return selected;
}

function assertPublicationPermission(site, allowNonpublic) {
  assertPagesHostingProvider(site);
  const mode = classifyPublication(site);
  if (mode === "nonpublic" && !allowNonpublic) {
    fail("BABY_DEPLOY_NONPUBLIC_BUILD_REFUSED", site.key);
  }
  return mode;
}

function parseJson(value, code, detail) {
  try {
    return JSON.parse(value);
  } catch {
    fail(code, detail);
  }
}

export async function runDeploymentPipeline({
  argv = [],
  root = ROOT,
  dependencies = {},
} = {}) {
  const deps = { ...DEFAULT_DEPENDENCIES, ...dependencies };
  const options = parseDeployArgs(argv);
  const inventoryFile = path.join(root, INVENTORY_PATH);
  const inventoryRaw = await deps.readText(inventoryFile);
  const inventory = parseJson(
    inventoryRaw,
    "BABY_CLOUDFLARE_INVENTORY_JSON_INVALID",
    inventoryFile,
  );
  const allSites = validateInventory(inventory);
  const selectedSites = selectSites(allSites, options.requestedSite);
  const inventoryFileDigest = sha256(inventoryRaw);

  // Every local precondition is checked before the first Cloudflare command.
  const publicationModes = new Map();
  for (const site of selectedSites) {
    publicationModes.set(
      site.key,
      assertPublicationPermission(site, options.allowNonpublic),
    );
  }
  const gitState = await deps.getGitState(root);
  const gitHead = assertDeployableGitState(gitState);

  const prepared = [];
  for (const site of selectedSites) {
    const outputDirectory = path.join(root, "dist", site.key);
    const receiptFile = path.join(outputDirectory, ".baby-build.json");
    const receiptRaw = await deps.readText(receiptFile).catch((error) => {
      if (error?.code === "ENOENT") {
        fail("BABY_DEPLOY_BUILD_RECEIPT_MISSING", site.key);
      }
      throw error;
    });
    const buildReceipt = parseJson(
      receiptRaw,
      "BABY_DEPLOY_BUILD_RECEIPT_JSON_INVALID",
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
    const deployArgs = buildDeployArgs({
      outputDirectory,
      site,
      branch: options.branch,
      gitHead,
    });
    prepared.push({ site, outputDirectory, artifact, deployArgs });
  }

  const receiptBase = {
    schemaVersion: DEPLOY_RECEIPT_SCHEMA_VERSION,
    provider: "cloudflare-pages",
    wranglerVersion: "4.124.0",
    generatedAt: deps.now(),
    requestedSite: options.requestedSite,
    branch: options.branch,
    dryRun: options.dryRun,
    createProjects: options.createProjects,
    allowNonpublic: options.allowNonpublic,
    gitHead,
    sourceTreeClean: true,
    inventoryDigest: inventory.inventoryDigest,
    inventoryFileDigest,
    deploymentCount: prepared.length,
  };
  const plannedDeployments = prepared.map(({ site, artifact, deployArgs }) => ({
    siteKey: site.key,
    projectName: site.projectName,
    plannedOrigin: site.plannedOrigin,
    hostingProvider: site.hostingProvider,
    hostingOrigin: site.hostingOrigin,
    publicOrigin: site.publicOrigin,
    publicationMode: publicationModes.get(site.key),
    artifact,
    wranglerArgs: deployArgs,
    observedUrls: [],
  }));

  if (options.dryRun) {
    return {
      status: "DRY_RUN",
      receiptPath: null,
      receipt: { ...receiptBase, status: "DRY_RUN", deployments: plannedDeployments },
    };
  }

  let projects = parseWranglerProjectList(
    await deps.runWrangler(["pages", "project", "list", "--json"], root),
  );
  // If any of the 27 known projects already exists, its pages.dev binding must
  // agree with the committed inventory even when it is outside --site scope.
  for (const site of allSites.filter(
    (candidate) => candidate.hostingProvider === PAGES_HOSTING_PROVIDER,
  )) {
    if (projects.has(site.projectName)) assertRemoteProjectMapping(site, projects);
  }

  const missing = selectedSites.filter((site) => !projects.has(site.projectName));
  if (missing.length && !options.createProjects) {
    fail(
      "BABY_CLOUDFLARE_PROJECT_MISSING",
      missing.map((site) => site.projectName).join(","),
    );
  }
  for (const site of missing) {
    await deps.runWrangler(
      [
        "pages",
        "project",
        "create",
        site.projectName,
        "--production-branch",
        options.branch,
      ],
      root,
    );
  }
  if (missing.length) {
    projects = parseWranglerProjectList(
      await deps.runWrangler(["pages", "project", "list", "--json"], root),
    );
  }
  for (const site of selectedSites) assertRemoteProjectMapping(site, projects);

  const deployments = [];
  for (const item of prepared) {
    const output = await deps.runWrangler(item.deployArgs, root);
    deployments.push({
      siteKey: item.site.key,
      projectName: item.site.projectName,
      plannedOrigin: item.site.plannedOrigin,
      hostingProvider: item.site.hostingProvider,
      hostingOrigin: item.site.hostingOrigin,
      publicOrigin: item.site.publicOrigin,
      publicationMode: publicationModes.get(item.site.key),
      artifact: item.artifact,
      wranglerArgs: item.deployArgs,
      observedUrls: extractDeploymentUrls(output),
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
  const result = await runDeploymentPipeline({ argv: process.argv.slice(2) });
  console.log(JSON.stringify(result, null, 2));
}
