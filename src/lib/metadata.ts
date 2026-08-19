import type { Metadata } from "next";
import {
  ACTIVE_SITE,
  type BabySiteConfig,
} from "@/lib/site-config";
import { createRegionContent } from "@/lib/content";
import type { BabyRegionNode } from "@/lib/regions";

export const SITEMAP_PATH = "/sitemap.xml" as const;
export const RSS_PATH = "/rss.xml" as const;
export const CONTENT_RELEASED_AT = "2026-08-19T06:00:00+09:00" as const;

export type SiteRobotsContract = {
  index: boolean;
  follow: boolean;
  nocache?: boolean;
};

export type RouteMetadataContract = {
  route: string;
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  robots: SiteRobotsContract;
  openGraph: {
    type: "website";
    locale: "ko_KR";
    siteName: string;
    title: string;
    description: string;
    url: string;
  };
  twitter: {
    card: "summary";
    title: string;
    description: string;
  };
};

export type SitePublicationContract = {
  public: boolean;
  indexable: boolean;
  origin: string;
  claimedOrigin: string | null;
  robots: SiteRobotsContract;
  blockers: readonly string[];
  sitemapUrl: string;
  rssUrl: string;
};

function normalizeRoute(route: string): string {
  if (route === "/") return route;
  const path = route.split(/[?#]/u, 1)[0] ?? route;
  return `/${path.replace(/^\/+|\/+$/gu, "")}/`;
}

function normalizedClaimedOrigin(site: BabySiteConfig): string | null {
  if (site.publicOrigin === null) return null;
  try {
    const candidate = new URL(site.publicOrigin);
    if (
      candidate.protocol !== "https:" ||
      candidate.username.length > 0 ||
      candidate.password.length > 0 ||
      candidate.pathname !== "/" ||
      candidate.search.length > 0 ||
      candidate.hash.length > 0 ||
      candidate.hostname.endsWith(".invalid") ||
      candidate.origin !== site.publicOrigin
    ) {
      return null;
    }
    return candidate.origin;
  } catch {
    return null;
  }
}

export function getPreviewOrigin(site: BabySiteConfig = ACTIVE_SITE): string {
  return `https://${site.slug}.preview.gyeonggi-baby.invalid`;
}

export function getSitePublicationContract(
  site: BabySiteConfig = ACTIVE_SITE,
): SitePublicationContract {
  const claimedOrigin = normalizedClaimedOrigin(site);
  const blockers: string[] = [];
  if (site.deploymentState !== "public") {
    blockers.push("DEPLOYMENT_STATE_NOT_PUBLIC");
  }
  if (site.isPublic !== true) blockers.push("SITE_NOT_PUBLIC");
  if (site.indexingEnabled !== true) blockers.push("INDEXING_NOT_ENABLED");
  if (!claimedOrigin) blockers.push("HTTPS_PUBLIC_ORIGIN_NOT_CLAIMED");

  const indexable = blockers.length === 0;
  const origin = indexable && claimedOrigin ? claimedOrigin : getPreviewOrigin(site);
  const robots: SiteRobotsContract = indexable
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true };

  return {
    public: indexable,
    indexable,
    origin,
    claimedOrigin,
    robots,
    blockers,
    sitemapUrl: new URL(SITEMAP_PATH, origin).href,
    rssUrl: new URL(RSS_PATH, origin).href,
  };
}

export function getSiteOrigin(site: BabySiteConfig = ACTIVE_SITE): string {
  return getSitePublicationContract(site).origin;
}

export function getSiteRobots(
  site: BabySiteConfig = ACTIVE_SITE,
): SiteRobotsContract {
  return getSitePublicationContract(site).robots;
}

export function createRouteMetadataContract(
  route: string,
  title: string,
  description: string,
  keywords: readonly string[] = [],
  site: BabySiteConfig = ACTIVE_SITE,
): RouteMetadataContract {
  const normalized = normalizeRoute(route);
  const origin = getSiteOrigin(site);
  const canonical = new URL(normalized, origin).href;
  const robots = getSiteRobots(site);

  return {
    route: normalized,
    title,
    description,
    keywords: [...keywords],
    canonical,
    robots,
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: site.brandName,
      title,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export function toNextMetadata(contract: RouteMetadataContract): Metadata {
  return {
    title: { absolute: contract.title },
    description: contract.description,
    keywords: contract.keywords.length > 0 ? contract.keywords : undefined,
    alternates: { canonical: contract.canonical },
    openGraph: contract.openGraph,
    twitter: contract.twitter,
    robots: contract.robots,
  };
}

export function createRegionMetadataContract(
  node: BabyRegionNode,
  site: BabySiteConfig = ACTIVE_SITE,
): RouteMetadataContract {
  const content = createRegionContent(node, site);
  return createRouteMetadataContract(
    node.path,
    content.title,
    content.description,
    content.keywords,
    site,
  );
}

/** Active-build compatibility exports. Prefer the site-accepting helpers. */
export const SITE_ORIGIN = getSiteOrigin(ACTIVE_SITE);
export const SITE_NAME = ACTIVE_SITE.brandName;
export const SITE_RELEASED_AT = CONTENT_RELEASED_AT;
export const SITE_ROBOTS = getSiteRobots(ACTIVE_SITE);
export const DEPLOYMENT_CONTRACT = getSitePublicationContract(ACTIVE_SITE);
