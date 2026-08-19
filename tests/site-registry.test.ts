import { describe, expect, it } from "vitest";

import {
  ACTIVE_SITE,
  ALL_BABY_SITES,
  BABY_SITE_KEYS,
  getSiteConfig,
  resolveBabySiteKey,
} from "../src/data/site-registry";

const FORBIDDEN_ROOT_SUFFIX =
  /(?:특별자치도|특별자치시|특별시|광역시|도|시|군)$/u;

describe("Gyeonggi baby site registry", () => {
  it("contains exactly the 27 in-scope city and county platforms", () => {
    expect(BABY_SITE_KEYS).toHaveLength(27);
    expect(ALL_BABY_SITES).toHaveLength(27);
    expect(new Set(BABY_SITE_KEYS).size).toBe(27);
    expect(ALL_BABY_SITES.map((site) => site.key)).toEqual(BABY_SITE_KEYS);

    const officialNames = ALL_BABY_SITES.map((site) => site.officialName);
    expect(officialNames).toContain("연천군");
    expect(officialNames).not.toContain("가평군");
    expect(officialNames).not.toContain("이천시");
    expect(officialNames).not.toContain("양평군");
    expect(officialNames).not.toContain("여주시");
  });

  it("uses short customer labels and unique brands, slugs, origins, and GA env names", () => {
    const uniqueFields = [
      "key",
      "slug",
      "projectName",
      "brandName",
      "plannedOrigin",
      "previewOrigin",
      "gaMeasurementIdEnv",
      "gaPropertyIdEnv",
    ] as const;

    for (const field of uniqueFields) {
      expect(new Set(ALL_BABY_SITES.map((site) => site[field])).size).toBe(27);
    }

    for (const site of ALL_BABY_SITES) {
      expect(site.searchName).not.toMatch(FORBIDDEN_ROOT_SUFFIX);
      expect(site.citySlug).toBe(site.slug);
      expect(site.brandName).not.toContain(site.officialName);
      expect(site.plannedOrigin).toBe(`https://${site.projectName}.pages.dev`);
      expect(site.previewOrigin).toBe(site.plannedOrigin);
      expect(site.publicOrigin).toBeNull();
      expect(site.origin).toBe(site.previewOrigin);
      expect(site.deploymentState).toBe("planned");
      expect(site.isPublic).toBe(false);
      expect(site.indexingEnabled).toBe(false);
      expect(site.gaMeasurementIdEnv).toMatch(
        /^NEXT_PUBLIC_GA_MEASUREMENT_ID_[A-Z0-9_]+$/u,
      );
      expect(site.gaPropertyIdEnv).toMatch(/^GA4_PROPERTY_ID_[A-Z0-9_]+$/u);
    }

    expect(getSiteConfig("gwangju-gyeonggi").plannedOrigin).toBe(
      "https://gwangju-onshim.pages.dev",
    );
  });

  it("distributes the six substantial layout variants as 5/5/5/4/4/4", () => {
    const distribution = Object.fromEntries(
      ["v1", "v2", "v3", "v4", "v5", "v6"].map((variant) => [
        variant,
        ALL_BABY_SITES.filter((site) => site.layoutVariant === variant).length,
      ]),
    );

    expect(distribution).toEqual({
      v1: 5,
      v2: 5,
      v3: 5,
      v4: 4,
      v5: 4,
      v6: 4,
    });
  });

  it("binds every site to a unique palette, DOM order, and visual profile tuple", () => {
    const profiles = ALL_BABY_SITES.map((site) => site.designProfile);
    const visualTuple = (site: (typeof ALL_BABY_SITES)[number]) => [
      site.designProfile.headerTreatment,
      site.designProfile.heroComposition,
      site.designProfile.cardGeometry,
      site.designProfile.sectionRhythm,
      site.designProfile.ctaPlacement,
      site.designProfile.typographyScale,
    ].join("|");

    expect(new Set(profiles.map((profile) => profile.id)).size).toBe(27);
    expect(new Set(profiles.map((profile) => JSON.stringify(profile.palette))).size).toBe(27);
    expect(new Set(profiles.map((profile) => profile.sectionOrder.join("|"))).size).toBe(27);
    expect(new Set(ALL_BABY_SITES.map(visualTuple)).size).toBe(27);

    for (const site of ALL_BABY_SITES) {
      expect(site.designProfile.siteKey).toBe(site.key);
      expect(site.designProfile.sectionOrder).toHaveLength(8);
      expect(new Set(site.designProfile.sectionOrder).size).toBe(8);
      expect(site.designProfile.sectionOrder.at(-1)).toBe("directory");
      expect(site.theme).toEqual(site.designProfile.palette);
    }
  });

  it("falls back to Suwon only outside production and fails closed in production", () => {
    expect(resolveBabySiteKey(undefined, "development")).toBe("suwon");
    expect(resolveBabySiteKey("unknown", "test")).toBe("suwon");
    expect(resolveBabySiteKey("yeoncheon", "production")).toBe("yeoncheon");
    expect(() => resolveBabySiteKey(undefined, "production")).toThrow(
      "BABY_SITE_KEY_REQUIRED_IN_PRODUCTION",
    );
    expect(() => resolveBabySiteKey("unknown", "production")).toThrow(
      "UNKNOWN_BABY_SITE_KEY_IN_PRODUCTION:unknown",
    );
  });

  it("selects Suwon in the test runtime when BABY_SITE_KEY is absent", () => {
    expect(ACTIVE_SITE.key).toBe(process.env.BABY_SITE_KEY ?? "suwon");
  });
});
