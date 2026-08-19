import { createRegionContent } from "@/lib/content";
import { getSiteOrigin } from "@/lib/metadata";
import {
  getRegionBreadcrumbsForSite,
  type BabyRegionNode,
} from "@/lib/regions";
import {
  getSiteConfig,
  type BabySiteConfig,
} from "@/lib/site-config";

export type RegionPageJsonLd = {
  "@context": "https://schema.org";
  "@graph": [
    {
      "@type": "WebPage";
      "@id": string;
      url: string;
      name: string;
      description: string;
      inLanguage: "ko-KR";
      isPartOf: {
        "@type": "WebSite";
        "@id": string;
        url: string;
        name: string;
      };
    },
    {
      "@type": "BreadcrumbList";
      "@id": string;
      itemListElement: Array<{
        "@type": "ListItem";
        position: number;
        name: string;
        item: string;
      }>;
    },
  ];
};

function absolutePageUrl(path: string, site: BabySiteConfig): string {
  const normalized = path === "/" ? "/" : `${path.replace(/\/+$/u, "")}/`;
  return new URL(normalized, getSiteOrigin(site)).href;
}

export function createRegionPageJsonLd(
  node: BabyRegionNode,
  explicitSite?: BabySiteConfig,
): RegionPageJsonLd {
  const site = explicitSite ?? getSiteConfig(node.siteKey);
  if (node.siteKey !== site.key) {
    throw new Error(`BABY_REGION_SCHEMA_SITE_MISMATCH:${site.key}:${node.siteKey}`);
  }
  const content = createRegionContent(node, site);
  const url = absolutePageUrl(node.path, site);
  const websiteUrl = absolutePageUrl("/", site);
  const breadcrumbs = getRegionBreadcrumbsForSite(site, node);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: content.h1,
        description: content.description,
        inLanguage: "ko-KR",
        isPartOf: {
          "@type": "WebSite",
          "@id": `${websiteUrl}#website`,
          url: websiteUrl,
          name: site.brandName,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: breadcrumbs.map((breadcrumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: breadcrumb.displayName,
          item: absolutePageUrl(breadcrumb.path, site),
        })),
      },
    ],
  };
}

export function serializeRegionPageJsonLd(
  node: BabyRegionNode,
  site?: BabySiteConfig,
): string {
  return JSON.stringify(createRegionPageJsonLd(node, site)).replace(/</gu, "\\u003c");
}
