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

const WORKERS_ORIGINS = new Map<string, string>([
  ["uiwang", "https://uiwang-ondam.guncraft2000.workers.dev"],
  ["uijeongbu", "https://uijeongbu-shimon.guncraft2000.workers.dev"],
  ["paju", "https://paju-hyudam.guncraft2000.workers.dev"],
  ["pyeongtaek", "https://pyeongtaek-ongyeol.guncraft2000.workers.dev"],
  ["pocheon", "https://pocheon-harushim.guncraft2000.workers.dev"],
  ["hanam", "https://hanam-hyuon.guncraft2000.workers.dev"],
  ["hwaseong", "https://hwaseong-onshim.guncraft2000.workers.dev"],
]);
const PAGES_GOOGLE_SITE_VERIFICATION =
  "3zM7GD_q1O5jArOEy94U84RcsbpsLSWHZ3HqEXcbfag";
const WORKERS_GOOGLE_SITE_VERIFICATION =
  "7schiOKlxuCwhC-NwIuk7ye4YL52TIUdtdJSraAEEtU";
const NAVER_SITE_VERIFICATION_BY_SITE = new Map<string, string>([
  ["goyang", "efeea1dbd1f54ada0fbce5160e891614562e081a"],
  ["gwacheon", "1267bcead786960d24ecf3393fadb230ab4d6180"],
  ["gwangmyeong", "e042b8ef297ea4f1e7d646f733f86dd5cfb6ca66"],
  ["gwangju-gyeonggi", "a05b6fb466c2a8b46755fabd7c818a31b536d6af"],
  ["guri", "4902669388fa6b44ec8484054b352460f3574dbe"],
  ["gunpo", "9bc312b15eaaed59684b2d0064293a5877a025f6"],
  ["gimpo", "5726c4de78b84e0d10519321fae395ed5751b269"],
  ["namyangju", "1db91520d7e6229f8c31932e426518af267f3cea"],
  ["dongducheon", "23f08553f090ef079f5e30bdb75b5b486faefbaf"],
  ["bucheon", "17f1c102b611e674d2a89c7f05f93bb1dfb2eeaf"],
  ["seongnam", "f09641c54259cb63af74d7b01ac8baf698596456"],
  ["suwon", "d93fb88bc51095d1a57c3f6aaf68c7afc824c5bf"],
  ["siheung", "40c2e89d6514e1135ba068a36ba5fee2a903bc6f"],
  ["ansan", "c399a01fcc8aac75ae6a605aacb0ba7a9d92fc41"],
  ["anseong", "43ac73f1532105303e4aed7938b4dfbc21699988"],
  ["anyang", "fbd8a5eb5da0c0c4573ace78f26b22f5cafab63f"],
  ["yangju", "6694e54748887d97121f369b18255cc49cd79742"],
  ["yeoncheon", "8115fe41582300efa65cfb85cbf4287837be68ac"],
  ["osan", "986eb18bcf84a05ffa80bad79fcd6b5bff14827e"],
  ["yongin", "842a2ae6522227d0ca0d05617d31fc11d267ad3f"],
  ["uiwang", "b03ab2349164372e1d6d6382d0ffe50f01d2b1c0"],
  ["uijeongbu", "515a913bf3562048f76aee555e43275f24a406a1"],
  ["paju", "acac573eb0fb97e9b6ece36e26510aa125cdb36a"],
  ["pyeongtaek", "fe73e523a91f7f26c2ee4485c3199a268673be5a"],
  ["pocheon", "b78831421961d9523f9d154acebad2236ff45fec"],
  ["hanam", "28341787880ccb13d544b806259831048bad530e"],
  ["hwaseong", "b48941cdccbb29c18abf417a74f1c46bef31f695"],
]);

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
      "hostingOrigin",
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
      const workersOrigin = WORKERS_ORIGINS.get(site.key);
      expect(site.hostingProvider).toBe(
        workersOrigin
          ? "cloudflare-workers-static-assets"
          : "cloudflare-pages",
      );
      expect(site.hostingOrigin).toBe(workersOrigin ?? site.plannedOrigin);
      expect(site.publicOrigin).toBe(site.hostingOrigin);
      expect(site.origin).toBe(site.hostingOrigin);
      expect(site.deploymentState).toBe("public");
      expect(site.isPublic).toBe(true);
      expect(site.indexingEnabled).toBe(true);
      expect(site.gaMeasurementIdEnv).toMatch(
        /^NEXT_PUBLIC_GA_MEASUREMENT_ID_[A-Z0-9_]+$/u,
      );
      expect(site.gaPropertyIdEnv).toMatch(/^GA4_PROPERTY_ID_[A-Z0-9_]+$/u);
      expect(site.googleSiteVerification).toMatch(/^[A-Za-z0-9_-]{32,128}$/u);
      expect(site.googleSiteVerification).toBe(
        workersOrigin
          ? WORKERS_GOOGLE_SITE_VERIFICATION
          : PAGES_GOOGLE_SITE_VERIFICATION,
      );
      expect(site.naverSiteVerification).toMatch(/^[a-f0-9]{40}$/u);
      expect(site.naverSiteVerification).toBe(
        NAVER_SITE_VERIFICATION_BY_SITE.get(site.key),
      );
    }

    expect(
      new Set(ALL_BABY_SITES.map((site) => site.googleSiteVerification)),
    ).toEqual(
      new Set([
        PAGES_GOOGLE_SITE_VERIFICATION,
        WORKERS_GOOGLE_SITE_VERIFICATION,
      ]),
    );
    expect(
      ALL_BABY_SITES.filter(
        (site) => site.googleSiteVerification === PAGES_GOOGLE_SITE_VERIFICATION,
      ),
    ).toHaveLength(20);
    expect(
      ALL_BABY_SITES.filter(
        (site) => site.googleSiteVerification === WORKERS_GOOGLE_SITE_VERIFICATION,
      ),
    ).toHaveLength(7);
    expect(NAVER_SITE_VERIFICATION_BY_SITE.size).toBe(27);
    expect(
      new Set(ALL_BABY_SITES.map((site) => site.naverSiteVerification)).size,
    ).toBe(27);

    expect(getSiteConfig("gwangju-gyeonggi").plannedOrigin).toBe(
      "https://gwangju-onshim.pages.dev",
    );
    expect(ALL_BABY_SITES.filter((site) => site.isPublic)).toHaveLength(27);
    expect(
      ALL_BABY_SITES.filter(
        (site) => site.hostingProvider === "cloudflare-pages",
      ),
    ).toHaveLength(20);
    expect(
      ALL_BABY_SITES.filter(
        (site) => site.hostingProvider === "cloudflare-workers-static-assets",
      ),
    ).toHaveLength(7);
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
