import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  WORKERS_STATIC_SITE_SPECS,
  findWorkersStaticSpec,
} from "./lib/cloudflare-workers-static-contract.mjs";

const sourcePath = new URL("../src/data/capital-regions.generated.json", import.meta.url);
const outputPath = new URL("../src/data/city-regions.generated.json", import.meta.url);
const EXPECTED_SOURCE_FILE_SHA256 =
  "0242e5d86894321cba66b7f747675115520d856c7aaada870869e19f247500d2";

const EXCLUDED_MUNICIPALITIES = ["가평군", "이천시", "양평군", "여주시"];

const SECTION_ORDERS = [
  ["introduction", "visual-one", "pricing", "process", "visual-two", "standards", "faq", "directory"],
  ["introduction", "standards", "visual-one", "process", "pricing", "visual-two", "faq", "directory"],
  ["visual-one", "introduction", "process", "visual-two", "pricing", "standards", "faq", "directory"],
  ["process", "introduction", "pricing", "standards", "visual-one", "faq", "visual-two", "directory"],
  ["introduction", "visual-one", "standards", "pricing", "visual-two", "process", "faq", "directory"],
  ["standards", "introduction", "process", "pricing", "visual-one", "visual-two", "faq", "directory"],
  ["pricing", "introduction", "visual-one", "standards", "process", "visual-two", "faq", "directory"],
  ["visual-one", "pricing", "introduction", "process", "standards", "visual-two", "faq", "directory"],
  ["process", "visual-one", "introduction", "standards", "pricing", "visual-two", "faq", "directory"],
  ["standards", "pricing", "introduction", "visual-one", "process", "visual-two", "faq", "directory"],
  ["introduction", "process", "visual-one", "pricing", "standards", "faq", "visual-two", "directory"],
  ["pricing", "standards", "introduction", "process", "visual-one", "faq", "visual-two", "directory"],
  ["visual-two", "introduction", "visual-one", "pricing", "process", "standards", "faq", "directory"],
  ["introduction", "visual-two", "standards", "visual-one", "process", "pricing", "faq", "directory"],
  ["process", "pricing", "visual-one", "introduction", "visual-two", "standards", "faq", "directory"],
  ["standards", "visual-one", "process", "introduction", "pricing", "visual-two", "faq", "directory"],
  ["visual-one", "standards", "pricing", "introduction", "process", "visual-two", "faq", "directory"],
  ["pricing", "visual-one", "process", "standards", "introduction", "visual-two", "faq", "directory"],
  ["visual-two", "process", "introduction", "pricing", "visual-one", "standards", "faq", "directory"],
  ["introduction", "pricing", "visual-two", "process", "standards", "visual-one", "faq", "directory"],
  ["standards", "visual-two", "introduction", "process", "pricing", "visual-one", "faq", "directory"],
  ["process", "standards", "visual-two", "introduction", "visual-one", "pricing", "faq", "directory"],
  ["visual-one", "process", "pricing", "visual-two", "introduction", "standards", "faq", "directory"],
  ["pricing", "process", "standards", "visual-one", "introduction", "visual-two", "faq", "directory"],
  ["visual-two", "standards", "pricing", "introduction", "visual-one", "process", "faq", "directory"],
  ["standards", "process", "visual-one", "pricing", "visual-two", "introduction", "faq", "directory"],
  ["process", "visual-two", "standards", "pricing", "introduction", "visual-one", "faq", "directory"],
];

const DESIGN_PROFILES = [
  ["goyang", "goyang-crimson-journal", ["#B63D58", "#EFA8B5", "#F2C14E", "#202531", "#FFF5F4", "#FFFCFA"], "glass", "underline", "center", "center", "cinematic", "soft", "hairline", "none", "alternating", "pill", "split", "balanced"],
  ["gwacheon", "gwacheon-plum-rail", ["#68458D", "#BFA5D5", "#E8AA55", "#27212D", "#F8F3FC", "#FFFCFF"], "solid", "capsule", "left", "top", "classic", "square", "strong", "soft", "paper", "soft", "compact-right", "editorial"],
  ["gwangmyeong", "gwangmyeong-teal-spread", ["#21736F", "#82C5BC", "#E7B05A", "#172A2A", "#F0FAF8", "#FAFFFE"], "outline", "bracket", "right", "right", "panorama", "round", "accent", "lifted", "bands", "square", "split", "large"],
  ["gwangju-gyeonggi", "gwangju-rust-ledger", ["#925038", "#D5A18A", "#E7BE5A", "#2D211D", "#FFF6EF", "#FFFCF8"], "contrast", "blocks", "bottom-left", "left", "cinematic", "ledger", "strong", "none", "ruled", "notched", "full", "compact"],
  ["guri", "guri-blue-magazine", ["#3D5F91", "#93ACD0", "#E5AC4A", "#1D2738", "#F1F6FD", "#FBFDFF"], "floating", "capsule", "panel-left", "top", "classic", "panel", "hairline", "lifted", "inset", "pill", "floating-right", "dramatic"],
  ["gunpo", "gunpo-mocha-bands", ["#785144", "#C4A398", "#DCA94C", "#2A211E", "#FAF5F1", "#FFFDFC"], "minimal", "dots", "left", "center", "panorama", "soft", "none", "soft", "bands", "soft", "split", "balanced"],
  ["gimpo", "gimpo-emerald-index", ["#2D6B4E", "#94BCA6", "#E0B15A", "#1D2923", "#F2F8F4", "#FCFEFC"], "solid", "underline", "right", "top", "classic", "round", "accent", "none", "paper", "square", "compact-right", "large"],
  ["namyangju", "namyangju-wine-column", ["#7F3F52", "#C995A5", "#E4B85D", "#2C2025", "#FCF3F6", "#FFFDFE"], "glass", "bracket", "panel-right", "right", "cinematic", "square", "hairline", "offset", "alternating", "notched", "full", "editorial"],
  ["dongducheon", "dongducheon-indigo-grid", ["#4D5792", "#9FA8D2", "#E4AD53", "#20243A", "#F3F5FC", "#FCFDFF"], "outline", "blocks", "center", "left", "panorama", "ledger", "strong", "soft", "ruled", "pill", "floating-right", "compact"],
  ["bucheon", "bucheon-charcoal-coral", ["#41464F", "#E19A8E", "#F0B34C", "#1D2025", "#F6F3F1", "#FFFDFC"], "contrast", "capsule", "bottom-left", "top", "classic", "panel", "accent", "lifted", "inset", "soft", "split", "dramatic"],
  ["seongnam", "seongnam-forest-review", ["#315F45", "#A2B88E", "#E2B24C", "#1E2922", "#F3F7EF", "#FEFFF9"], "floating", "dots", "left", "right", "cinematic", "soft", "none", "offset", "bands", "square", "compact-right", "balanced"],
  ["suwon", "suwon-slate-guide", ["#3E6174", "#97B4C1", "#E2A94C", "#1F2A30", "#F1F7F9", "#FBFEFF"], "minimal", "underline", "right", "center", "panorama", "round", "hairline", "soft", "paper", "pill", "full", "large"],
  ["siheung", "siheung-terracotta-notes", ["#9A513D", "#DE9F86", "#EDBD58", "#30221E", "#FFF4EE", "#FFFCF9"], "glass", "blocks", "panel-left", "left", "classic", "ledger", "accent", "none", "alternating", "notched", "floating-right", "editorial"],
  ["ansan", "ansan-violet-frame", ["#674D86", "#B69FCC", "#E8AD59", "#292332", "#F8F3FB", "#FEFCFF"], "solid", "dots", "center", "top", "cinematic", "panel", "strong", "lifted", "ruled", "soft", "split", "compact"],
  ["anseong", "anseong-pine-catalog", ["#386255", "#9CB8AE", "#DDAE52", "#1F2A27", "#F3F8F5", "#FCFFFD"], "outline", "underline", "bottom-left", "right", "panorama", "soft", "hairline", "offset", "inset", "square", "compact-right", "dramatic"],
  ["anyang", "anyang-rose-ledger", ["#874658", "#C99AA7", "#E3B65A", "#2D2025", "#FBF2F5", "#FFFCFD"], "contrast", "bracket", "left", "left", "classic", "square", "accent", "soft", "bands", "pill", "full", "balanced"],
  ["yangju", "yangju-steel-panels", ["#48657A", "#9BB5C6", "#DCAE55", "#202A32", "#F1F6F9", "#FBFEFF"], "floating", "blocks", "right", "top", "cinematic", "round", "none", "lifted", "paper", "notched", "floating-right", "large"],
  ["yeoncheon", "yeoncheon-olive-field", ["#66703B", "#AFB98C", "#E0AD45", "#292C20", "#F6F7EE", "#FFFFFA"], "minimal", "capsule", "panel-right", "center", "panorama", "ledger", "strong", "none", "alternating", "soft", "split", "editorial"],
  ["osan", "osan-cobalt-digest", ["#315E9B", "#8FAED3", "#E8B34F", "#1B283C", "#F0F6FD", "#FBFDFF"], "solid", "dots", "center", "right", "classic", "panel", "hairline", "soft", "ruled", "square", "compact-right", "compact"],
  ["yongin", "yongin-aubergine-spread", ["#69405F", "#B893AD", "#E1AE57", "#2B2028", "#F8F1F6", "#FFFDFE"], "glass", "underline", "bottom-left", "top", "cinematic", "soft", "accent", "offset", "inset", "pill", "full", "dramatic"],
  ["uiwang", "uiwang-deep-teal-card", ["#256462", "#87B8B3", "#D9A653", "#1C2929", "#EFF8F7", "#FBFFFE"], "outline", "bracket", "left", "left", "panorama", "round", "strong", "lifted", "bands", "notched", "floating-right", "balanced"],
  ["uijeongbu", "uijeongbu-maroon-lines", ["#763E45", "#BE9297", "#E2B65A", "#2B2022", "#F9F1F2", "#FFFCFC"], "contrast", "blocks", "right", "right", "classic", "ledger", "none", "none", "paper", "soft", "split", "large"],
  ["paju", "paju-ocean-panels", ["#2D6577", "#8FBAC5", "#E2AD4C", "#1D2A30", "#EFF7F9", "#FBFEFF"], "floating", "capsule", "panel-left", "center", "cinematic", "panel", "hairline", "soft", "alternating", "square", "compact-right", "editorial"],
  ["pyeongtaek", "pyeongtaek-midnight-index", ["#414A73", "#949CBC", "#E5B04E", "#202438", "#F1F3F9", "#FCFDFF"], "minimal", "dots", "panel-right", "top", "panorama", "square", "accent", "lifted", "ruled", "pill", "full", "compact"],
  ["pocheon", "pocheon-ochre-journal", ["#815B2C", "#C5A77B", "#E2B146", "#2C251C", "#FAF6ED", "#FFFDF8"], "glass", "underline", "center", "left", "classic", "soft", "strong", "offset", "inset", "notched", "floating-right", "dramatic"],
  ["hanam", "hanam-graphite-calm", ["#455653", "#9AAEAA", "#DCAF55", "#202827", "#F2F6F5", "#FCFEFD"], "solid", "bracket", "left", "right", "cinematic", "round", "none", "soft", "bands", "soft", "split", "balanced"],
  ["hwaseong", "hwaseong-berry-atlas", ["#844B6A", "#C69BB3", "#E6B255", "#2D222A", "#FAF2F7", "#FFFCFE"], "outline", "blocks", "right", "center", "panorama", "ledger", "hairline", "lifted", "paper", "square", "compact-right", "large"],
].map(([
  siteKey,
  id,
  [primary, secondary, accent, ink, surface, paper],
  headerTreatment,
  navTreatment,
  heroComposition,
  heroCrop,
  heroAspect,
  cardGeometry,
  cardBorder,
  cardShadow,
  sectionRhythm,
  ctaShape,
  ctaPlacement,
  typographyScale,
], index) => ({
  siteKey,
  id,
  palette: { primary, secondary, accent, ink, surface, paper },
  headerTreatment,
  navTreatment,
  heroComposition,
  heroCrop,
  heroAspect,
  cardGeometry,
  cardBorder,
  cardShadow,
  sectionRhythm,
  ctaShape,
  ctaPlacement,
  typographyScale,
  sectionOrder: SECTION_ORDERS[index],
}));

/**
 * This is the campaign registry, not a national service-area list. Keep its
 * order stable: layout variants and explicit design profiles are distributed
 * by index and therefore changing the order is a public design revision.
 */
const SITE_DEFINITIONS = [
  ["goyang", "고양시", "고양", "고양온케어", "goyang-oncare"],
  ["gwacheon", "과천시", "과천", "과천쉼결", "gwacheon-shimgyeol"],
  ["gwangmyeong", "광명시", "광명", "광명휴담", "gwangmyeong-hyudam"],
  ["gwangju-gyeonggi", "광주시", "광주", "광주온쉼", "gwangju-onshim"],
  ["guri", "구리시", "구리", "구리결케어", "guri-gyeolcare"],
  ["gunpo", "군포시", "군포", "군포하루쉼", "gunpo-harushim"],
  ["gimpo", "김포시", "김포", "김포온결", "gimpo-ongyeol"],
  ["namyangju", "남양주시", "남양주", "남양주휴담", "namyangju-hyudam"],
  ["dongducheon", "동두천시", "동두천", "동두천쉼온", "dongducheon-shimon"],
  ["bucheon", "부천시", "부천", "부천하루온", "bucheon-haruon"],
  ["seongnam", "성남시", "성남", "성남온휴", "seongnam-onhyu"],
  ["suwon", "수원시", "수원", "수원휴온", "suwon-hyuon"],
  ["siheung", "시흥시", "시흥", "시흥결쉼", "siheung-gyeolshim"],
  ["ansan", "안산시", "안산", "안산휴결", "ansan-hyugyeol"],
  ["anseong", "안성시", "안성", "안성온담", "anseong-ondam"],
  ["anyang", "안양시", "안양", "안양쉼결", "anyang-shimgyeol"],
  ["yangju", "양주시", "양주", "양주휴온", "yangju-hyuon"],
  ["yeoncheon", "연천군", "연천", "연천온쉼", "yeoncheon-onshim"],
  ["osan", "오산시", "오산", "오산결온", "osan-gyeolon"],
  ["yongin", "용인시", "용인", "용인휴결", "yongin-hyugyeol"],
  ["uiwang", "의왕시", "의왕", "의왕온담", "uiwang-ondam"],
  ["uijeongbu", "의정부시", "의정부", "의정부쉼온", "uijeongbu-shimon"],
  ["paju", "파주시", "파주", "파주휴담", "paju-hyudam"],
  ["pyeongtaek", "평택시", "평택", "평택온결", "pyeongtaek-ongyeol"],
  ["pocheon", "포천시", "포천", "포천하루쉼", "pocheon-harushim"],
  ["hanam", "하남시", "하남", "하남휴온", "hanam-hyuon"],
  ["hwaseong", "화성시", "화성", "화성온쉼", "hwaseong-onshim"],
];

const DESIGN_PROFILE_BY_SITE = new Map(
  DESIGN_PROFILES.map((profile) => [profile.siteKey, profile]),
);
const REQUIRED_SECTION_KEYS = new Set([
  "introduction",
  "visual-one",
  "pricing",
  "process",
  "visual-two",
  "standards",
  "faq",
  "directory",
]);

if (
  DESIGN_PROFILES.length !== SITE_DEFINITIONS.length ||
  DESIGN_PROFILE_BY_SITE.size !== SITE_DEFINITIONS.length ||
  new Set(DESIGN_PROFILES.map((profile) => profile.id)).size !== SITE_DEFINITIONS.length ||
  new Set(DESIGN_PROFILES.map((profile) => JSON.stringify(profile.palette))).size !== SITE_DEFINITIONS.length ||
  new Set(DESIGN_PROFILES.map((profile) => profile.sectionOrder.join("|"))).size !== SITE_DEFINITIONS.length ||
  DESIGN_PROFILES.some(
    (profile) =>
      profile.sectionOrder.length !== REQUIRED_SECTION_KEYS.size ||
      profile.sectionOrder.at(-1) !== "directory" ||
      new Set(profile.sectionOrder).size !== REQUIRED_SECTION_KEYS.size ||
      profile.sectionOrder.some((key) => !REQUIRED_SECTION_KEYS.has(key)),
  )
) {
  throw new Error("BABY_DESIGN_PROFILE_INTEGRITY_FAILURE");
}

// These are the 20 projects that are hosted by Cloudflare Pages. The remaining
// seven public sites are deliberately sourced from the fixed Workers Static
// Assets contract above; deriving those origins here prevents a hand-entered
// workers.dev hostname from leaking into canonical, robots, sitemap, or RSS.
const PAGES_PUBLIC_SITE_KEYS = [
  "goyang",
  "gwacheon",
  "gwangmyeong",
  "gwangju-gyeonggi",
  "guri",
  "gunpo",
  "gimpo",
  "namyangju",
  "dongducheon",
  "bucheon",
  "seongnam",
  "suwon",
  "siheung",
  "ansan",
  "anseong",
  "anyang",
  "yangju",
  "yeoncheon",
  "osan",
  "yongin",
];

const PUBLIC_SITE_KEYS = [
  ...PAGES_PUBLIC_SITE_KEYS,
  ...WORKERS_STATIC_SITE_SPECS.map((spec) => spec.siteKey),
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalRegionPath(segments) {
  if (segments.length === 0) return "/";
  return `/areas/${segments.map((segment) => encodeURIComponent(segment)).join("/")}/`;
}

function unique(values) {
  return [...new Set(values)];
}

const sourceBytes = await readFile(sourcePath);
const source = JSON.parse(sourceBytes.toString("utf8"));
const sourceFileSha256 = sha256(sourceBytes);

if (
  sourceFileSha256 !== EXPECTED_SOURCE_FILE_SHA256 ||
  source.schemaVersion !== 1 ||
  source.status !== "COMMITTED" ||
  source.counts?.gyeonggi !== 448 ||
  source.regions?.length !== 768
) {
  throw new Error("CAPITAL_REGION_SOURCE_INTEGRITY_FAILURE");
}

const definitionsByOfficialName = new Map(
  SITE_DEFINITIONS.map((definition) => [definition[1], definition]),
);
const definitionKeys = new Set(SITE_DEFINITIONS.map((definition) => definition[0]));
const sourceMunicipalities = unique(
  source.regions
    .filter((region) => region.sidoKey === "gyeonggi")
    .map((region) => region.municipality),
);
const expectedMunicipalities = sourceMunicipalities.filter(
  (name) => !EXCLUDED_MUNICIPALITIES.includes(name),
);

if (
  sourceMunicipalities.length !== 31 ||
  expectedMunicipalities.length !== 27 ||
  SITE_DEFINITIONS.length !== 27 ||
  PAGES_PUBLIC_SITE_KEYS.length !== 20 ||
  WORKERS_STATIC_SITE_SPECS.length !== 7 ||
  new Set(PUBLIC_SITE_KEYS).size !== PUBLIC_SITE_KEYS.length ||
  PUBLIC_SITE_KEYS.some((key) => !definitionKeys.has(key)) ||
  expectedMunicipalities.some((name) => !definitionsByOfficialName.has(name)) ||
  SITE_DEFINITIONS.some((definition) => !expectedMunicipalities.includes(definition[1]))
) {
  throw new Error("BABY_SITE_REGISTRY_SCOPE_FAILURE");
}

const sites = SITE_DEFINITIONS.map(
  ([key, officialName, searchName, brandName, projectName], index) => {
    const layoutVariant = `v${(index % 6) + 1}`;
    const designProfile = DESIGN_PROFILE_BY_SITE.get(key);
    if (!designProfile) {
      throw new Error(`BABY_DESIGN_PROFILE_MISSING:${key}`);
    }
    const slug = key;
    const plannedOrigin = `https://${projectName}.pages.dev`;
    const workersSpec = findWorkersStaticSpec(key);
    if (workersSpec && workersSpec.workerName !== projectName) {
      throw new Error(
        `BABY_WORKERS_PROJECT_NAME_MISMATCH:${key}:${projectName}:${workersSpec.workerName}`,
      );
    }
    const hostingProvider = workersSpec
      ? "cloudflare-workers-static-assets"
      : "cloudflare-pages";
    const hostingOrigin = workersSpec?.origin ?? plannedOrigin;
    const publicRelease = PUBLIC_SITE_KEYS.includes(key);
    const envSuffix = key.toUpperCase().replaceAll("-", "_");
    const sourcePrefix = ["gyeonggi", officialName];
    const sourceRegions = source.regions.filter(
      (region) =>
        region.sidoKey === "gyeonggi" &&
        region.municipality === officialName,
    );

    const regions = sourceRegions.map((region) => {
      if (
        region.pathSegments[0] !== sourcePrefix[0] ||
        region.pathSegments[1] !== sourcePrefix[1]
      ) {
        throw new Error(`CROSS_CITY_SOURCE_PATH:${key}:${region.id}`);
      }

      const pathSegments = region.pathSegments.slice(sourcePrefix.length);
      return {
        ...region,
        sourcePathSegments: region.pathSegments,
        sourcePath: region.path,
        pathSegments,
        path: canonicalRegionPath(pathSegments),
      };
    });

    const districtNames = unique(
      regions
        .map((region) => region.district)
        .filter((name) => typeof name === "string" && name.length > 0),
    ).sort((left, right) => left.localeCompare(right, "ko"));
    const leafCount = regions.length;
    const districtHubCount = districtNames.length;

    return {
      key,
      officialName,
      searchName,
      slug,
      projectName,
      plannedOrigin,
      previewOrigin: plannedOrigin,
      hostingProvider,
      hostingOrigin,
      publicOrigin: publicRelease ? hostingOrigin : null,
      brandName,
      layoutVariant,
      theme: designProfile.palette,
      designProfile,
      gaMeasurementIdEnv: `NEXT_PUBLIC_GA_MEASUREMENT_ID_${envSuffix}`,
      gaPropertyIdEnv: `GA4_PROPERTY_ID_${envSuffix}`,
      deploymentState: publicRelease ? "public" : "planned",
      isPublic: publicRelease,
      indexingEnabled: publicRelease,
      sourcePathPrefix: sourcePrefix,
      districtNames,
      counts: {
        home: 1,
        districtHubs: districtHubCount,
        representativeLeaves: leafCount,
        regionalCanonicals: 1 + districtHubCount + leafCount,
      },
      regions,
    };
  },
);

const counts = sites.reduce(
  (totals, site) => ({
    targetSites: totals.targetSites + 1,
    homes: totals.homes + site.counts.home,
    districtHubs: totals.districtHubs + site.counts.districtHubs,
    representativeLeaves:
      totals.representativeLeaves + site.counts.representativeLeaves,
    regionalCanonicals:
      totals.regionalCanonicals + site.counts.regionalCanonicals,
  }),
  {
    targetSites: 0,
    homes: 0,
    districtHubs: 0,
    representativeLeaves: 0,
    regionalCanonicals: 0,
  },
);

if (
  counts.targetSites !== 27 ||
  counts.homes !== 27 ||
  counts.districtHubs !== 24 ||
  counts.representativeLeaves !== 404 ||
  counts.regionalCanonicals !== 455
) {
  throw new Error(`BABY_REGION_COUNT_FAILURE:${JSON.stringify(counts)}`);
}

const digestPayload = {
  sourceArtifactDigest: source.sourceArtifactDigest,
  sourceFileSha256,
  excludedMunicipalities: EXCLUDED_MUNICIPALITIES,
  counts,
  sites,
};
const inventoryDigest = `sha256:${sha256(JSON.stringify(digestPayload))}`;
const output = {
  schemaVersion: 1,
  status: "COMMITTED",
  effectiveDate: source.effectiveDate,
  sourceArtifactDigest: source.sourceArtifactDigest,
  sourceRawSha256: source.sourceRawSha256,
  sourceFileSha256,
  inventoryDigest,
  excludedMunicipalities: EXCLUDED_MUNICIPALITIES,
  counts,
  sites,
};
const rendered = `${JSON.stringify(output, null, 2)}\n`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = await readFile(outputPath, "utf8");
  } catch {
    // The comparison below reports a consistent stale/missing error.
  }
  if (current !== rendered) {
    throw new Error("CITY_REGION_INVENTORY_IS_STALE");
  }
  console.log(`city inventory OK: ${inventoryDigest}`);
} else {
  await writeFile(outputPath, rendered, "utf8");
  console.log(`wrote ${fileURLToPath(outputPath)} (${inventoryDigest})`);
}
