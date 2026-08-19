import { describe, expect, it } from "vitest";

import { getBlogPosts } from "@/data/blog-posts";
import { getIndexEligibleRegionNodes } from "@/lib/content";
import { getSitePublicationContract } from "@/lib/metadata";
import { ALL_BABY_SITES } from "@/lib/site-config";

describe("baby platform discovery-file contract", () => {
  it("calculates the exact sitemap inventory for every city", () => {
    for (const site of ALL_BABY_SITES) {
      const eligibleRegional = getIndexEligibleRegionNodes(site);
      const sitemapRoutes = eligibleRegional.map((node) => node.path);
      const stagedRoutes = [
        "/areas/",
        "/pricing/",
        "/guide/",
        "/notice/",
        "/blog/",
        ...getBlogPosts(site).map((post) => `/blog/${post.slug}/`),
      ];
      expect(sitemapRoutes).toEqual(["/"]);
      expect(new Set(sitemapRoutes).size).toBe(sitemapRoutes.length);
      expect(stagedRoutes).toHaveLength(7);
      expect(stagedRoutes.every((route) => !sitemapRoutes.includes(route))).toBe(true);
    }
  });

  it("keeps planned provider hosts fail-closed until publication", () => {
    for (const site of ALL_BABY_SITES) {
      const publication = getSitePublicationContract(site);
      expect(publication.indexable).toBe(false);
      expect(publication.origin).toMatch(/\.invalid$/u);
      expect(publication.robots).toEqual({
        index: false,
        follow: false,
        nocache: true,
      });
    }
  });
});
