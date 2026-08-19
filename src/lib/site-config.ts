export {
  ACTIVE_SITE,
  ACTIVE_SITE_KEY,
  ALL_BABY_SITES,
  BABY_SITE_INVENTORY_DIGEST,
  BABY_SITE_KEYS,
  activeSite,
  getSiteConfig,
  isBabySiteKey,
  resolveBabySiteKey,
} from "../data/site-registry";

export type {
  BabySiteConfig,
  BabySiteDeploymentState,
  BabySiteKey,
  BabySiteRouteCounts,
  BabySiteTheme,
  LayoutVariant,
  VoiceVariant,
} from "../data/site-registry";

import { ACTIVE_SITE } from "../data/site-registry";

export const SITE_CONFIG = ACTIVE_SITE;
export const SITE_ORIGIN = ACTIVE_SITE.origin;
export const SITE_INDEXING_ENABLED = ACTIVE_SITE.indexingEnabled;

/**
 * Stable administrative-graph revision. It is intentionally not generated
 * from build time; update only when the committed graph or regional content
 * meaningfully changes.
 */
export const REGIONAL_CONTENT_MODIFIED_AT =
  "2026-07-20T00:00:00+09:00" as const;
