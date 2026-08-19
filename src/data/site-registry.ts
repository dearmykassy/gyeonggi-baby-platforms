import cityInventoryJson from "./city-regions.generated.json";

export const BABY_SITE_KEYS = [
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
  "uiwang",
  "uijeongbu",
  "paju",
  "pyeongtaek",
  "pocheon",
  "hanam",
  "hwaseong",
] as const;

export type BabySiteKey = (typeof BABY_SITE_KEYS)[number];
export type LayoutVariant = "v1" | "v2" | "v3" | "v4" | "v5" | "v6";
export type BabySiteDeploymentState = "planned" | "preview" | "public";
export type BabySiteHostingProvider =
  | "cloudflare-pages"
  | "cloudflare-workers-static-assets";

export type BabySiteTheme = Readonly<{
  primary: string;
  secondary: string;
  accent: string;
  ink: string;
  surface: string;
  paper: string;
}>;

export type HomeSectionKey =
  | "introduction"
  | "visual-one"
  | "pricing"
  | "process"
  | "visual-two"
  | "standards"
  | "faq"
  | "directory";

export type BabySiteDesignProfile = Readonly<{
  siteKey: BabySiteKey;
  id: string;
  palette: BabySiteTheme;
  headerTreatment: "glass" | "solid" | "outline" | "contrast" | "floating" | "minimal";
  navTreatment: "underline" | "capsule" | "bracket" | "blocks" | "dots";
  heroComposition: "center" | "left" | "right" | "bottom-left" | "panel-left" | "panel-right";
  heroCrop: "center" | "top" | "left" | "right";
  heroAspect: "cinematic" | "classic" | "panorama";
  cardGeometry: "soft" | "square" | "round" | "ledger" | "panel";
  cardBorder: "hairline" | "strong" | "accent" | "none";
  cardShadow: "none" | "soft" | "lifted" | "offset";
  sectionRhythm: "alternating" | "paper" | "bands" | "ruled" | "inset";
  ctaShape: "pill" | "soft" | "square" | "notched";
  ctaPlacement: "split" | "compact-right" | "full" | "floating-right";
  typographyScale: "compact" | "balanced" | "editorial" | "large" | "dramatic";
  sectionOrder: readonly HomeSectionKey[];
}>;

export type BabySiteRouteCounts = Readonly<{
  home: 1;
  districtHubs: number;
  representativeLeaves: number;
  regionalCanonicals: number;
}>;

export type BabySiteConfig = Readonly<{
  key: BabySiteKey;
  officialName: string;
  searchName: string;
  slug: string;
  citySlug: string;
  projectName: string;
  brandName: string;
  plannedOrigin: `https://${string}.pages.dev`;
  previewOrigin: `https://${string}.pages.dev`;
  hostingProvider: BabySiteHostingProvider;
  /** Exact provider origin allowed to become the public canonical. */
  hostingOrigin: string;
  publicOrigin: string | null;
  /** The current build origin. Indexing remains disabled until publicOrigin is set. */
  origin: string;
  layoutVariant: LayoutVariant;
  theme: BabySiteTheme;
  designProfile: BabySiteDesignProfile;
  gaMeasurementIdEnv: `NEXT_PUBLIC_GA_MEASUREMENT_ID_${string}`;
  gaPropertyIdEnv: `GA4_PROPERTY_ID_${string}`;
  /** Public account-level token rendered only on this site's homepage. */
  googleSiteVerification: string;
  /** Public site-specific token rendered only on this site's homepage. */
  naverSiteVerification: string;
  deploymentState: BabySiteDeploymentState;
  isPublic: boolean;
  indexingEnabled: boolean;
  sourcePathPrefix: readonly ["gyeonggi", string];
  districtNames: readonly string[];
  counts: BabySiteRouteCounts;
}>;

type RawSiteConfig = Omit<BabySiteConfig, "origin" | "citySlug">;

type CityInventoryRegistry = {
  schemaVersion: number;
  status: string;
  inventoryDigest: string;
  counts: {
    targetSites: number;
  };
  sites: RawSiteConfig[];
};

const inventory = cityInventoryJson as unknown as CityInventoryRegistry;

if (
  inventory.schemaVersion !== 1 ||
  inventory.status !== "COMMITTED" ||
  inventory.counts.targetSites !== 27 ||
  inventory.sites.length !== BABY_SITE_KEYS.length
) {
  throw new Error("BABY_SITE_REGISTRY_INTEGRITY_FAILURE");
}

const expectedKeys = new Set<string>(BABY_SITE_KEYS);
if (
  inventory.sites.some((site) => !expectedKeys.has(site.key)) ||
  new Set(inventory.sites.map((site) => site.key)).size !== BABY_SITE_KEYS.length
) {
  throw new Error("BABY_SITE_REGISTRY_KEY_FAILURE");
}

function isExactHttpsOrigin(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.username.length === 0 &&
      parsed.password.length === 0 &&
      parsed.pathname === "/" &&
      parsed.search.length === 0 &&
      parsed.hash.length === 0 &&
      !parsed.hostname.endsWith(".invalid") &&
      parsed.origin === value
    );
  } catch {
    return false;
  }
}

if (
  inventory.sites.some((site) => {
    const pagesOrigin = `https://${site.projectName}.pages.dev`;
    const workersOrigin =
      `https://${site.projectName}.guncraft2000.workers.dev`;
    const providerOriginValid =
      site.hostingProvider === "cloudflare-pages"
        ? site.hostingOrigin === pagesOrigin
        : site.hostingProvider === "cloudflare-workers-static-assets" &&
          site.hostingOrigin === workersOrigin;
    const publicTupleValid =
      site.deploymentState === "public" &&
      site.isPublic === true &&
      site.indexingEnabled === true &&
      site.publicOrigin === site.hostingOrigin;
    return (
      site.plannedOrigin !== pagesOrigin ||
      site.previewOrigin !== pagesOrigin ||
      !isExactHttpsOrigin(site.hostingOrigin) ||
      !/^[A-Za-z0-9_-]{32,128}$/u.test(site.googleSiteVerification) ||
      !/^[a-f0-9]{40}$/u.test(site.naverSiteVerification) ||
      !providerOriginValid ||
      !publicTupleValid
    );
  })
) {
  throw new Error("BABY_SITE_HOSTING_CONTRACT_FAILURE");
}

export const ALL_BABY_SITES: readonly BabySiteConfig[] = Object.freeze(
  inventory.sites.map((rawSite) => {
    const site = rawSite as RawSiteConfig;
    return Object.freeze({
      ...site,
      citySlug: site.slug,
      origin: site.publicOrigin ?? site.previewOrigin,
      theme: Object.freeze({ ...site.theme }),
      designProfile: Object.freeze({
        ...site.designProfile,
        palette: Object.freeze({ ...site.designProfile.palette }),
        sectionOrder: Object.freeze([...site.designProfile.sectionOrder]),
      }),
      districtNames: Object.freeze([...site.districtNames]),
      sourcePathPrefix: Object.freeze([
        ...site.sourcePathPrefix,
      ]) as unknown as readonly ["gyeonggi", string],
      counts: Object.freeze({ ...site.counts }),
    });
  }),
);

const designProfileSignatures = ALL_BABY_SITES.map((site) =>
  JSON.stringify(site.designProfile),
);
if (
  new Set(ALL_BABY_SITES.map((site) => site.designProfile.id)).size !== BABY_SITE_KEYS.length ||
  new Set(designProfileSignatures).size !== BABY_SITE_KEYS.length ||
  new Set(
    ALL_BABY_SITES.map((site) => site.designProfile.sectionOrder.join("|")),
  ).size !== BABY_SITE_KEYS.length ||
  ALL_BABY_SITES.some(
    (site) =>
      site.designProfile.siteKey !== site.key ||
      site.designProfile.sectionOrder.length !== 8 ||
      site.designProfile.sectionOrder.at(-1) !== "directory" ||
      JSON.stringify(site.theme) !== JSON.stringify(site.designProfile.palette),
  )
) {
  throw new Error("BABY_SITE_DESIGN_PROFILE_FAILURE");
}

export const BABY_SITES = ALL_BABY_SITES;
export const BABY_SITE_INVENTORY_DIGEST = inventory.inventoryDigest;

const SITE_BY_KEY = new Map<BabySiteKey, BabySiteConfig>(
  ALL_BABY_SITES.map((site) => [site.key, site]),
);

export function isBabySiteKey(value: string): value is BabySiteKey {
  return SITE_BY_KEY.has(value as BabySiteKey);
}

export function getSiteConfig(key: BabySiteKey | string): BabySiteConfig {
  const site = SITE_BY_KEY.get(key as BabySiteKey);
  if (!site) throw new Error(`UNKNOWN_BABY_SITE_KEY:${key}`);
  return site;
}

export function resolveBabySiteKey(
  value: string | undefined,
  runtimeEnvironment: string | undefined = process.env.NODE_ENV,
): BabySiteKey {
  const normalized = value?.trim();
  if (normalized && isBabySiteKey(normalized)) return normalized;

  if (runtimeEnvironment !== "production") return "suwon";

  if (!normalized) throw new Error("BABY_SITE_KEY_REQUIRED_IN_PRODUCTION");
  throw new Error(`UNKNOWN_BABY_SITE_KEY_IN_PRODUCTION:${normalized}`);
}

export const ACTIVE_SITE_KEY = resolveBabySiteKey(process.env.BABY_SITE_KEY);
export const ACTIVE_SITE = getSiteConfig(ACTIVE_SITE_KEY);
export const activeSite = ACTIVE_SITE;
