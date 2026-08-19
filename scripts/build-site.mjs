import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  BUILD_RECEIPT_SCHEMA_VERSION,
  classifyPublication,
  computeDirectoryDigest,
  sha256,
  validateInventory,
} from "./lib/cloudflare-pages-contract.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const inventoryRaw = await readFile(
  path.join(ROOT, "src/data/city-regions.generated.json"),
  "utf8",
);
const inventory = JSON.parse(inventoryRaw);
validateInventory(inventory);
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const siteKey = args.get("--site") ?? process.env.BABY_SITE_KEY;
const site = inventory.sites.find((candidate) => candidate.key === siteKey);
if (!site) {
  throw new Error(`USAGE: node scripts/build-site.mjs --site <${inventory.sites.map((item) => item.key).join("|")}>`);
}

function readSourceGitState() {
  const headResult = spawnSync("git", ["rev-parse", "--verify", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const statusResult = spawnSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (statusResult.status !== 0) {
    throw new Error(
      `BABY_SITE_BUILD_GIT_STATUS_FAILED:${site.key}:${statusResult.status ?? "signal"}`,
    );
  }
  return {
    head:
      headResult.status === 0 && /^[0-9a-f]{40}$/u.test(headResult.stdout.trim())
        ? headResult.stdout.trim()
        : null,
    clean: statusResult.stdout.trim().length === 0,
  };
}

const sourceGitBefore = readSourceGitState();

const gaMeasurementId =
  process.env[site.gaMeasurementIdEnv]?.trim() ?? "";
if (
  site.isPublic &&
  !/^G-[A-Z0-9]{4,15}$/u.test(gaMeasurementId)
) {
  throw new Error(
    `BABY_PUBLIC_GA4_MEASUREMENT_ID_REQUIRED:${site.key}:${site.gaMeasurementIdEnv}`,
  );
}

const outputRoot = path.join(ROOT, "out");
const nextRoot = path.join(ROOT, ".next");
const destination = path.resolve(
  args.get("--destination") ?? path.join(ROOT, "dist", site.key),
);
const allowedDistRoot = path.join(ROOT, "dist");
if (destination !== allowedDistRoot && !destination.startsWith(`${allowedDistRoot}${path.sep}`)) {
  throw new Error(`BABY_BUILD_DESTINATION_OUTSIDE_DIST:${destination}`);
}

await rm(nextRoot, { recursive: true, force: true });
await rm(outputRoot, { recursive: true, force: true });
await rm(destination, { recursive: true, force: true });

const build = spawnSync("pnpm", ["exec", "next", "build"], {
  cwd: ROOT,
  env: {
    ...process.env,
    BABY_SITE_KEY: site.key,
    // The client component intentionally has one static env reference. Each
    // independent build receives only its own stream ID here, preventing a
    // sibling site's GA4 stream from leaking into another deployment.
    NEXT_PUBLIC_GA_MEASUREMENT_ID: gaMeasurementId,
    NODE_ENV: "production",
  },
  stdio: "inherit",
});
if (build.status !== 0) {
  throw new Error(`BABY_SITE_BUILD_FAILED:${site.key}:${build.status ?? "signal"}`);
}
if (!(await stat(outputRoot)).isDirectory()) {
  throw new Error(`BABY_SITE_OUT_MISSING:${site.key}`);
}

await mkdir(path.dirname(destination), { recursive: true });
await cp(outputRoot, destination, { recursive: true, force: false });

// Next copies the entire public tree. A baby deployment may ship only its own
// city image pool, so every other city directory is removed from this explicit
// dist/<site> copy after the build.
const imageRoot = path.join(destination, "images", "baby-template11");
try {
  for (const entry of await readdir(imageRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== site.key) {
      await rm(path.join(imageRoot, entry.name), { recursive: true, force: true });
    }
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const audit = spawnSync(
  process.execPath,
  ["scripts/audit-built-output.mjs", "--site", site.key, "--output", destination],
  { cwd: ROOT, stdio: "inherit" },
);
if (audit.status !== 0) {
  throw new Error(`BABY_SITE_BUILD_AUDIT_FAILED:${site.key}:${audit.status ?? "signal"}`);
}

const sourceGitAfter = readSourceGitState();
const sourceHeadStable = Boolean(
  sourceGitBefore.head && sourceGitBefore.head === sourceGitAfter.head,
);
const gitHead = sourceHeadStable ? sourceGitAfter.head : null;
const sourceTreeClean = Boolean(
  sourceHeadStable && sourceGitBefore.clean && sourceGitAfter.clean,
);
const artifact = await computeDirectoryDigest(destination);

await writeFile(
  path.join(destination, ".baby-build.json"),
  `${JSON.stringify(
    {
      schemaVersion: BUILD_RECEIPT_SCHEMA_VERSION,
      siteKey: site.key,
      projectName: site.projectName,
      inventoryDigest: inventory.inventoryDigest,
      inventoryFileDigest: sha256(inventoryRaw),
      plannedOrigin: site.plannedOrigin,
      previewOrigin: site.previewOrigin,
      hostingProvider: site.hostingProvider,
      hostingOrigin: site.hostingOrigin,
      publicOrigin: site.publicOrigin,
      deploymentState: site.deploymentState,
      isPublic: site.isPublic,
      indexingEnabled: site.indexingEnabled,
      publicationMode: classifyPublication(site),
      regionalCanonicals: site.counts.regionalCanonicals,
      gitHead,
      sourceTreeClean,
      artifact,
      buildTimeDerivedSeoFields: false,
    },
    null,
    2,
  )}\n`,
);
await rm(outputRoot, { recursive: true, force: true });
console.log(JSON.stringify({ siteKey: site.key, destination }, null, 2));
