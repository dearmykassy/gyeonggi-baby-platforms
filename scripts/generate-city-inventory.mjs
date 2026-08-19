import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const sourcePath = new URL("../src/data/capital-regions.generated.json", import.meta.url);
const outputPath = new URL("../src/data/city-regions.generated.json", import.meta.url);
const EXPECTED_SOURCE_FILE_SHA256 =
  "0242e5d86894321cba66b7f747675115520d856c7aaada870869e19f247500d2";

const EXCLUDED_MUNICIPALITIES = ["가평군", "이천시", "양평군", "여주시"];

const THEMES = {
  v1: {
    primary: "#C94A66",
    secondary: "#F3A6B8",
    accent: "#F4B942",
    ink: "#1F2430",
    surface: "#FFF8F7",
  },
  v2: {
    primary: "#7E5AA6",
    secondary: "#C3A6DE",
    accent: "#E9A64A",
    ink: "#24202B",
    surface: "#FBF8FF",
  },
  v3: {
    primary: "#2D7C78",
    secondary: "#8CC8C0",
    accent: "#E5A94A",
    ink: "#172A2A",
    surface: "#F5FBFA",
  },
  v4: {
    primary: "#A35B3F",
    secondary: "#D9A58D",
    accent: "#E8BF52",
    ink: "#2B211D",
    surface: "#FFF9F4",
  },
  v5: {
    primary: "#4B6898",
    secondary: "#9DB4D6",
    accent: "#E7AE45",
    ink: "#1C2638",
    surface: "#F6F9FE",
  },
  v6: {
    primary: "#8A5F50",
    secondary: "#C9A99C",
    accent: "#D9A441",
    ink: "#29211E",
    surface: "#FCF8F5",
  },
};

const VOICE_VARIANTS = [
  "steady",
  "clear",
  "warm",
  "concise",
  "local",
  "practical",
];

/**
 * This is the campaign registry, not a national service-area list. Keep its
 * order stable: layout and voice variants are deliberately distributed by
 * index and therefore changing the order is a public design revision.
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

// Promote a site only after its exact HTTPS Pages origin has been created,
// deployed, and audited. Keeping this explicit makes a public indexability
// change reviewable and prevents an unverified free subdomain from leaking
// into canonical, robots, sitemap, or RSS output.
const PUBLIC_SITE_KEYS = [];

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
    const voiceVariant = VOICE_VARIANTS[index % VOICE_VARIANTS.length];
    const slug = key;
    const plannedOrigin = `https://${projectName}.pages.dev`;
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
      publicOrigin: publicRelease ? plannedOrigin : null,
      brandName,
      layoutVariant,
      voiceVariant,
      theme: THEMES[layoutVariant],
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
