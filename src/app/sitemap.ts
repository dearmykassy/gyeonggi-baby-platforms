import type { MetadataRoute } from "next";

import { getIndexEligibleRegionNodes } from "@/lib/content";
import { getSiteOrigin } from "@/lib/metadata";
import { getRegionContentModifiedAt } from "@/lib/site-revisions";
import { ACTIVE_SITE } from "@/lib/site-config";

export const dynamic = "force-static";

function absoluteUrl(route: string): string {
  return new URL(route, getSiteOrigin(ACTIVE_SITE)).href;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries = getIndexEligibleRegionNodes(ACTIVE_SITE).map((node) => ({
    url: absoluteUrl(node.path),
    lastModified: getRegionContentModifiedAt(node),
  }));
  if (entries.length !== 1 || entries[0]?.url !== absoluteUrl("/")) {
    throw new Error(`BABY_SITEMAP_STAGED_HOME_ONLY:${ACTIVE_SITE.key}`);
  }
  if (new Set(entries.map((entry) => entry.url)).size !== entries.length) {
    throw new Error(`BABY_SITEMAP_DUPLICATE_URL:${ACTIVE_SITE.key}`);
  }
  return entries;
}
