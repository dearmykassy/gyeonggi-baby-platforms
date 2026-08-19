import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import cityInventoryJson from "../src/data/city-regions.generated.json";
import {
  getRegionPublicFacilityFacts,
  REGION_PUBLIC_FACILITY_DATA_DIGEST,
  REGION_PUBLIC_FACILITY_SOURCE,
  type RegionPublicFacilityFact,
} from "../src/data/region-public-facilities.generated";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const GENERATED_PATH = fileURLToPath(
  new URL("../src/data/region-public-facilities.generated.ts", import.meta.url),
);
const GENERATOR_PATH = fileURLToPath(
  new URL("../scripts/generate-region-public-facilities.mjs", import.meta.url),
);
const LOW_ROUTE = "hanam:/areas/%EC%B4%88%EC%9D%B4%EB%8F%99/";
const EXPECTED_FACT_FIELDS = [
  "addressRowSha256",
  "adminCode",
  "adminName",
  "auxRowSha256",
  "category",
  "jibunRowSha256",
  "legalName",
  "name",
  "roadCodeRowSha256",
  "roadName",
  "sourceField",
] as const;
const ROW_SHA_FIELDS = [
  "auxRowSha256",
  "addressRowSha256",
  "roadCodeRowSha256",
  "jibunRowSha256",
] as const;
const SOURCE_FIELDS = new Set([
  "sigungu_building_name",
  "building_registry_name",
  "bulk_delivery_name",
]);
const RELIGIOUS =
  /교회|성당|사찰|암자|선교|성전|기도원|수도원|불교|원불교|천주교|침례|장로|감리|순복음|성결|성분도|신학|기독|교구|가톨릭|카톨릭|SGI|IYF/iu;
const RESIDENTIAL =
  /아파트|\bAPT\b|빌라|연립|다세대|오피스텔|원룸|고시원|기숙사|생활관|숙소|사택|관사|맨션|캐슬|팰리스|타운하우스|도시형생활|레지던스|펜션|행복주택/iu;
const PRIVATE_MEDICAL =
  /병원|의원|약국|한의원|치과|클리닉|산후조리|요양원|요양병원|안마원/u;
const PRIVATE_CHILDCARE = /어린이집|보육원|유치원/u;
const COMPANY =
  /주식회사|㈜|\(주\)|주\)|유한회사|영농조합|협동조합|공장|창고|물류센터|산업단지|무역|용역|교역|팩토리|테크노|건축사|택시/u;
const RETAIL =
  /상가|마트|슈퍼|백화점|쇼핑몰|아울렛|편의점|호텔|모텔|리조트|카페|식당|음식점|골프|헬스|웨딩|장례|프라자|플라자|빌딩|타워|스퀘어|오피스|시장(?=\s|제\d|공영|$)/u;
const PII =
  /(?:0\d{1,2}[- ]?)?\d{3,4}[- ]\d{4}|\d{8,}|소유자|대표자|외\s*\d+\s*(?:명|인)|개인|제[12]종근린생활시설\s*\([^)]{2,}\)/u;
const AUXILIARY_PRIVATE = /자율방범|모범운전자|의용소방|직장어린이집|동아리실/u;
const ADDRESS_LIKE_NAME = /\d+\s*-\s*\d+/u;
const TRANSIT_STOP_NAME = /(?:정거장|역)$/u;
const COMPOSITE_OR_RESIDENTIAL_NAME = /[,/]|및|입주자|집회소/u;

function normalizeAdminName(value: string): string {
  return value.normalize("NFKC").replace(/[\s·ㆍ.,/()\-]+/gu, "");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

type InventoryRegion = (typeof cityInventoryJson.sites)[number]["regions"][number];
type RouteContract = Readonly<{
  siteKey: string;
  path: string;
  route: string;
  region: InventoryRegion;
}>;

const routes: readonly RouteContract[] = cityInventoryJson.sites.flatMap(
  (site) =>
    site.regions.map((region) => ({
      siteKey: site.key,
      path: region.path,
      route: `${site.key}:${region.path}`,
      region,
    })),
);

function factsByRoute(): Record<string, readonly RegionPublicFacilityFact[]> {
  return Object.fromEntries(
    routes.map(({ siteKey, path, route }) => [
      route,
      getRegionPublicFacilityFacts(siteKey, path),
    ]),
  );
}

describe("official public-facility relation inventory", () => {
  it("pins the official snapshot, archive entries, join contract, and digest", () => {
    expect(REGION_PUBLIC_FACILITY_SOURCE).toMatchObject({
      agency: "행정안전부 도로명주소 업무 시스템 / 한국지역정보개발원",
      dataset: "주소DB 전국 전체분",
      snapshotDate: "2026-07-31",
      archiveSha256:
        "da5c4007d696bf98f066b3832b53dc1f95d85b32fe1c479b7be79c42b3c6c1d9",
      routeCount: 404,
      facilityCount: 2325,
      dataDigest:
        "sha256:cfee0fa7239df1d1422af491b46e7f44130818117986c98edc9c72bc0888afa2",
      buildingNumberIncluded: false,
      lowCoverageRoute: LOW_ROUTE,
    });
    expect(REGION_PUBLIC_FACILITY_SOURCE.downloadPageUrl).toMatch(
      /^https:\/\/business\.juso\.go\.kr\//u,
    );
    expect(REGION_PUBLIC_FACILITY_SOURCE.schemaUrl).toMatch(
      /^https:\/\/business\.juso\.go\.kr\//u,
    );
    expect(REGION_PUBLIC_FACILITY_SOURCE.joinReferenceUrl).toMatch(
      /^https:\/\/business\.juso\.go\.kr\//u,
    );
    expect(REGION_PUBLIC_FACILITY_SOURCE.entries).toEqual({
      auxiliary: {
        name: "부가정보_경기도.txt",
        bytes: 61_233_163,
        sha256:
          "80100767469d36f8464b5b1980bf1ca5e0579d037ae4ab3d5c7bbfc38decb7e7",
      },
      address: {
        name: "주소_경기도.txt",
        bytes: 63_540_625,
        sha256:
          "c18fd7e2c0b4077d8bfa17c196d748674f2325568a4a87883430b3d785991684",
      },
      roadCode: {
        name: "개선_도로명코드_전체분.txt",
        bytes: 41_544_497,
        sha256:
          "2b0295cdbf0accac1a31ea4112d6b04ef380228810ea89ed7e274daca7ab5896",
      },
      jibun: {
        name: "지번_경기도.txt",
        bytes: 102_576_380,
        sha256:
          "793a13c95d16d262399201a7ef351900709ef57d91b648534b34f5aa06a114d3",
      },
    });

    const allFacts = factsByRoute();
    expect(`sha256:${sha256(JSON.stringify(allFacts))}`).toBe(
      REGION_PUBLIC_FACILITY_DATA_DIGEST,
    );
    expect(REGION_PUBLIC_FACILITY_SOURCE.dataDigest).toBe(
      REGION_PUBLIC_FACILITY_DATA_DIGEST,
    );
  });

  it("covers all 404 representative leaves with exact admin and legal joins", () => {
    expect(routes).toHaveLength(404);
    let factCount = 0;

    for (const { siteKey, path, route, region } of routes) {
      const facts = getRegionPublicFacilityFacts(siteKey, path);
      expect(facts.length, route).toBeGreaterThanOrEqual(
        route === LOW_ROUTE ? 2 : 3,
      );
      expect(facts.length, route).toBeLessThanOrEqual(6);
      expect(new Set(facts.map((fact) => fact.name)).size, route).toBe(
        facts.length,
      );

      const sourceCodes = new Set<string>(region.sourceCodes);
      const sourceNames = new Set(
        region.sourceNames.map((name) => normalizeAdminName(name)),
      );
      const legalNames = new Set(region.legalAreas.map((area) => area.name));
      for (const fact of facts) {
        factCount += 1;
        expect(Object.keys(fact).sort(), `${route}:${fact.name}`).toEqual(
          EXPECTED_FACT_FIELDS,
        );
        expect(sourceCodes.has(fact.adminCode), `${route}:${fact.name}`).toBe(
          true,
        );
        expect(
          sourceNames.has(normalizeAdminName(fact.adminName)),
          `${route}:${fact.name}`,
        ).toBe(true);
        expect(legalNames.has(fact.legalName), `${route}:${fact.name}`).toBe(
          true,
        );
        expect(fact.roadName.trim(), `${route}:${fact.name}`).not.toBe("");
        expect(SOURCE_FIELDS.has(fact.sourceField)).toBe(true);
        for (const field of ROW_SHA_FIELDS) {
          expect(fact[field], `${route}:${fact.name}:${field}`).toMatch(
            /^[a-f0-9]{64}$/u,
          );
        }
      }
    }

    expect(factCount).toBe(2325);
    expect(
      getRegionPublicFacilityFacts("missing-site", "/areas/missing/"),
    ).toEqual([]);
  });

  it("contains no private, residential, religious, medical, or PII names", () => {
    for (const [route, facts] of Object.entries(factsByRoute())) {
      for (const fact of facts) {
        const context = `${route}:${fact.name}`;
        expect(RELIGIOUS.test(fact.name), context).toBe(false);
        expect(RESIDENTIAL.test(fact.name), context).toBe(false);
        expect(PRIVATE_MEDICAL.test(fact.name), context).toBe(false);
        expect(PRIVATE_CHILDCARE.test(fact.name), context).toBe(false);
        expect(PII.test(fact.name), context).toBe(false);
        expect(AUXILIARY_PRIVATE.test(fact.name), context).toBe(false);
        expect(ADDRESS_LIKE_NAME.test(fact.name), context).toBe(false);
        expect(TRANSIT_STOP_NAME.test(fact.name), context).toBe(false);
        expect(COMPOSITE_OR_RESIDENTIAL_NAME.test(fact.name), context).toBe(false);
        expect(
          COMPANY.test(fact.name) && fact.category !== "education",
          context,
        ).toBe(false);
        expect(
          RETAIL.test(fact.name) && fact.category !== "public_parking",
          context,
        ).toBe(false);
      }
    }
  });

  it("keeps management identifiers and machine-local paths out of public data", () => {
    const generated = readFileSync(GENERATED_PATH, "utf8");
    expect(generated).not.toMatch(/managementNumber/u);
    expect(generated).not.toMatch(/\/Users\//u);
    expect(generated).not.toMatch(/\/private\/tmp\//u);
  });

  it("passes archive-free deterministic inventory checking", () => {
    const stdout = execFileSync(process.execPath, [GENERATOR_PATH, "--check"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(JSON.parse(stdout)).toEqual({
      routeCount: 404,
      facilityCount: 2325,
      dataDigest: REGION_PUBLIC_FACILITY_DATA_DIGEST,
    });
  });
});
