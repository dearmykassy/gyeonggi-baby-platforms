import { describe, expect, it } from "vitest";

import { getBlogPosts } from "@/data/blog-posts";
import { getIndexEligibleRegionNodes } from "@/lib/content";
import { getSitePublicationContract } from "@/lib/metadata";
import { getRegionNodesForSite } from "@/lib/regions";
import { ALL_BABY_SITES } from "@/lib/site-config";

describe("baby platform discovery-file contract", () => {
  it("calculates the exact sitemap inventory for every city", () => {
    for (const site of ALL_BABY_SITES) {
      const eligibleRegional = getIndexEligibleRegionNodes(site);
      const sitemapRoutes = eligibleRegional.map((node) => node.path);
      const ancillaryRoutes = [
        "/areas/",
        "/pricing/",
        "/guide/",
        "/notice/",
        "/blog/",
        ...getBlogPosts(site).map((post) => `/blog/${post.slug}/`),
      ];
      expect(sitemapRoutes).toEqual(
        getRegionNodesForSite(site).map((node) => node.path),
      );
      expect(sitemapRoutes).toContain("/");
      expect(new Set(sitemapRoutes).size).toBe(sitemapRoutes.length);
      expect(ancillaryRoutes).toHaveLength(7);
      expect(
        ancillaryRoutes.every((route) => !sitemapRoutes.includes(route)),
      ).toBe(true);
    }
  });

  it("publishes only verified provider hosts and keeps pending hosts fail-closed", () => {
    for (const site of ALL_BABY_SITES) {
      const publication = getSitePublicationContract(site);
      if (site.deploymentState === "public") {
        expect(publication.indexable).toBe(true);
        expect(publication.origin).toBe(site.plannedOrigin);
        expect(publication.robots).toEqual({ index: true, follow: true });
      } else {
        expect(publication.indexable).toBe(false);
        expect(publication.origin).toMatch(/\.invalid$/u);
        expect(publication.robots).toEqual({
          index: false,
          follow: false,
          nocache: true,
        });
      }
    }
  });
});
