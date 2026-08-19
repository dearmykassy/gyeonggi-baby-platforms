import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  expectedLayoutSemantic,
  expectedPublicationOrigin,
  expectedRegionalSitemapUrls,
  expectedRouteIndexing,
  hasRscQuery,
  PRODUCTION_BROWSER_VARIANTS,
  PRODUCTION_BROWSER_VIEWPORTS,
  representativeBrowserRoutes,
  regionalRoutePaths,
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

  it("indexes every public regional route while ancillary routes stay staged", () => {
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
    const regionalPaths = regionalRoutePaths(published);
    const districtRoute = regionalPaths.find(
      (route) => route !== "/" && route.split("/").filter(Boolean).length === 2,
    );
    const leafRoute = regionalPaths.find(
      (route) => route.split("/").filter(Boolean).length === 3,
    );
    expect(districtRoute).toBeTruthy();
    expect(leafRoute).toBeTruthy();
    expect(regionalPaths).toHaveLength(base.counts.regionalCanonicals);
    expect(new Set(regionalPaths).size).toBe(regionalPaths.length);

    expect(expectedRouteIndexing(preview, leafRoute)).toEqual({
      index: false,
      follow: false,
    });
    for (const route of ["/", districtRoute, leafRoute]) {
      expect(expectedRouteIndexing(published, route)).toEqual({
        index: true,
        follow: true,
      });
    }
    for (const route of ["/areas/", "/pricing/", "/guide/", "/notice/", "/blog/"]) {
      expect(expectedRouteIndexing(published, route)).toEqual({
        index: false,
        follow: true,
      });
    }
  });

  it("expects the exact complete regional sitemap on public and preview builds", () => {
    const base = inventory.sites[0];
    const publicSite = {
      ...base,
      deploymentState: "public",
      isPublic: true,
      indexingEnabled: true,
      publicOrigin: "https://published.example",
    };
    const previewSite = {
      ...base,
      deploymentState: "planned",
      isPublic: false,
      indexingEnabled: false,
      publicOrigin: null,
    };
    const paths = regionalRoutePaths(base);

    expect(expectedRegionalSitemapUrls(publicSite)).toEqual(
      paths.map((route) => new URL(route, "https://published.example").href),
    );
    expect(expectedRegionalSitemapUrls(previewSite)).toEqual(
      paths.map(
        (route) =>
          new URL(
            route,
            `https://${base.slug}.preview.gyeonggi-baby.invalid`,
          ).href,
      ),
    );
  });

  it("covers all 455 regional canonicals across the mixed 27-site inventory", () => {
    let regionalCanonicalTotal = 0;

    for (const site of inventory.sites) {
      const publication = expectedPublicationOrigin(site);
      const paths = regionalRoutePaths(site);
      const sitemapUrls = expectedRegionalSitemapUrls(site);
      regionalCanonicalTotal += paths.length;

      expect(paths).toHaveLength(site.counts.regionalCanonicals);
      expect(new Set(paths).size).toBe(paths.length);
      expect(sitemapUrls).toEqual(
        paths.map((route) => new URL(route, publication.origin).href),
      );
      for (const route of paths) {
        expect(expectedRouteIndexing(site, route)).toEqual({
          index: publication.indexable,
          follow: publication.indexable,
        });
      }
      expect(expectedRouteIndexing(site, "/areas/")).toEqual({
        index: false,
        follow: publication.indexable,
      });
    }

    expect(regionalCanonicalTotal).toBe(455);
  });
});
