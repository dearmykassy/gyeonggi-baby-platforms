import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import capitalJson from "../src/data/capital-regions.generated.json";
import cityInventoryJson from "../src/data/city-regions.generated.json";
import { ALL_BABY_SITES, type BabySiteKey } from "../src/data/site-registry";
import {
  BABY_REGION_INVENTORY_COUNTS,
  BABY_REGION_INVENTORY_DIGEST,
  BABY_REGION_SOURCE_FILE_SHA256,
  getCanonicalRegionRoutesForSite,
  getNodeBySegmentsForSite,
  getRegionChildrenForSite,
  getRegionNodesForSite,
  getRegionStaticParamsForSite,
  regionPath,
} from "../src/lib/regions";

const EXPECTED_SOURCE_FILE_SHA256 =
  "0242e5d86894321cba66b7f747675115520d856c7aaada870869e19f247500d2";
const EXPECTED_INVENTORY_DIGEST =
  "sha256:549bea2fa9653359110a811fba678e5ac7bd700d287a0b78b3abd3a1f6dc82cd";

const EXPECTED_COUNTS: Record<
  BabySiteKey,
  { leaves: number; hubs: number; canonicals: number; sourceUnits: number }
> = {
  goyang: { leaves: 30, hubs: 3, canonicals: 34, sourceUnits: 44 },
  gwacheon: { leaves: 7, hubs: 0, canonicals: 8, sourceUnits: 7 },
  gwangmyeong: { leaves: 6, hubs: 0, canonicals: 7, sourceUnits: 19 },
  "gwangju-gyeonggi": {
    leaves: 14,
    hubs: 0,
    canonicals: 15,
    sourceUnits: 16,
  },
  guri: { leaves: 5, hubs: 0, canonicals: 6, sourceUnits: 8 },
  gunpo: { leaves: 10, hubs: 0, canonicals: 11, sourceUnits: 12 },
  gimpo: { leaves: 13, hubs: 0, canonicals: 14, sourceUnits: 14 },
  namyangju: { leaves: 15, hubs: 0, canonicals: 16, sourceUnits: 16 },
  dongducheon: { leaves: 7, hubs: 0, canonicals: 8, sourceUnits: 8 },
  bucheon: { leaves: 21, hubs: 3, canonicals: 25, sourceUnits: 37 },
  seongnam: { leaves: 30, hubs: 3, canonicals: 34, sourceUnits: 50 },
  suwon: { leaves: 29, hubs: 4, canonicals: 34, sourceUnits: 44 },
  siheung: { leaves: 15, hubs: 0, canonicals: 16, sourceUnits: 20 },
  ansan: { leaves: 21, hubs: 2, canonicals: 24, sourceUnits: 25 },
  anseong: { leaves: 13, hubs: 0, canonicals: 14, sourceUnits: 15 },
  anyang: { leaves: 20, hubs: 2, canonicals: 23, sourceUnits: 31 },
  yangju: { leaves: 8, hubs: 0, canonicals: 9, sourceUnits: 12 },
  yeoncheon: { leaves: 10, hubs: 0, canonicals: 11, sourceUnits: 10 },
  osan: { leaves: 6, hubs: 0, canonicals: 7, sourceUnits: 8 },
  yongin: { leaves: 30, hubs: 3, canonicals: 34, sourceUnits: 39 },
  uiwang: { leaves: 5, hubs: 0, canonicals: 6, sourceUnits: 6 },
  uijeongbu: { leaves: 10, hubs: 0, canonicals: 11, sourceUnits: 15 },
  paju: { leaves: 13, hubs: 0, canonicals: 14, sourceUnits: 20 },
  pyeongtaek: { leaves: 23, hubs: 0, canonicals: 24, sourceUnits: 25 },
  pocheon: { leaves: 14, hubs: 0, canonicals: 15, sourceUnits: 14 },
  hanam: { leaves: 9, hubs: 0, canonicals: 10, sourceUnits: 14 },
  hwaseong: { leaves: 20, hubs: 4, canonicals: 25, sourceUnits: 29 },
};

type CapitalRecord = (typeof capitalJson.regions)[number];
type GeneratedSite = (typeof cityInventoryJson.sites)[number];
type GeneratedRecord = GeneratedSite["regions"][number];

const sourcePath = fileURLToPath(
  new URL("../src/data/capital-regions.generated.json", import.meta.url),
);
const sourceById = new Map<string, CapitalRecord>(
  capitalJson.regions.map((record) => [record.id, record]),
);

describe("collapsed Gyeonggi baby region inventory", () => {
  it("pins the committed source bytes and deterministic inventory digest", () => {
    const actualSourceSha = createHash("sha256")
      .update(readFileSync(sourcePath))
      .digest("hex");

    expect(actualSourceSha).toBe(EXPECTED_SOURCE_FILE_SHA256);
    expect(BABY_REGION_SOURCE_FILE_SHA256).toBe(EXPECTED_SOURCE_FILE_SHA256);
    expect(BABY_REGION_INVENTORY_DIGEST).toBe(EXPECTED_INVENTORY_DIGEST);
    expect(cityInventoryJson.inventoryDigest).toBe(EXPECTED_INVENTORY_DIGEST);
  });

  it("keeps 27 homes + 24 district hubs + 404 representative leaves = 455 canonicals", () => {
    expect(BABY_REGION_INVENTORY_COUNTS).toEqual({
      targetSites: 27,
      homes: 27,
      districtHubs: 24,
      representativeLeaves: 404,
      regionalCanonicals: 455,
    });

    const allNodes = ALL_BABY_SITES.flatMap((site) =>
      getRegionNodesForSite(site),
    );
    expect(allNodes.filter((node) => node.kind === "home")).toHaveLength(27);
    expect(allNodes.filter((node) => node.kind === "district")).toHaveLength(24);
    expect(
      allNodes.filter((node) => node.kind === "representative"),
    ).toHaveLength(404);
    expect(allNodes).toHaveLength(455);
  });

  it("matches every site's exact collapsed count without expanding 558 source units", () => {
    let sourceUnitTotal = 0;

    for (const site of ALL_BABY_SITES) {
      const expected = EXPECTED_COUNTS[site.key];
      const nodes = getRegionNodesForSite(site);
      const leaves = nodes.filter((node) => node.kind === "representative");
      const hubs = nodes.filter((node) => node.kind === "district");
      const sourceUnits = leaves.reduce(
        (total, node) =>
          total + (node.representative?.sourceNames.length ?? 0),
        0,
      );

      expect(leaves).toHaveLength(expected.leaves);
      expect(hubs).toHaveLength(expected.hubs);
      expect(nodes).toHaveLength(expected.canonicals);
      expect(sourceUnits).toBe(expected.sourceUnits);
      expect(getRegionStaticParamsForSite(site)).toHaveLength(
        expected.canonicals - 1,
      );
      expect(getRegionChildrenForSite(site, [])).toHaveLength(
        expected.hubs || expected.leaves,
      );
      sourceUnitTotal += sourceUnits;
    }

    expect(sourceUnitTotal).toBe(558);
  });

  it("excludes exactly the four owner-blocked municipalities and retains Yeoncheon", () => {
    expect(cityInventoryJson.excludedMunicipalities).toEqual([
      "가평군",
      "이천시",
      "양평군",
      "여주시",
    ]);
    expect(ALL_BABY_SITES.map((site) => site.officialName)).toContain("연천군");

    const generatedMunicipalities = new Set(
      cityInventoryJson.sites.map((site) => site.officialName),
    );
    for (const excluded of cityInventoryJson.excludedMunicipalities) {
      expect(generatedMunicipalities.has(excluded)).toBe(false);
    }
  });

  it("preserves every committed official identity while rebasing only the route", () => {
    const preservedFields = [
      "sidoKey",
      "sidoName",
      "municipality",
      "district",
      "officialSigungu",
      "name",
      "groupType",
      "reviewStatus",
      "legalIdentityMode",
      "sourceNames",
      "sourceCodes",
      "legalAreas",
    ] as const;
    const generatedIds = new Set<string>();

    for (const site of cityInventoryJson.sites) {
      for (const record of site.regions as GeneratedRecord[]) {
        const source = sourceById.get(record.id);
        expect(source, record.id).toBeDefined();
        for (const field of preservedFields) {
          expect(record[field], `${record.id}:${field}`).toEqual(source?.[field]);
        }
        expect(record.sourcePathSegments).toEqual(source?.pathSegments);
        expect(record.sourcePath).toBe(source?.path);
        expect(record.pathSegments).toEqual(source?.pathSegments.slice(2));
        expect(record.path).toBe(regionPath(record.pathSegments));
        generatedIds.add(record.id);
      }
    }

    const expectedIds = capitalJson.regions
      .filter(
        (record) =>
          record.sidoKey === "gyeonggi" &&
          !cityInventoryJson.excludedMunicipalities.includes(
            record.municipality,
          ),
      )
      .map((record) => record.id);
    expect(generatedIds).toEqual(new Set(expectedIds));
  });

  it("keeps routes city-local, unique, and free of the old city prefix", () => {
    const fullCanonicalUrls = new Set<string>();

    for (const site of ALL_BABY_SITES) {
      const inventorySite = cityInventoryJson.sites.find(
        (entry) => entry.key === site.key,
      );
      expect(inventorySite).toBeDefined();

      const nodes = getRegionNodesForSite(site);
      const paths = getCanonicalRegionRoutesForSite(site);
      expect(paths).toHaveLength(nodes.length);
      expect(new Set(paths).size).toBe(paths.length);
      expect(paths[0]).toBe("/");
      expect(paths).not.toContain("/areas/");
      expect(paths.slice(1).every((path) => path.startsWith("/areas/"))).toBe(
        true,
      );

      for (const node of nodes) {
        expect(node.siteKey).toBe(site.key);
        expect(node.municipalityOfficialName).toBe(site.officialName);
        expect(node.segments).not.toContain(site.officialName);
        expect(node.path).not.toContain(encodeURIComponent(site.officialName));
        expect(fullCanonicalUrls.has(node.canonicalUrl)).toBe(false);
        fullCanonicalUrls.add(node.canonicalUrl);
      }

      for (const record of inventorySite?.regions ?? []) {
        expect(record.sourcePathSegments[1]).toBe(site.officialName);
        expect(record.municipality).toBe(site.officialName);
      }

      expect(getNodeBySegmentsForSite(site, [site.officialName])).toBeNull();
    }

    expect(fullCanonicalUrls).toHaveLength(455);
  });

  it("uses short city/county customer names at every home node", () => {
    const forbiddenSuffix = /(?:특별자치도|특별자치시|특별시|광역시|도|시|군)$/u;
    for (const site of ALL_BABY_SITES) {
      const home = getNodeBySegmentsForSite(site, []);
      expect(home?.kind).toBe("home");
      expect(home?.displayName).toBe(site.searchName);
      expect(home?.displayName).not.toMatch(forbiddenSuffix);
      expect(home?.officialName).toBe(site.officialName);
    }
  });
});
