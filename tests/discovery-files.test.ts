import { describe, expect, it } from "vitest";

import { getBlogPosts } from "@/data/blog-posts";
import { getSitePublicationContract } from "@/lib/metadata";
import { getRegionNodesForSite } from "@/lib/regions";
import { ALL_BABY_SITES } from "@/lib/site-config";

describe("baby platform discovery-file contract", () => {
  it("calculates the exact sitemap inventory for every city", () => {
    for (const site of ALL_BABY_SITES) {
      const routes = [
        ...getRegionNodesForSite(site).map((node) => node.path),
        "/areas/",
        "/pricing/",
        "/guide/",
        "/notice/",
        "/blog/",
        ...getBlogPosts(site).map((post) => `/blog/${post.slug}/`),
      ];
      expect(routes).toHaveLength(site.counts.regionalCanonicals + 7);
      expect(new Set(routes).size).toBe(routes.length);
      expect(routes.filter((route) => route.startsWith("/areas/"))).toHaveLength(
        site.counts.regionalCanonicals,
      );
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
