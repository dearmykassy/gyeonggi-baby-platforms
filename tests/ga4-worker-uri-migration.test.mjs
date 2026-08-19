import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  assessGa4State,
  buildExpectedGa4Sites,
  buildSafeReport,
  parseEnvFile,
} from "../scripts/lib/ga4-worker-uri-migration.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fixture() {
  const sites = Array.from({ length: 27 }, (_, index) => {
    const worker = index >= 20;
    const suffix = `SITE_${index}`;
    return {
      key: `site-${index}`,
      hostingProvider: worker
        ? "cloudflare-workers-static-assets"
        : "cloudflare-pages",
      plannedOrigin: `https://site-${index}.pages.dev`,
      hostingOrigin: worker
        ? `https://site-${index}.account.workers.dev`
        : `https://site-${index}.pages.dev`,
      gaPropertyIdEnv: `GA4_PROPERTY_ID_${suffix}`,
      gaMeasurementIdEnv: `NEXT_PUBLIC_GA_MEASUREMENT_ID_${suffix}`,
    };
  });
  const env = new Map();
  for (let index = 0; index < sites.length; index += 1) {
    env.set(sites[index].gaPropertyIdEnv, String(1000 + index));
    env.set(sites[index].gaMeasurementIdEnv, `G-TEST${String(index).padStart(2, "0")}`);
  }
  const expectedSites = buildExpectedGa4Sites({ inventory: { sites }, env });
  const states = expectedSites.map((site) => ({
    key: site.key,
    propertyName: site.propertyName,
    streamCount: 1,
    webStreamCount: 1,
    streamName: `${site.propertyName}/dataStreams/1`,
    measurementId: site.measurementId,
    defaultUri: site.plannedOrigin,
    enhancedPageHistoryEffective: false,
  }));
  return { expectedSites, states };
}

describe("GA4 Worker default-URI migration", () => {
  it("parses ignored local env values without interpreting them", () => {
    expect(parseEnvFile("# comment\nA=1\nB=x=y\n")).toEqual(
      new Map([
        ["A", "1"],
        ["B", "x=y"],
      ]),
    );
  });

  it("plans exactly the seven Worker URI migrations and leaves Pages alone", () => {
    const { expectedSites, states } = fixture();
    const assessment = assessGa4State({ expectedSites, states });
    expect(assessment.migrationPlan).toHaveLength(7);
    expect(assessment.migrationPlan.every((site) => site.key.startsWith("site-"))).toBe(true);
    expect(buildSafeReport({ phase: "BEFORE", assessment })).toMatchObject({
      status: "PASS",
      siteCount: 27,
      pageSiteCount: 20,
      workerSiteCount: 7,
      pageUrisUnchanged: true,
      workerUrisMatchTarget: false,
      enhancedPageHistoryEnabledCount: 0,
    });
  });

  it("rejects stream duplication, measurement mismatch, and enabled page history", () => {
    for (const patch of [
      { streamCount: 2 },
      { measurementId: "G-WRONG" },
      { enhancedPageHistoryEffective: true },
    ]) {
      const { expectedSites, states } = fixture();
      states[0] = { ...states[0], ...patch };
      expect(() => assessGa4State({ expectedSites, states })).toThrow();
    }
  });

  it("reports a complete migration only after all seven exact targets match", () => {
    const { expectedSites, states } = fixture();
    for (const state of states.slice(20)) {
      state.defaultUri = expectedSites.find((site) => site.key === state.key).targetOrigin;
    }
    const assessment = assessGa4State({ expectedSites, states });
    expect(assessment.migrationPlan).toHaveLength(0);
    expect(buildSafeReport({ phase: "AFTER", assessment })).toMatchObject({
      oneStreamPerProperty: true,
      measurementIdsMatch: true,
      workerUrisMatchTarget: true,
      pageUrisUnchanged: true,
      enhancedPageHistoryEnabledCount: 0,
    });
  });

  it("exposes an audit-first command that can PATCH but cannot create GA resources", async () => {
    const [packageJsonText, source] = await Promise.all([
      readFile(path.join(ROOT, "package.json"), "utf8"),
      readFile(
        path.join(ROOT, "scripts/migrate-ga4-worker-default-uris.mjs"),
        "utf8",
      ),
    ]);
    const packageJson = JSON.parse(packageJsonText);
    expect(packageJson.scripts["migrate:ga4-worker-uris"]).toBe(
      "node scripts/migrate-ga4-worker-default-uris.mjs",
    );
    expect(source).toContain('const apply = args.get("--apply") === "yes"');
    expect(source).toContain('url.searchParams.set("updateMask", "webStreamData.defaultUri")');
    expect(source).toContain('method: "PATCH"');
    expect(source.match(/method: "POST"/gu)).toHaveLength(1);
    expect(source).toContain('fetch("https://oauth2.googleapis.com/token"');
    expect(source).not.toContain("CREATE_PROPERTY");
    expect(source).not.toContain("CREATE_STREAM");
  });
});
