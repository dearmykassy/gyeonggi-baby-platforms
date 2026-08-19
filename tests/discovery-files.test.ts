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

  it("publishes all 27 sites only on their exact provider origin", () => {
    for (const site of ALL_BABY_SITES) {
      const publication = getSitePublicationContract(site);
      expect(site.deploymentState).toBe("public");
      expect(site.publicOrigin).toBe(site.hostingOrigin);
      expect(publication.indexable).toBe(true);
      expect(publication.origin).toBe(site.hostingOrigin);
      expect(publication.robots).toEqual({ index: true, follow: true });
    }
  });
});
