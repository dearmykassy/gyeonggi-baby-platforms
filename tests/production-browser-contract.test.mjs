import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  expectedLayoutSemantic,
  expectedPublicationOrigin,
  expectedRouteIndexing,
  hasRscQuery,
  PRODUCTION_BROWSER_VARIANTS,
  PRODUCTION_BROWSER_VIEWPORTS,
  representativeBrowserRoutes,
  selectBrowserGateSites,
} from "../scripts/lib/production-browser-contract.mjs";

const inventory = JSON.parse(
  await readFile(new URL("../src/data/city-regions.generated.json", import.meta.url), "utf8"),
);

describe("production browser release contract", () => {
  it("selects one district-capable site for every Template11 variant", () => {
    const sites = selectBrowserGateSites(inventory);
    expect(sites).toHaveLength(6);
    expect(sites.map((site) => site.layoutVariant)).toEqual(
      PRODUCTION_BROWSER_VARIANTS,
    );
    expect(new Set(sites.map((site) => site.key)).size).toBe(6);
    for (const site of sites) {
      expect(expectedLayoutSemantic(site.layoutVariant)).toMatch(
        new RegExp(`^${site.layoutVariant}-`, "u"),
      );
      expect(site.counts.districtHubs).toBeGreaterThan(0);
      expect(site.counts.representativeLeaves).toBeGreaterThan(0);
      const routes = representativeBrowserRoutes(site);
      expect(routes).toHaveLength(4);
      expect(routes[0]).toBe("/");
      expect(routes[1]).toBe("/areas/");
      expect(routes[2]).toMatch(/^\/areas\/[^/]+\/$/u);
      expect(routes[3]).toMatch(/^\/areas\/[^/]+\/[^/]+\/$/u);
      expect(new Set(routes).size).toBe(4);
    }
  });

  it("covers desktop and mobile viewports", () => {
    expect(PRODUCTION_BROWSER_VIEWPORTS.map(({ name }) => name)).toEqual([
      "desktop",
      "mobile",
    ]);
    expect(PRODUCTION_BROWSER_VIEWPORTS[0].context.viewport.width).toBe(1440);
    expect(PRODUCTION_BROWSER_VIEWPORTS[1].context.viewport.width).toBe(390);
  });

  it("detects only an actual _rsc query parameter", () => {
    expect(hasRscQuery("https://example.test/areas/?_rsc=abc")).toBe(true);
    expect(hasRscQuery("https://example.test/?a=1&%5Frsc=abc")).toBe(true);
    expect(hasRscQuery("https://example.test/?_RSC=abc")).toBe(false);
    expect(hasRscQuery("https://example.test/path/_rsc/value")).toBe(false);
    expect(hasRscQuery("not-a-url")).toBe(false);
  });

  it("derives canonical origins from the exact public tuple, never origin", () => {
    const base = inventory.sites[0];
    expect(
      expectedPublicationOrigin({
        ...base,
        deploymentState: "planned",
        isPublic: true,
        indexingEnabled: true,
        publicOrigin: null,
        origin: "https://origin-bypass.example",
      }),
    ).toEqual({
      indexable: false,
      origin: `https://${base.slug}.preview.gyeonggi-baby.invalid`,
    });
    expect(
      expectedPublicationOrigin({
        ...base,
        deploymentState: "public",
        isPublic: true,
        indexingEnabled: true,
        publicOrigin: "https://published.example",
        origin: "https://origin-bypass.example",
      }),
    ).toEqual({
      indexable: true,
      origin: "https://published.example",
    });
  });

  it("keeps staged public indexing route-aware while previews remain closed", () => {
    const base = inventory.sites[0];
    const preview = {
      ...base,
      deploymentState: "planned",
      isPublic: false,
      indexingEnabled: false,
      publicOrigin: null,
    };
    const published = {
      ...base,
      deploymentState: "public",
      isPublic: true,
      indexingEnabled: true,
      publicOrigin: "https://published.example",
    };

    expect(expectedRouteIndexing(preview, "/")).toEqual({
      index: false,
      follow: false,
    });
    expect(expectedRouteIndexing(preview, "/areas/")).toEqual({
      index: false,
      follow: false,
    });
    expect(expectedRouteIndexing(published, "/")).toEqual({
      index: true,
      follow: true,
    });
    for (const route of [
      "/areas/",
      "/areas/%EC%9E%A5%EC%95%88%EA%B5%AC/",
      "/areas/%EC%9E%A5%EC%95%88%EA%B5%AC/%EC%A0%95%EC%9E%90%EB%8F%99/",
      "/pricing/",
      "/guide/",
      "/notice/",
      "/blog/",
    ]) {
      expect(expectedRouteIndexing(published, route)).toEqual({
        index: false,
        follow: true,
      });
    }
  });
});
