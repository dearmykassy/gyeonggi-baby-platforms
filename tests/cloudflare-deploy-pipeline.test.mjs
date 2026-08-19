import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { parseDeployArgs, runDeploymentPipeline } from "../scripts/deploy-cloudflare-pages.mjs";
import {
  assertRemoteProjectMapping,
  buildDeployArgs,
  classifyPublication,
  normalizeWranglerProjects,
  sha256,
  validateInventory,
} from "../scripts/lib/cloudflare-pages-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INVENTORY_RAW = await readFile(
  path.join(ROOT, "src/data/city-regions.generated.json"),
  "utf8",
);
const INVENTORY = JSON.parse(INVENTORY_RAW);
const GIT_HEAD = "a".repeat(40);
const ARTIFACT = {
  digest: `sha256:${"b".repeat(64)}`,
  fileCount: 12,
  totalBytes: 3456,
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

function mockDependencies({ wranglerOutput, receiptTransform, gitState } = {}) {
  const calls = [];
  const writes = [];
  return {
    calls,
    writes,
    dependencies: {
      readText: vi.fn(async (file) => {
        if (file.endsWith("city-regions.generated.json")) return INVENTORY_RAW;
        const key = path.basename(path.dirname(file));
        const site = INVENTORY.sites.find((candidate) => candidate.key === key);
        if (!site) throw new Error(`TEST_UNKNOWN_BUILD_RECEIPT:${file}`);
        const receipt = buildReceipt(site);
        return JSON.stringify(receiptTransform ? receiptTransform(receipt, site) : receipt);
      }),
      getGitState: vi.fn(async () => gitState ?? { head: GIT_HEAD, clean: true }),
      computeDirectoryDigest: vi.fn(async () => ARTIFACT),
      runWrangler: vi.fn(async (args) => {
        calls.push(args);
        if (args.join(" ") === "pages project list --json") {
          return wranglerOutput ?? "[]";
        }
        return "Deployment complete: https://preview.example.pages.dev";
      }),
      writeReceipt: vi.fn(async (file, receipt) => {
        writes.push({ file, receipt });
      }),
      now: () => "2026-08-19T00:00:00.000Z",
    },
  };
}

describe("Cloudflare Pages inventory and command contract", () => {
  it("binds exactly 27 project names to their exact pages.dev origins", () => {
    const sites = validateInventory(INVENTORY);
    expect(sites).toHaveLength(27);
    for (const site of sites) {
      expect(site.plannedOrigin).toBe(`https://${site.projectName}.pages.dev`);
      expect(site.previewOrigin).toBe(site.plannedOrigin);
    }
  });

  it("rejects a mismatched project/origin pair", () => {
    const inventory = cloneInventory();
    inventory.sites[0].plannedOrigin = "https://wrong-project.pages.dev";
    expect(() => validateInventory(inventory)).toThrow(
      "BABY_CLOUDFLARE_PROJECT_ORIGIN_MISMATCH",
    );
  });

  it("fails closed for mixed publication state and accepts an exact public tuple", () => {
    const mixed = {
      ...INVENTORY.sites[0],
      indexingEnabled: !INVENTORY.sites[0].indexingEnabled,
    };
    expect(() => classifyPublication(mixed)).toThrow(
      "BABY_CLOUDFLARE_PUBLICATION_STATE_INCONSISTENT",
    );

    const published = {
      ...INVENTORY.sites[0],
      deploymentState: "public",
      isPublic: true,
      indexingEnabled: true,
      publicOrigin: "https://example.kr",
    };
    expect(classifyPublication(published)).toBe("public");
  });

  it("normalizes both current Wrangler display rows and raw API rows", () => {
    const site = INVENTORY.sites.find((candidate) => candidate.key === "suwon");
    const display = normalizeWranglerProjects([
      {
        "Project Name": site.projectName,
        "Project Domains": `${new URL(site.plannedOrigin).hostname}, custom.example.kr`,
      },
    ]);
    expect([...display.get(site.projectName).domains]).toEqual([
      new URL(site.plannedOrigin).hostname,
      "custom.example.kr",
    ]);

    const raw = normalizeWranglerProjects({
      result: [
        {
          name: site.projectName,
          domains: ["custom.example.kr"],
          subdomain: new URL(site.plannedOrigin).hostname,
        },
      ],
    });
    assertRemoteProjectMapping(site, raw);
  });

  it("rejects a remote project whose pages.dev origin does not match", () => {
    const site = INVENTORY.sites.find((candidate) => candidate.key === "suwon");
    const projects = normalizeWranglerProjects([
      { "Project Name": site.projectName, "Project Domains": "other.pages.dev" },
    ]);
    expect(() => assertRemoteProjectMapping(site, projects)).toThrow(
      "BABY_CLOUDFLARE_REMOTE_ORIGIN_MISMATCH",
    );
  });

  it("uses Wrangler's boolean syntax for an explicitly clean commit", () => {
    const site = INVENTORY.sites[0];
    const args = buildDeployArgs({
      outputDirectory: "/tmp/dist/site",
      site,
      branch: "main",
      gitHead: GIT_HEAD,
    });
    expect(args.filter((value) => value === "--commit-dirty=false")).toHaveLength(1);
    expect(args).not.toContain("--commit-dirty");
    expect(args).not.toContain("false");
    expect(args).toContain(GIT_HEAD);
  });

  it("rejects unknown, duplicate, and malformed CLI arguments", () => {
    expect(parseDeployArgs(["--", "--site", "suwon", "--dry-run", "yes"])).toMatchObject({
      requestedSite: "suwon",
      dryRun: true,
    });
    expect(() => parseDeployArgs(["--wat", "yes"])).toThrow(
      "BABY_DEPLOY_ARGUMENT_UNKNOWN",
    );
    expect(() => parseDeployArgs(["--site", "suwon", "--site", "goyang"])).toThrow(
      "BABY_DEPLOY_ARGUMENT_DUPLICATE",
    );
    expect(() => parseDeployArgs(["--dry-run", "true"])).toThrow(
      "BABY_DEPLOY_ARGUMENT_BOOLEAN",
    );
  });
});

describe("Cloudflare Pages dry-run and mocked CLI pipeline", () => {
  it("refuses a planned site without the explicit nonpublic override", async () => {
    const mock = mockDependencies();
    await expect(
      runDeploymentPipeline({
        argv: ["--site", "uiwang", "--dry-run", "yes"],
        root: "/mock/repo",
        dependencies: mock.dependencies,
      }),
    ).rejects.toThrow("BABY_DEPLOY_NONPUBLIC_BUILD_REFUSED:uiwang");
    expect(mock.dependencies.runWrangler).not.toHaveBeenCalled();
  });

  it("plans all 27 sites without any Wrangler call or receipt write", async () => {
    const mock = mockDependencies();
    const result = await runDeploymentPipeline({
      argv: ["--site", "all", "--allow-nonpublic", "yes", "--dry-run", "yes"],
      root: "/mock/repo",
      dependencies: mock.dependencies,
    });

    expect(result.status).toBe("DRY_RUN");
    expect(result.receiptPath).toBeNull();
    expect(result.receipt.deploymentCount).toBe(27);
    expect(result.receipt.deployments).toHaveLength(27);
    expect(mock.dependencies.runWrangler).not.toHaveBeenCalled();
    expect(mock.dependencies.writeReceipt).not.toHaveBeenCalled();
    for (const deployment of result.receipt.deployments) {
      expect(deployment.wranglerArgs).toContain("--commit-dirty=false");
      const site = INVENTORY.sites.find(
        (candidate) => candidate.key === deployment.siteKey,
      );
      expect(deployment.publicationMode).toBe(classifyPublication(site));
    }
  });

  it("rejects a dirty source tree before reading build receipts or invoking Wrangler", async () => {
    const mock = mockDependencies({ gitState: { head: GIT_HEAD, clean: false } });
    await expect(
      runDeploymentPipeline({
        argv: ["--site", "suwon", "--allow-nonpublic", "yes", "--dry-run", "yes"],
        root: "/mock/repo",
        dependencies: mock.dependencies,
      }),
    ).rejects.toThrow("BABY_DEPLOY_GIT_TREE_DIRTY");
    expect(mock.dependencies.runWrangler).not.toHaveBeenCalled();
    expect(mock.dependencies.computeDirectoryDigest).not.toHaveBeenCalled();
  });

  it("rejects a stale build receipt before invoking Wrangler", async () => {
    const mock = mockDependencies({
      receiptTransform: (receipt) => ({ ...receipt, schemaVersion: 1 }),
    });
    await expect(
      runDeploymentPipeline({
        argv: ["--site", "suwon", "--allow-nonpublic", "yes"],
        root: "/mock/repo",
        dependencies: mock.dependencies,
      }),
    ).rejects.toThrow("BABY_DEPLOY_BUILD_RECEIPT_MISMATCH:suwon:schemaVersion");
    expect(mock.dependencies.runWrangler).not.toHaveBeenCalled();
    expect(mock.dependencies.writeReceipt).not.toHaveBeenCalled();
  });

  it("rejects a build whose current artifact digest no longer matches its receipt", async () => {
    const mock = mockDependencies({
      receiptTransform: (receipt) => ({
        ...receipt,
        artifact: { ...receipt.artifact, digest: `sha256:${"c".repeat(64)}` },
      }),
    });
    await expect(
      runDeploymentPipeline({
        argv: ["--site", "suwon", "--allow-nonpublic", "yes", "--dry-run", "yes"],
        root: "/mock/repo",
        dependencies: mock.dependencies,
      }),
    ).rejects.toThrow("BABY_DEPLOY_BUILD_ARTIFACT_MISMATCH:suwon");
    expect(mock.dependencies.runWrangler).not.toHaveBeenCalled();
  });

  it("uses the current Wrangler list shape, deploys one exact project, and writes a receipt", async () => {
    const site = INVENTORY.sites.find((candidate) => candidate.key === "suwon");
    const mock = mockDependencies({
      wranglerOutput: JSON.stringify([
        {
          "Project Name": site.projectName,
          "Project Domains": new URL(site.plannedOrigin).hostname,
        },
      ]),
    });
    const result = await runDeploymentPipeline({
      argv: ["--site", "suwon", "--allow-nonpublic", "yes"],
      root: "/mock/repo",
      dependencies: mock.dependencies,
    });

    expect(result.status).toBe("PASS");
    expect(mock.calls).toHaveLength(2);
    expect(mock.calls[0]).toEqual(["pages", "project", "list", "--json"]);
    expect(mock.calls[1]).toEqual(result.receipt.deployments[0].wranglerArgs);
    expect(mock.calls[1]).toContain("--commit-dirty=false");
    expect(mock.writes).toHaveLength(1);
    expect(mock.writes[0].receipt.status).toBe("PASS");
    expect(result.receipt.deployments[0].observedUrls).toEqual([
      "https://preview.example.pages.dev",
    ]);
  });

  it("creates a missing project only with the explicit flag and rechecks its origin", async () => {
    const site = INVENTORY.sites.find((candidate) => candidate.key === "suwon");
    const mock = mockDependencies();
    let listCount = 0;
    mock.dependencies.runWrangler = vi.fn(async (args) => {
      mock.calls.push(args);
      if (args.join(" ") === "pages project list --json") {
        listCount += 1;
        return listCount === 1
          ? "[]"
          : JSON.stringify([
              {
                "Project Name": site.projectName,
                "Project Domains": new URL(site.plannedOrigin).hostname,
              },
            ]);
      }
      return "Deployment complete";
    });

    await runDeploymentPipeline({
      argv: [
        "--site",
        "suwon",
        "--allow-nonpublic",
        "yes",
        "--create-projects",
        "yes",
      ],
      root: "/mock/repo",
      dependencies: mock.dependencies,
    });

    expect(mock.calls).toHaveLength(4);
    expect(mock.calls[1]).toEqual([
      "pages",
      "project",
      "create",
      site.projectName,
      "--production-branch",
      "main",
    ]);
    expect(mock.calls[2]).toEqual(["pages", "project", "list", "--json"]);
    expect(mock.calls[3].slice(0, 2)).toEqual(["pages", "deploy"]);
  });
});
