import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Template11Home } from "@/components/template11-home";
import {
  CITY_FACT_PROFILES,
  getCityFactProfile,
} from "@/data/city-fact-profiles";
import { createRegionContent } from "@/lib/content";
import { getRegionNodesForSite } from "@/lib/regions";
import { ALL_BABY_SITES, BABY_SITE_KEYS } from "@/lib/site-config";

describe("official city fact profile contract", () => {
  it("covers every baby site exactly once with dated official provenance", () => {
    expect(CITY_FACT_PROFILES).toHaveLength(27);
    expect(new Set(CITY_FACT_PROFILES.map((item) => item.siteKey))).toEqual(
      new Set(BABY_SITE_KEYS),
    );

    for (const item of CITY_FACT_PROFILES) {
      expect(item.checkedAt).toBe("2026-08-19");
      expect(item.addressAxes.length).toBeGreaterThanOrEqual(3);
      expect(item.addressAxes.length).toBeLessThanOrEqual(5);
      expect(item.sections).toHaveLength(4);
      expect(new Set(item.sections.map((section) => section.id)).size).toBe(4);
      expect(item.sources.length).toBeGreaterThanOrEqual(1);
      for (const source of item.sources) {
        expect(source.url).toMatch(/^https:\/\//u);
        expect(new URL(source.url).hostname).toMatch(
          /(?:(?:^|\.)go\.kr|(?:^|\.)shsi\.or\.kr)$/u,
        );
      }
      expect(Object.isFrozen(item)).toBe(true);
      expect(Object.isFrozen(item.paragraphs)).toBe(true);
      expect(Object.isFrozen(item.addressAxes)).toBe(true);
      expect(Object.isFrozen(item.sections)).toBe(true);
      expect(Object.isFrozen(item.sources)).toBe(true);
    }
  });

  it("renders the four sourced fact blocks and visible source links on every home", () => {
    const renderedSourceUrls = new Set<string>();
    for (const site of ALL_BABY_SITES) {
      const home = getRegionNodesForSite(site).find((node) => node.kind === "home");
      expect(home).toBeDefined();
      const profile = getCityFactProfile(site.key);
      const content = createRegionContent(home!, site);

      expect(content.indexEligible).toBe(true);
      expect(content.officialSources).toEqual(profile.sources);
      for (const section of profile.sections) {
        const rendered = content.sections.find(
          (candidate) => candidate.id === `city-fact-${section.id}`,
        );
        expect(rendered?.heading).toContain(section.heading);
        expect(rendered?.paragraphs).toEqual(section.paragraphs);
      }

      const html = renderToStaticMarkup(
        createElement(Template11Home, {
          brandName: site.brandName,
          cityName: site.searchName,
          content,
          designProfile: site.designProfile,
          directoryItems: [],
          layoutVariant: site.layoutVariant,
        }),
      );
      const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/giu)].map(
        (match) => (match[1] ?? "").replaceAll("&amp;", "&"),
      );
      for (const source of profile.sources) {
        expect(hrefs).toContain(source.url);
        expect(html).toContain(source.label);
        renderedSourceUrls.add(source.url);
      }
    }
    expect(renderedSourceUrls.size).toBe(60);
  });
});
