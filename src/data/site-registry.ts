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
export type VoiceVariant =
  | "steady"
  | "clear"
  | "warm"
  | "concise"
  | "local"
  | "practical";
export type BabySiteDeploymentState = "planned" | "preview" | "public";

export type BabySiteTheme = Readonly<{
  primary: string;
  secondary: string;
  accent: string;
  ink: string;
  surface: string;
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
  publicOrigin: string | null;
  /** The current build origin. Indexing remains disabled until publicOrigin is set. */
  origin: string;
  layoutVariant: LayoutVariant;
  voiceVariant: VoiceVariant;
  theme: BabySiteTheme;
  gaMeasurementIdEnv: `NEXT_PUBLIC_GA_MEASUREMENT_ID_${string}`;
  gaPropertyIdEnv: `GA4_PROPERTY_ID_${string}`;
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

export const ALL_BABY_SITES: readonly BabySiteConfig[] = Object.freeze(
  inventory.sites.map((rawSite) => {
    const site = rawSite as RawSiteConfig;
    return Object.freeze({
      ...site,
      citySlug: site.slug,
      origin: site.publicOrigin ?? site.previewOrigin,
      theme: Object.freeze({ ...site.theme }),
      districtNames: Object.freeze([...site.districtNames]),
      sourcePathPrefix: Object.freeze([
        ...site.sourcePathPrefix,
      ]) as unknown as readonly ["gyeonggi", string],
      counts: Object.freeze({ ...site.counts }),
    });
  }),
);

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
