const LAYOUT_VARIANTS = Object.freeze(["v1", "v2", "v3", "v4", "v5", "v6"]);
const LAYOUT_SEMANTICS = Object.freeze({
  v1: "v1-center-chronicle",
  v2: "v2-editorial-rail",
  v3: "v3-alternating-spread",
  v4: "v4-numbered-ledger",
  v5: "v5-magazine-panels",
  v6: "v6-compact-bands",
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

export function exactHttpsPublicOrigin(value) {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      parsed.hostname.endsWith(".invalid") ||
      parsed.origin !== value
    ) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function expectedPublicationOrigin(site) {
  const publicOrigin = exactHttpsPublicOrigin(site.publicOrigin);
  const indexable =
    site.deploymentState === "public" &&
    site.isPublic === true &&
    site.indexingEnabled === true &&
    publicOrigin !== null;
  return {
    indexable,
    origin: indexable
      ? publicOrigin
      : `https://${site.slug}.preview.gyeonggi-baby.invalid`,
  };
}

export function selectBrowserGateSites(inventory) {
  const sites = inventory?.sites;
  if (!Array.isArray(sites) || sites.length !== 27) {
    fail("BABY_BROWSER_INVENTORY_COUNT", String(sites?.length ?? "missing"));
  }

  const selected = LAYOUT_VARIANTS.map((variant) => {
    const candidates = sites.filter((site) => site.layoutVariant === variant);
    if (candidates.length === 0) {
      fail("BABY_BROWSER_VARIANT_MISSING", variant);
    }
    const withDistrict = candidates.find(
      (site) => site.counts?.districtHubs > 0 && site.counts?.representativeLeaves > 0,
    );
    const fallback = candidates.find((site) => site.counts?.representativeLeaves > 0);
    const site = withDistrict ?? fallback;
    if (!site) fail("BABY_BROWSER_VARIANT_ROUTELESS", variant);
    return site;
  });

  if (
    selected.length !== LAYOUT_VARIANTS.length ||
    new Set(selected.map((site) => site.key)).size !== LAYOUT_VARIANTS.length
  ) {
    fail("BABY_BROWSER_SITE_SELECTION_INVALID");
  }
  return selected;
}

export function representativeBrowserRoutes(site) {
  const regions = Array.isArray(site.regions) ? site.regions : [];
  const firstDistrict = site.districtNames?.[0] ?? null;
  const leaf = firstDistrict
    ? regions.find((region) => region.district === firstDistrict)
    : regions[0];
  if (!leaf?.path) fail("BABY_BROWSER_LEAF_ROUTE_MISSING", site.key);

  const routes = ["/", "/areas/"];
  if (firstDistrict) {
    routes.push(`/areas/${encodeURIComponent(firstDistrict)}/`);
  }
  routes.push(leaf.path);

  if (new Set(routes).size !== routes.length) {
    fail("BABY_BROWSER_ROUTE_SELECTION_DUPLICATE", site.key);
  }
  return routes;
}

export function expectedLayoutSemantic(layoutVariant) {
  const semantic = LAYOUT_SEMANTICS[layoutVariant];
  if (!semantic) fail("BABY_BROWSER_LAYOUT_SEMANTIC_UNKNOWN", String(layoutVariant));
  return semantic;
}

export function hasRscQuery(value) {
  try {
    return new URL(value).searchParams.has("_rsc");
  } catch {
    return false;
  }
}

export const PRODUCTION_BROWSER_VIEWPORTS = Object.freeze([
  Object.freeze({
    name: "desktop",
    context: Object.freeze({ viewport: Object.freeze({ width: 1440, height: 1000 }) }),
  }),
  Object.freeze({
    name: "mobile",
    context: Object.freeze({
      viewport: Object.freeze({ width: 390, height: 844 }),
      isMobile: true,
      hasTouch: true,
    }),
  }),
]);

export const PRODUCTION_BROWSER_VARIANTS = LAYOUT_VARIANTS;
