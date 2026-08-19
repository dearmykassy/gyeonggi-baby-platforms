import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  getRegionRoadFacts,
  REGION_ROAD_FACT_DATA_DIGEST,
  REGION_ROAD_FACT_SOURCE,
} from "@/data/region-road-facts.generated";
import { ALL_BABY_SITES } from "@/lib/site-config";
import { getRegionNodesForSite } from "@/lib/regions";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const GENERATOR = fileURLToPath(
  new URL("../scripts/generate-region-road-facts.mjs", import.meta.url),
);
const GENERATED = fileURLToPath(
  new URL("../src/data/region-road-facts.generated.ts", import.meta.url),
);
const EXPECTED_DIGEST =
  "sha256:acf74bc883028b4570deef4a8d87248ba17ec35150e506e3836937d180402438";

describe("official regional road facts", () => {
  it("pins the official sources and deterministic corpus digest", () => {
    expect(REGION_ROAD_FACT_SOURCE).toMatchObject({
      agency: "행정안전부 도로명주소 업무 시스템 / 한국지역정보개발원",
      snapshotDate: "2026-07-31",
      archiveSha256:
        "da5c4007d696bf98f066b3832b53dc1f95d85b32fe1c479b7be79c42b3c6c1d9",
      roadNameSnapshot: "2026-07",
      roadNameArchiveSha256:
        "9234d8ed1c2fa8bd13e18e5a4a5f66e9b5dea409421845ec77dd01a33e3f365f",
      roadNameEntrySha256:
        "2dab7220a8602fbc5711123641c932a93e4a70578dd6c9bf1a1803943028e57c",
      dataDigest: EXPECTED_DIGEST,
    });
    expect(REGION_ROAD_FACT_DATA_DIGEST).toBe(EXPECTED_DIGEST);
  });

  it("covers every leaf with source-code and legal-name joined facts", () => {
    let routeCount = 0;
    for (const site of ALL_BABY_SITES) {
      for (const node of getRegionNodesForSite(site)) {
        if (node.kind !== "representative") continue;
        routeCount += 1;
        const sourceCodes = new Set(
          node.records.flatMap((record) => record.sourceCodes),
        );
        const legalNames = new Set(
          node.records.flatMap((record) =>
            record.legalAreas.map((area) => area.name),
          ),
        );
        const facts = getRegionRoadFacts(site.key, node.path);
        expect(facts.length, `${site.key}:${node.path}`).toBeGreaterThan(0);
        for (const fact of facts) {
          expect(sourceCodes.has(fact.adminCode)).toBe(true);
          expect(legalNames.has(fact.legalName)).toBe(true);
          expect(fact.roadNames).toHaveLength(8);
          expect(
            fact.roadLegalNames.every((name) => legalNames.has(name)),
          ).toBe(true);
        }
      }
    }
    expect(routeCount).toBe(404);
  });

  it("passes archive-free integrity checking without machine-local paths", () => {
    const output = execFileSync(
      process.execPath,
      ["--import", "tsx", GENERATOR, "--check"],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(JSON.parse(output)).toEqual({
      routeCount: 404,
      dataDigest: EXPECTED_DIGEST,
    });
    const generated = readFileSync(GENERATED, "utf8");
    expect(generated).not.toMatch(/\/Users\//u);
    expect(generated).not.toMatch(/\/private\/tmp\//u);
  });
});
