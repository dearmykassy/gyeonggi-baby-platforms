import type { MetadataRoute } from "next";

import { getBlogPostPath, getBlogPosts } from "@/data/blog-posts";
import { getSiteOrigin } from "@/lib/metadata";
import { getRegionNodesForSite } from "@/lib/regions";
import {
  getRegionContentModifiedAt,
  getRouteContentModifiedAt,
} from "@/lib/site-revisions";
import { ACTIVE_SITE } from "@/lib/site-config";

const FIXED_ROUTES = ["/areas/", "/pricing/", "/guide/", "/notice/"] as const;

export const dynamic = "force-static";

function absoluteUrl(route: string): string {
  return new URL(route, getSiteOrigin(ACTIVE_SITE)).href;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const regional = getRegionNodesForSite(ACTIVE_SITE).map((node) => ({
    url: absoluteUrl(node.path),
    lastModified: getRegionContentModifiedAt(node),
  }));
  const fixed = FIXED_ROUTES.map((route) => ({
    url: absoluteUrl(route),
    lastModified: getRouteContentModifiedAt(route),
  }));
  const blogIndex = {
    url: absoluteUrl("/blog/"),
    lastModified: getRouteContentModifiedAt("/blog/"),
  };
  const posts = getBlogPosts(ACTIVE_SITE).map((post) => ({
    url: absoluteUrl(getBlogPostPath(post)),
    lastModified: post.modifiedAt,
  }));

  const entries = [...regional, ...fixed, blogIndex, ...posts];
  if (new Set(entries.map((entry) => entry.url)).size !== entries.length) {
    throw new Error(`BABY_SITEMAP_DUPLICATE_URL:${ACTIVE_SITE.key}`);
  }
  return entries;
}
