import { describe, expect, it } from "vitest";
import { getBlogPosts } from "@/data/blog-posts";
import { createRegionContent } from "@/lib/content";
import {
  createRegionMetadataContract,
  getSitePublicationContract,
} from "@/lib/metadata";
import {
  getRegionNodesForSite,
  type BabyRegionNode,
} from "@/lib/regions";
import {
  getRegionContentModifiedAt,
  getRouteContentModifiedAt,
  SITE_CONTENT_REVISIONS,
} from "@/lib/site-revisions";
import {
  ALL_BABY_SITES,
  type BabySiteConfig,
} from "@/lib/site-config";
import { createRegionPageJsonLd } from "@/lib/region-schema";
import { createBlogPostingJsonLd } from "@/lib/blog-schema";

type ContentRecord = {
  site: BabySiteConfig;
  node: BabyRegionNode;
  content: ReturnType<typeof createRegionContent>;
};

const records: ContentRecord[] = ALL_BABY_SITES.flatMap((site) =>
  getRegionNodesForSite(site).map((node) => ({
    site,
    node,
    content: createRegionContent(node, site),
  })),
);

function expectUnique(values: readonly string[]): void {
  expect(new Set(values).size).toBe(values.length);
}

describe("Gyeonggi baby regional content contract", () => {
  it("contains exactly 27 city-scoped builds and 455 regional canonicals", () => {
    expect(ALL_BABY_SITES).toHaveLength(27);
    expect(records).toHaveLength(455);
    expect(records.filter(({ node }) => node.kind === "home")).toHaveLength(27);
    expect(records.filter(({ node }) => node.kind === "district")).toHaveLength(24);
    expect(records.filter(({ node }) => node.kind === "representative")).toHaveLength(404);

    for (const site of ALL_BABY_SITES) {
      const nodes = getRegionNodesForSite(site);
      expect(nodes).toHaveLength(site.counts.regionalCanonicals);
      expect(nodes.every((node) => node.siteKey === site.key)).toBe(true);
      expect(nodes.every((node) => !node.qualifiedName.includes("경기도"))).toBe(true);
    }
  });

  it("gives every regional route exact-unique meta, H1, and document signatures", () => {
    expectUnique(records.map(({ content }) => content.title));
    expectUnique(records.map(({ content }) => content.description));
    expectUnique(records.map(({ content }) => content.h1));

    const signatures = records.map(({ content }) =>
      [
        content.title,
        content.description,
        content.h1,
        ...content.hooks,
        ...content.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
        ]),
      ].join("\u001f"),
    );
    expectUnique(signatures);
  });

  it("uses the short city name in customer-facing city fields", () => {
    for (const { site, content } of records) {
      const customerFields = [
        content.title,
        content.description,
        content.h1,
        content.eyebrow,
        content.faqIntro,
        ...content.keywords,
        ...content.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
        ]),
      ];
      if (site.officialName !== site.searchName) {
        for (const value of customerFields) {
          expect(value).not.toContain(site.officialName);
        }
      }
    }
  });

  it("keeps 10–12 sections and makes the region directory the final section", () => {
    for (const { node, content } of records) {
      expect(content.sections.length).toBeGreaterThanOrEqual(10);
      expect(content.sections.length).toBeLessThanOrEqual(12);
      expect(content.sections.at(-1)?.id).toMatch(/directory$/u);
      expect(content.childDirectory.heading).toBe(content.sections.at(-1)?.heading);
      expect(content.childDirectory.intro).toBe(content.sections.at(-1)?.paragraphs[0]);
      expect(content.detailMode).toBe(
        node.kind === "home" ? "root" : node.kind === "district" ? "district" : "leaf",
      );
    }
  });

  it("uses all six layout semantics without artificial editorial wrappers", () => {
    expect(new Set(records.map(({ content }) => content.layoutSemantic)).size).toBe(6);
  });

  it("does not introduce unsupported popularity, branch, review or arrival claims", () => {
    const forbidden = [
      /인기\s*(?:순위|지역|장소)/u,
      /이용이\s*많은/u,
      /도착\s*(?:예정|보장|\d+\s*분)/u,
      /\d+\s*분\s*(?:이내|안에)\s*도착/u,
      /(?:오프라인\s*)?(?:매장|지점)\s*(?:운영|위치|안내)/u,
      /후기\s*\d+/u,
      /평점\s*\d/u,
      /(?:검색|노출)\s*1위/u,
      /효과를\s*보장/u,
    ];
    const allProse = records.flatMap(({ content }) => [
      content.description,
      ...content.hooks,
      content.faqIntro,
      ...content.sections.flatMap((section) => [
        section.heading,
        ...section.paragraphs,
      ]),
    ]);
    for (const value of allProse) {
      for (const pattern of forbidden) expect(value).not.toMatch(pattern);
    }
  });

  it("keeps preview builds noindex with .invalid canonicals until publication", () => {
    for (const site of ALL_BABY_SITES) {
      const publication = getSitePublicationContract(site);
      const home = getRegionNodesForSite(site)[0];
      expect(home).toBeDefined();
      const metadata = createRegionMetadataContract(home!, site);
      if (!publication.indexable) {
        expect(publication.origin.endsWith(".invalid")).toBe(true);
        expect(metadata.canonical.endsWith(".invalid/")).toBe(true);
        expect(metadata.robots).toEqual({
          index: false,
          follow: false,
          nocache: true,
        });
      } else {
        expect(publication.origin).toBe(site.publicOrigin);
        expect(metadata.robots).toEqual({ index: true, follow: true });
      }
    }
  });

  it("emits WebPage/BreadcrumbList and BlogPosting schemas on the same origin", () => {
    for (const site of ALL_BABY_SITES) {
      const origin = getSitePublicationContract(site).origin;
      const nodes = getRegionNodesForSite(site);
      for (const node of [nodes[0], nodes.at(-1)]) {
        expect(node).toBeDefined();
        const schema = createRegionPageJsonLd(node!, site);
        expect(schema["@graph"][0]["@type"]).toBe("WebPage");
        expect(schema["@graph"][1]["@type"]).toBe("BreadcrumbList");
        expect(new URL(schema["@graph"][0].url).origin).toBe(origin);
        expect(schema["@graph"][1].itemListElement[0]?.name).toBe(site.searchName);
      }
      for (const post of getBlogPosts(site)) {
        const schema = createBlogPostingJsonLd(post);
        expect(schema["@type"]).toBe("BlogPosting");
        expect(new URL(schema.url).origin).toBe(origin);
        expect(schema.dateModified).toBe(post.modifiedAt);
      }
    }
  });

  it("uses stable, non-future route-group lastmod revisions", () => {
    const first = JSON.stringify(SITE_CONTENT_REVISIONS);
    const second = JSON.stringify(SITE_CONTENT_REVISIONS);
    expect(second).toBe(first);
    const ceiling = Date.now();
    for (const value of Object.values(SITE_CONTENT_REVISIONS)) {
      expect(Number.isNaN(Date.parse(value))).toBe(false);
      expect(Date.parse(value)).toBeLessThanOrEqual(ceiling);
    }
    for (const { node } of records) {
      expect(getRegionContentModifiedAt(node)).toBe(
        getRouteContentModifiedAt(node.path, node),
      );
    }
  });
});

describe("city-specific editorial posts", () => {
  it("provides two real dated full-body posts per site with exact-unique documents", () => {
    const posts = ALL_BABY_SITES.flatMap((site) => getBlogPosts(site));
    expect(posts).toHaveLength(54);
    for (const site of ALL_BABY_SITES) {
      const sitePosts = getBlogPosts(site);
      expect(sitePosts).toHaveLength(2);
      for (const post of sitePosts) {
        expect(post.sections).toHaveLength(4);
        expect(post.sections.every((section) => section.paragraphs.length === 2)).toBe(true);
        expect(Date.parse(post.publishedAt)).toBeLessThanOrEqual(Date.parse(post.modifiedAt));
        expect(Date.parse(post.modifiedAt)).toBeLessThanOrEqual(
          Date.parse("2026-08-19T23:59:59+09:00"),
        );
      }
    }
    expectUnique(posts.map((post) => post.title));
    expectUnique(posts.map((post) => post.description));
    expectUnique(
      posts.map((post) =>
        [
          post.intro,
          ...post.sections.flatMap((section) => [
            section.heading,
            ...section.paragraphs,
          ]),
          ...post.checklist,
        ].join("\u001f"),
      ),
    );
  });
});
