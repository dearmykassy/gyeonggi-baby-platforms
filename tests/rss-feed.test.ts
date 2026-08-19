import { describe, expect, it } from "vitest";

import { getSiteOrigin } from "@/lib/metadata";
import { getIndexEligibleRegionNodes } from "@/lib/content";
import { getRegionNodesForSite } from "@/lib/regions";
import { createRssFeedItems, createRssXml } from "@/lib/rss";
import { ALL_BABY_SITES } from "@/lib/site-config";

function matches(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}

describe("baby platform staged RSS 2.0 contract", () => {
  it("keeps one editorial home item while all regional discovery stays in the sitemap", () => {
    for (const site of ALL_BABY_SITES) {
      const origin = getSiteOrigin(site);
      const items = createRssFeedItems(site);
      expect(getIndexEligibleRegionNodes(site)).toHaveLength(
        getRegionNodesForSite(site).length,
      );
      expect(items).toHaveLength(1);
      expect(items[0]?.guid).toBe(new URL("/", origin).href);
      expect(items[0]?.link).toBe(items[0]?.guid);
      expect(items[0]?.bodyText.length).toBeGreaterThan(900);
      expect(items[0]?.bodyHtml.startsWith("<article>")).toBe(true);
      expect(items[0]?.bodyHtml.endsWith("</article>")).toBe(true);
      expect(items[0]?.bodyHtml).toContain("<h2>");
      expect(items[0]?.link).not.toContain("/blog/");
    }
  });

  it("renders a stable one-item RSS feed with real editorial revision dates", () => {
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
      expect(matches(first, /<item>/gu)).toBe(1);
      expect(matches(first, /<guid isPermaLink="true">/gu)).toBe(1);
      expect(first).toContain(new URL("/", getSiteOrigin(site)).href);
      expect(first).not.toContain("/blog/");
      expect(first).not.toContain("<priority>");
      expect(first).not.toContain("<changefreq>");
    }
  });

  it("rejects empty, extra, cross-origin and non-home items", () => {
    const site = ALL_BABY_SITES[0];
    expect(site).toBeDefined();
    const items = createRssFeedItems(site!);
    expect(() => createRssXml(site!, [])).toThrow(/EXACT_ITEM_COUNT/u);
    expect(() => createRssXml(site!, [...items, items[0]!])).toThrow(
      /EXACT_ITEM_COUNT/u,
    );
    expect(() =>
      createRssXml(site!, [
        { ...items[0]!, link: "https://example.com/" },
      ]),
    ).toThrow(/ITEM_CONTRACT/u);
    expect(() =>
      createRssXml(site!, [
        {
          ...items[0]!,
          link: new URL("/blog/deferred/", getSiteOrigin(site!)).href,
          guid: new URL("/blog/deferred/", getSiteOrigin(site!)).href,
        },
      ]),
    ).toThrow(/ITEM_CONTRACT/u);
  });
});
