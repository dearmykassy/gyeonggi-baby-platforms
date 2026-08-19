import { describe, expect, it } from "vitest";
import { getBlogPostPath, getBlogPosts } from "@/data/blog-posts";
import { getSiteOrigin } from "@/lib/metadata";
import {
  createRssFeedItems,
  createRssXml,
  getFullPostHtml,
  getFullPostText,
} from "@/lib/rss";
import { ALL_BABY_SITES } from "@/lib/site-config";

function matches(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}

describe("baby platform RSS 2.0 contract", () => {
  it("contains exactly two same-origin canonical editorial items per city", () => {
    for (const site of ALL_BABY_SITES) {
      const origin = getSiteOrigin(site);
      const posts = getBlogPosts(site);
      const items = createRssFeedItems(site);
      expect(posts).toHaveLength(2);
      expect(items).toHaveLength(2);
      expect(new Set(items.map((item) => item.guid)).size).toBe(2);
      for (const item of items) {
        expect(item.guid).toBe(item.link);
        expect(new URL(item.link).origin).toBe(origin);
        expect(item.link.startsWith(`${origin}/blog/`)).toBe(true);
        expect(item.bodyText.length).toBeGreaterThan(900);
        expect(item.bodyHtml.startsWith("<article>")).toBe(true);
        expect(item.bodyHtml.endsWith("</article>")).toBe(true);
        expect(item.bodyHtml).toContain("<h2>");
        expect(item.bodyHtml).toContain("<ul>");
      }
    }
  });

  it("renders stable full-body RSS 2.0 with ko-KR and real dates", () => {
    for (const site of ALL_BABY_SITES) {
      const first = createRssXml(site);
      const second = createRssXml(site);
      expect(second).toBe(first);
      expect(first.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
      expect(first).toContain('<rss version="2.0"');
      expect(first).toContain("<language>ko-KR</language>");
      expect(first).toContain('rel="self" type="application/rss+xml"');
      expect(first).toContain("<content:encoded><![CDATA[<article>");
      expect(first).toContain("<dcterms:modified>");
      expect(matches(first, /<item>/gu)).toBe(2);
      expect(matches(first, /<guid isPermaLink="true">/gu)).toBe(2);
      expect(first).not.toContain("<priority>");
      expect(first).not.toContain("<changefreq>");

      for (const post of getBlogPosts(site)) {
        const absolute = new URL(getBlogPostPath(post), getSiteOrigin(site)).href;
        expect(first).toContain(absolute);
        expect(first).toContain(post.publishedAt);
        expect(first).toContain(getFullPostHtml(post));
        expect(getFullPostText(post)).toContain(post.intro);
      }
    }
  });

  it("rejects empty, extra, cross-origin, unstable-date and non-canonical items", () => {
    const site = ALL_BABY_SITES[0];
    expect(site).toBeDefined();
    const items = createRssFeedItems(site!);
    expect(() => createRssXml(site!, [])).toThrow(/EXACT_ITEM_COUNT/u);
    expect(() => createRssXml(site!, [...items, items[0]!])).toThrow(
      /EXACT_ITEM_COUNT/u,
    );

    const badOrigin = [
      { ...items[0]!, link: "https://example.com/blog/not-canonical/" },
      items[1]!,
    ];
    expect(() => createRssXml(site!, badOrigin)).toThrow(/ITEM_CONTRACT/u);

    const badGuid = [
      { ...items[0]!, guid: `${items[0]!.guid}copy` },
      items[1]!,
    ];
    expect(() => createRssXml(site!, badGuid)).toThrow(/ITEM_CONTRACT/u);

    const badDate = [
      {
        ...items[0]!,
        publishedAt: "2026-08-19T10:00:00+09:00",
        modifiedAt: "2026-08-18T10:00:00+09:00",
      },
      items[1]!,
    ];
    expect(() => createRssXml(site!, badDate)).toThrow(/ITEM_CONTRACT/u);
  });
});
