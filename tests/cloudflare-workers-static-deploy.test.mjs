import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  parseWorkersDeployArgs,
  runWorkersStaticDeploymentPipeline,
} from "../scripts/deploy-cloudflare-workers-static.mjs";
import {
  WORKERS_ACCOUNT_SUBDOMAIN,
  WORKERS_STATIC_SITE_SPECS,
  assertWorkersPublicationPermission,
  buildWorkersDeployArgs,
  buildWorkersStaticConfig,
  expectedWorkersOrigin,
  getWorkersStaticSpec,
  inspectWorkersStaticAssets,
  parseWorkerInspectionResult,
  validateWorkersStaticInventory,
} from "../scripts/lib/cloudflare-workers-static-contract.mjs";
import {
  classifyPublication,
  sha256,
  validateInventory,
} from "../scripts/lib/cloudflare-pages-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INVENTORY_RAW = await import("node:fs/promises").then(({ readFile }) =>
  readFile(path.join(ROOT, "src/data/city-regions.generated.json"), "utf8"),
);
const INVENTORY = JSON.parse(INVENTORY_RAW);
const GIT_HEAD = "a".repeat(40);
const ARTIFACT = {
  digest: `sha256:${"b".repeat(64)}`,
  fileCount: 120,
  totalBytes: 3_000_000,
};
const STATIC_ASSETS = {
  fileCount: 120,
  totalBytes: 3_000_000,
  maxFileBytes: 400_000,
  maxFile: "_next/static/example.js",
};

function cloneInventory() {
  return structuredClone(INVENTORY);
}

function buildReceipt(site) {
  return {
    schemaVersion: 2,
    siteKey: site.key,
    projectName: site.projectName,
    inventoryDigest: INVENTORY.inventoryDigest,
    inventoryFileDigest: sha256(INVENTORY_RAW),
    plannedOrigin: site.plannedOrigin,
    previewOrigin: site.previewOrigin,
    publicOrigin: site.publicOrigin,
    deploymentState: site.deploymentState,
    isPublic: site.isPublic,
    indexingEnabled: site.indexingEnabled,
    publicationMode: classifyPublication(site),
    regionalCanonicals: site.counts.regionalCanonicals,
    gitHead: GIT_HEAD,
    sourceTreeClean: true,
    artifact: ARTIFACT,
    buildTimeDerivedSeoFields: false,
  };
}

function mockDependencies({
  remoteExists = false,
  receiptTransform,
  gitState,
} = {}) {
  const wranglerCalls = [];
  const writes = [];
  const probes = [];
  return {
    wranglerCalls,
    writes,
    probes,
    dependencies: {
      readText: vi.fn(async (file) => {
        if (file.endsWith("city-regions.generated.json")) return INVENTORY_RAW;
        const siteKey = path.basename(path.dirname(file));
        const site = INVENTORY.sites.find((candidate) => candidate.key === siteKey);
        if (!site) throw new Error(`TEST_UNKNOWN_BUILD_RECEIPT:${file}`);
        const receipt = buildReceipt(site);
        return JSON.stringify(
          receiptTransform ? receiptTransform(receipt, site) : receipt,
        );
      }),
      getGitState: vi.fn(async () =>
        gitState ?? { head: GIT_HEAD, clean: true },
      ),
      computeDirectoryDigest: vi.fn(async () => ARTIFACT),
      inspectStaticAssets: vi.fn(async () => STATIC_ASSETS),
      inspectRemoteWorker: vi.fn(async () => ({
        exists: remoteExists,
        deploymentCount: remoteExists ? 1 : 0,
      })),
      withTemporaryConfig: vi.fn(async (_config, action) =>
        action("/tmp/baby-worker-wrangler.json"),
      ),
      runWrangler: vi.fn(async (args) => {
        wranglerCalls.push(args);
        const configIndex = args.indexOf("--config");
        expect(configIndex).toBeGreaterThan(0);
        return "Uploaded static assets";
      }),
      probeLiveOrigin: vi.fn(async (input) => {
        probes.push(input);
        return {
          origin: input.spec.origin,
          homeStatus: 200,
          canonical:
            input.publicationMode === "public"
              ? `${input.spec.origin}/`
              : `https://${input.site.key}.preview.gyeonggi-baby.invalid/`,
          robots:
            input.publicationMode === "public"
              ? ["index", "follow"]
              : ["noindex", "nofollow", "nocache"],
          sitemapStatus: 200,
        };
      }),
      writeReceipt: vi.fn(async (file, receipt) => {
        writes.push({ file, receipt });
      }),
      now: () => "2026-08-19T00:00:00.000Z",
    },
  };
}

describe("Cloudflare Workers static-assets hosting contract", () => {
  it("binds exactly the seven Pages-blocked sites to deterministic workers.dev origins", () => {
    expect(WORKERS_ACCOUNT_SUBDOMAIN).toBe("guncraft2000");
    expect(WORKERS_STATIC_SITE_SPECS).toHaveLength(7);
    expect(WORKERS_STATIC_SITE_SPECS.map((spec) => spec.siteKey)).toEqual([
      "uiwang",
      "uijeongbu",
      "paju",
      "pyeongtaek",
      "pocheon",
      "hanam",
      "hwaseong",
    ]);
    for (const spec of WORKERS_STATIC_SITE_SPECS) {
      expect(spec.origin).toBe(expectedWorkersOrigin(spec.workerName));
      expect(spec.origin).toBe(
        `https://${spec.workerName}.guncraft2000.workers.dev`,
      );
    }
    expect(validateWorkersStaticInventory(INVENTORY.sites)).toHaveLength(7);
  });

  it("accepts a public tuple only at the exact committed Workers origin", () => {
    const inventory = cloneInventory();
    const site = inventory.sites.find((candidate) => candidate.key === "uiwang");
    const spec = getWorkersStaticSpec(site.key);
    Object.assign(site, {
      deploymentState: "public",
      isPublic: true,
      indexingEnabled: true,
      publicOrigin: spec.origin,
    });
    expect(validateInventory(inventory)).toHaveLength(27);
    expect(validateWorkersStaticInventory(inventory.sites)[0].publicationMode).toBe(
      "public",
    );
    expect(
      assertWorkersPublicationPermission({
        site,
        spec,
        allowNonpublic: false,
      }),
    ).toBe("public");

    site.publicOrigin = "https://uiwang-ondam.pages.dev";
    expect(() => validateWorkersStaticInventory(inventory.sites)).toThrow(
      "BABY_WORKERS_PUBLIC_ORIGIN_MISMATCH:uiwang",
    );
  });

  it("requires an explicit override for a nonpublic staging build", () => {
    const site = INVENTORY.sites.find((candidate) => candidate.key === "uiwang");
    const spec = getWorkersStaticSpec(site.key);
    expect(() =>
      assertWorkersPublicationPermission({
        site,
        spec,
        allowNonpublic: false,
      }),
    ).toThrow("BABY_WORKERS_NONPUBLIC_BUILD_REFUSED:uiwang");
    expect(
      assertWorkersPublicationPermission({
        site,
        spec,
        allowNonpublic: true,
      }),
    ).toBe("nonpublic");
  });

  it("builds a pure-static, explicit 404 and trailing-slash Wrangler config", () => {
    const spec = getWorkersStaticSpec("uiwang");
    const config = buildWorkersStaticConfig({
      spec,
      outputDirectory: "/tmp/dist/uiwang",
    });
    expect(config).toEqual({
      name: "uiwang-ondam",
      compatibility_date: "2026-08-19",
      workers_dev: true,
      preview_urls: false,
      assets: {
        directory: "/tmp/dist/uiwang",
        not_found_handling: "404-page",
        html_handling: "force-trailing-slash",
        run_worker_first: false,
      },
    });
    expect(config).not.toHaveProperty("main");

    const args = buildWorkersDeployArgs({
      configPath: "/tmp/wrangler.json",
      gitHead: GIT_HEAD,
    });
    expect(args).toContain("--strict");
    expect(args).toContain(`baby-release:${GIT_HEAD}`);
  });

  it("distinguishes an existing Worker from Cloudflare code 10007", () => {
    expect(
      parseWorkerInspectionResult({ status: 0, stdout: "[]", stderr: "" }),
    ).toEqual({ exists: true, deploymentCount: 0 });
    expect(
      parseWorkerInspectionResult({
        status: 1,
        stdout: "",
        stderr: "This Worker does not exist. [code: 10007]",
      }),
    ).toEqual({ exists: false, deploymentCount: 0 });
    expect(() =>
      parseWorkerInspectionResult({
        status: 1,
        stdout: "",
        stderr: "authentication failed [code: 10000]",
      }),
    ).toThrow("BABY_WORKERS_INSPECTION_FAILED:1");
  });

  it("checks required export files and Cloudflare Free asset limits", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "baby-worker-assets-test-"));
    try {
      for (const file of [
        "index.html",
        "404.html",
        "robots.txt",
        "sitemap.xml",
        "rss.xml",
      ]) {
        await writeFile(path.join(directory, file), file, "utf8");
      }
      await mkdir(path.join(directory, "areas", "sample"), { recursive: true });
      await writeFile(
        path.join(directory, "areas", "sample", "index.html"),
        "regional",
        "utf8",
      );
      const result = await inspectWorkersStaticAssets(directory);
      expect(result.fileCount).toBe(6);
      expect(result.maxFileBytes).toBeGreaterThan(0);

      await rm(path.join(directory, "rss.xml"));
      await expect(inspectWorkersStaticAssets(directory)).rejects.toThrow(
        "BABY_WORKERS_REQUIRED_ASSET_MISSING:rss.xml",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects unknown scopes and malformed CLI booleans", () => {
    expect(
      parseWorkersDeployArgs(["--", "--site", "uiwang", "--dry-run", "yes"]),
    ).toMatchObject({ requestedSite: "uiwang", dryRun: true });
    expect(() => parseWorkersDeployArgs(["--site", "suwon"])).not.toThrow();
    expect(() => parseWorkersDeployArgs(["--dry-run", "true"])).toThrow(
      "BABY_WORKERS_ARGUMENT_BOOLEAN",
    );
    expect(() => parseWorkersDeployArgs(["--wat", "yes"])).toThrow(
      "BABY_WORKERS_ARGUMENT_UNKNOWN",
    );
  });
});

describe("Cloudflare Workers static-assets deployment pipeline", () => {
  it("plans all seven without remote calls or receipt writes", async () => {
    const mock = mockDependencies();
    const result = await runWorkersStaticDeploymentPipeline({
      argv: ["--site", "all", "--allow-nonpublic", "yes", "--dry-run", "yes"],
      root: "/mock/repo",
      dependencies: mock.dependencies,
    });
    expect(result.status).toBe("DRY_RUN");
    expect(result.receipt.deploymentCount).toBe(7);
    expect(result.receipt.deployments).toHaveLength(7);
    expect(mock.dependencies.inspectRemoteWorker).not.toHaveBeenCalled();
    expect(mock.dependencies.runWrangler).not.toHaveBeenCalled();
    expect(mock.dependencies.probeLiveOrigin).not.toHaveBeenCalled();
    expect(mock.dependencies.writeReceipt).not.toHaveBeenCalled();
  });

  it("rejects a non-fallback site before remote inspection", async () => {
    const mock = mockDependencies();
    await expect(
      runWorkersStaticDeploymentPipeline({
        argv: [
          "--site",
          "suwon",
          "--allow-nonpublic",
          "yes",
          "--dry-run",
          "yes",
        ],
        root: "/mock/repo",
        dependencies: mock.dependencies,
      }),
    ).rejects.toThrow("BABY_WORKERS_SITE_SCOPE:suwon:0");
    expect(mock.dependencies.inspectRemoteWorker).not.toHaveBeenCalled();
  });

  it("requires explicit creation permission when a Worker is absent", async () => {
    const mock = mockDependencies({ remoteExists: false });
    await expect(
      runWorkersStaticDeploymentPipeline({
        argv: ["--site", "uiwang", "--allow-nonpublic", "yes"],
        root: "/mock/repo",
        dependencies: mock.dependencies,
      }),
    ).rejects.toThrow("BABY_WORKERS_REMOTE_MISSING:uiwang-ondam");
    expect(mock.dependencies.runWrangler).not.toHaveBeenCalled();
    expect(mock.dependencies.probeLiveOrigin).not.toHaveBeenCalled();
  });

  it("deploys and probes one missing nonpublic Worker with both explicit gates", async () => {
    const mock = mockDependencies({ remoteExists: false });
    const result = await runWorkersStaticDeploymentPipeline({
      argv: [
        "--site",
        "uiwang",
        "--allow-nonpublic",
        "yes",
        "--create-workers",
        "yes",
      ],
      root: "/mock/repo",
      dependencies: mock.dependencies,
    });
    expect(result.status).toBe("PASS");
    expect(mock.wranglerCalls).toHaveLength(1);
    expect(mock.probes).toHaveLength(1);
    expect(mock.writes).toHaveLength(1);
    expect(result.receipt.deployments[0]).toMatchObject({
      siteKey: "uiwang",
      workerName: "uiwang-ondam",
      expectedOrigin: "https://uiwang-ondam.guncraft2000.workers.dev",
      publicationMode: "nonpublic",
      remoteExistedBeforeDeploy: false,
    });
  });

  it("rejects a stale receipt before inspecting or deploying a Worker", async () => {
    const mock = mockDependencies({
      receiptTransform: (receipt) => ({ ...receipt, schemaVersion: 1 }),
    });
    await expect(
      runWorkersStaticDeploymentPipeline({
        argv: [
          "--site",
          "uiwang",
          "--allow-nonpublic",
          "yes",
          "--create-workers",
          "yes",
        ],
        root: "/mock/repo",
        dependencies: mock.dependencies,
      }),
    ).rejects.toThrow("BABY_DEPLOY_BUILD_RECEIPT_MISMATCH:uiwang:schemaVersion");
    expect(mock.dependencies.inspectRemoteWorker).not.toHaveBeenCalled();
    expect(mock.dependencies.runWrangler).not.toHaveBeenCalled();
  });

  it("rejects a dirty tree before reading any build receipt", async () => {
    const mock = mockDependencies({
      gitState: { head: GIT_HEAD, clean: false },
    });
    await expect(
      runWorkersStaticDeploymentPipeline({
        argv: ["--site", "uiwang", "--allow-nonpublic", "yes"],
        root: "/mock/repo",
        dependencies: mock.dependencies,
      }),
    ).rejects.toThrow("BABY_DEPLOY_GIT_TREE_DIRTY");
    expect(mock.dependencies.computeDirectoryDigest).not.toHaveBeenCalled();
    expect(mock.dependencies.inspectRemoteWorker).not.toHaveBeenCalled();
  });
});
