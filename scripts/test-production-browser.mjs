import { spawnSync } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { readFile, rm, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

import { chromium } from "playwright";

import {
  expectedLayoutSemantic,
  expectedPublicationOrigin,
  expectedRouteIndexing,
  hasRscQuery,
  PRODUCTION_BROWSER_VIEWPORTS,
  representativeBrowserRoutes,
  selectBrowserGateSites,
} from "./lib/production-browser-contract.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const NEXT_ROOT = path.join(ROOT, ".next");
const OUTPUT_ROOT = path.join(ROOT, "out");
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const inventory = JSON.parse(
  await readFile(path.join(ROOT, "src/data/city-regions.generated.json"), "utf8"),
);

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function buildSite(site) {
  const gaMeasurementId = process.env[site.gaMeasurementIdEnv]?.trim() ?? "";
  const publication = expectedPublicationOrigin(site);
  if (publication.indexable && !/^G-[A-Z0-9]{4,15}$/u.test(gaMeasurementId)) {
    fail("BABY_BROWSER_PUBLIC_GA4_MEASUREMENT_ID_REQUIRED", site.key);
  }
  const build = spawnSync(process.execPath, [NEXT_BIN, "build"], {
    cwd: ROOT,
    env: {
      ...process.env,
      BABY_SITE_KEY: site.key,
      NEXT_PUBLIC_GA_MEASUREMENT_ID: gaMeasurementId,
      NODE_ENV: "production",
    },
    stdio: "inherit",
  });
  if (build.status !== 0) {
    fail("BABY_BROWSER_PRODUCTION_BUILD_FAILED", `${site.key}:${build.status ?? "signal"}`);
  }
  if (!existsSync(path.join(OUTPUT_ROOT, "index.html"))) {
    fail("BABY_BROWSER_EXPORT_MISSING", site.key);
  }
}

function safeOutputPath(requestUrl) {
  const parsed = new URL(requestUrl, "http://127.0.0.1");
  let decoded;
  try {
    decoded = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }
  const relativePath = decoded === "/"
    ? "index.html"
    : decoded.endsWith("/")
      ? `${decoded.slice(1)}index.html`
      : decoded.slice(1);
  const candidate = path.resolve(OUTPUT_ROOT, relativePath);
  if (candidate !== OUTPUT_ROOT && !candidate.startsWith(`${OUTPUT_ROOT}${path.sep}`)) {
    return null;
  }
  return candidate;
}

async function startStaticServer() {
  const server = http.createServer(async (request, response) => {
    const filePath = safeOutputPath(request.url ?? "/");
    if (!filePath) {
      response.writeHead(400, { "Cache-Control": "no-store" });
      response.end("Bad request");
      return;
    }
    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) throw Object.assign(new Error("not a file"), { code: "ENOENT" });
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Length": String(fileStat.size),
        "Content-Type": MIME_TYPES.get(path.extname(filePath)) ?? "application/octet-stream",
      });
      if (request.method === "HEAD") {
        response.end();
      } else {
        createReadStream(filePath).pipe(response);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        response.writeHead(500, { "Cache-Control": "no-store" });
        response.end("Internal server error");
        return;
      }
      response.writeHead(404, { "Cache-Control": "no-store" });
      response.end("Not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    fail("BABY_BROWSER_SERVER_ADDRESS_INVALID");
  }
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}

function summarizeInitiator(initiator) {
  const firstFrame = initiator?.stack?.callFrames?.[0];
  return {
    type: initiator?.type ?? "unknown",
    url: firstFrame?.url ?? null,
    functionName: firstFrame?.functionName ?? null,
    lineNumber: firstFrame?.lineNumber ?? null,
    columnNumber: firstFrame?.columnNumber ?? null,
  };
}

function requiredAnchorHrefs(site, route) {
  const [, areasRoute, districtRoute, leafRoute] = representativeBrowserRoutes(site);
  const required = ["/", areasRoute, "/pricing/", "/guide/", "/notice/", "/blog/"];
  if (route === areasRoute) required.push(districtRoute);
  if (route === districtRoute) required.push(leafRoute);
  if (route === leafRoute) required.push(districtRoute);
  return [...new Set(required)];
}

async function verifyAnchorTargets({ hrefs, localOrigin, route, site, viewport }) {
  const failures = [];
  for (const href of new Set(hrefs)) {
    const target = new URL(href, localOrigin);
    target.hash = "";
    const response = await fetch(target, {
      method: "HEAD",
      redirect: "manual",
    });
    if (response.status !== 200 || response.headers.has("location")) {
      failures.push({ href, status: response.status, location: response.headers.get("location") });
    }
  }
  if (failures.length > 0) {
    fail(
      "BABY_BROWSER_ANCHOR_HTTP",
      `${site.key}:${viewport.name}:${route}:${JSON.stringify(failures)}`,
    );
  }
}

async function auditRoute({ browser, localOrigin, route, site, viewport }) {
  const context = await browser.newContext({
    ...viewport.context,
    locale: "ko-KR",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

  const rscRequests = [];
  const playwrightRscRequests = [];
  const httpFailures = [];
  const requestFailures = [];
  const pageErrors = [];
  const pendingSameOrigin = new Set();
  let requestCount = 0;

  cdp.on("Network.requestWillBeSent", (event) => {
    requestCount += 1;
    if (hasRscQuery(event.request.url)) {
      rscRequests.push({
        sourcePage: route,
        url: event.request.url,
        documentUrl: event.documentURL,
        resourceType: event.type,
        initiator: summarizeInitiator(event.initiator),
      });
    }
  });
  page.on("request", (request) => {
    if (request.url().startsWith(localOrigin)) pendingSameOrigin.add(request);
    if (hasRscQuery(request.url())) {
      let frameUrl = null;
      try {
        frameUrl = request.frame().url();
      } catch {
        // A service request can be frame-less. It is still a gate failure.
      }
      playwrightRscRequests.push({
        sourcePage: route,
        url: request.url(),
        resourceType: request.resourceType(),
        frameUrl,
        isNavigationRequest: request.isNavigationRequest(),
      });
    }
  });
  page.on("requestfinished", (request) => pendingSameOrigin.delete(request));
  page.on("response", (response) => {
    if (
      response.url().startsWith(localOrigin) &&
      response.status() >= 400
    ) {
      httpFailures.push({ status: response.status(), url: response.url() });
    }
  });
  page.on("requestfailed", (request) => {
    pendingSameOrigin.delete(request);
    if (request.url().startsWith(localOrigin)) {
      requestFailures.push({
        error: request.failure()?.errorText ?? "unknown",
        url: request.url(),
      });
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  async function waitForSameOriginQuiet() {
    const deadline = Date.now() + 15_000;
    let quietSince = null;
    while (Date.now() < deadline) {
      if (pendingSameOrigin.size === 0) {
        quietSince ??= Date.now();
        if (Date.now() - quietSince >= 750) return;
      } else {
        quietSince = null;
      }
      await page.waitForTimeout(50);
    }
    fail(
      "BABY_BROWSER_SAME_ORIGIN_NOT_QUIET",
      `${site.key}:${viewport.name}:${route}:${JSON.stringify([...pendingSameOrigin].map((request) => request.url()))}`,
    );
  }

  try {
    const response = await page.goto(new URL(route, localOrigin).href, {
      waitUntil: "load",
      timeout: 30_000,
    });
    if (!response || response.status() !== 200) {
      fail(
        "BABY_BROWSER_DOCUMENT_HTTP",
        `${site.key}:${viewport.name}:${route}:${response?.status() ?? "no-response"}`,
      );
    }
    if (response.url() !== new URL(route, localOrigin).href) {
      fail(
        "BABY_BROWSER_DOCUMENT_REDIRECT",
        `${site.key}:${viewport.name}:${route}:${response.url()}`,
      );
    }
    await page.evaluate(async () => {
      await document.fonts?.ready;
    });
    await waitForSameOriginQuiet();

    const initialHtml = await response.text();
    const initialHrefs = [...initialHtml.matchAll(/<a\b[^>]*\bhref=(["'])(.*?)\1/giu)]
      .map((match) => match[2] ?? "");
    const initialInvalidHrefs = initialHrefs.filter(
      (href) => !href.trim() || /^javascript:/iu.test(href.trim()),
    );
    const initialInternalHrefs = initialHrefs.filter(
      (href) => href.startsWith("/") && !href.startsWith("//"),
    );
    if (initialInvalidHrefs.length > 0 || initialInternalHrefs.length === 0) {
      fail(
        "BABY_BROWSER_INITIAL_ANCHOR_CONTRACT",
        `${site.key}:${viewport.name}:${route}:${JSON.stringify({ initialInvalidHrefs, initialInternalAnchorCount: initialInternalHrefs.length })}`,
      );
    }

    const dom = await page.evaluate(() => {
      const anchors = [...document.querySelectorAll("a[href]")].map((anchor) => ({
        raw: anchor.getAttribute("href") ?? "",
        resolved: anchor.href,
      }));
      return {
        anchors,
        canonical: [...document.querySelectorAll('link[rel="canonical"]')].map(
          (element) => element.getAttribute("href") ?? "",
        ),
        h1Count: document.querySelectorAll("h1").length,
        lang: document.documentElement.lang,
        layoutVariant: document.documentElement.dataset.layoutVariant ?? "",
        missingFragmentAnchors: anchors
          .filter(({ raw }) => raw.startsWith("#") && raw.length > 1)
          .filter(({ raw }) => !document.getElementById(decodeURIComponent(raw.slice(1))))
          .map(({ raw }) => raw),
        robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "",
        siteKey: document.documentElement.dataset.babySite ?? "",
      };
    });

    const publication = expectedPublicationOrigin(site);
    const expectedCanonical = new URL(route, publication.origin).href;
    const invalidAnchors = dom.anchors.filter(
      ({ raw }) => !raw.trim() || /^javascript:/iu.test(raw.trim()),
    );
    const internalAnchors = dom.anchors.filter(
      ({ raw }) => raw.startsWith("/") && !raw.startsWith("//"),
    );
    const internalAnchorsWithQuery = internalAnchors.filter(({ raw }) => {
      try {
        return new URL(raw, localOrigin).search.length > 0;
      } catch {
        return true;
      }
    });
    const missingRequiredHrefs = requiredAnchorHrefs(site, route).filter(
      (href) => !initialInternalHrefs.includes(href),
    );
    if (
      dom.canonical.length !== 1 ||
      dom.canonical[0] !== expectedCanonical
    ) {
      fail(
        "BABY_BROWSER_CANONICAL",
        `${site.key}:${viewport.name}:${route}:${JSON.stringify(dom.canonical)}:${expectedCanonical}`,
      );
    }
    const expectedIndexing = expectedRouteIndexing(site, route);
    const hasIndex = /\bindex\b/iu.test(dom.robots);
    const hasNoIndex = /\bnoindex\b/iu.test(dom.robots);
    const hasFollow = /\bfollow\b/iu.test(dom.robots);
    const hasNoFollow = /\bnofollow\b/iu.test(dom.robots);
    if (
      dom.siteKey !== site.key ||
      dom.layoutVariant !== expectedLayoutSemantic(site.layoutVariant) ||
      dom.lang !== "ko" ||
      dom.h1Count !== 1 ||
      (expectedIndexing.index ? !hasIndex || hasNoIndex : !hasNoIndex || hasIndex) ||
      (expectedIndexing.follow ? !hasFollow || hasNoFollow : !hasNoFollow || hasFollow)
    ) {
      fail(
        "BABY_BROWSER_DOCUMENT_CONTRACT",
        `${site.key}:${viewport.name}:${route}:${JSON.stringify({ siteKey: dom.siteKey, layoutVariant: dom.layoutVariant, lang: dom.lang, h1Count: dom.h1Count, robots: dom.robots })}`,
      );
    }
    if (
      invalidAnchors.length > 0 ||
      internalAnchors.length === 0 ||
      internalAnchorsWithQuery.length > 0 ||
      dom.missingFragmentAnchors.length > 0 ||
      missingRequiredHrefs.length > 0
    ) {
      fail(
        "BABY_BROWSER_ANCHOR_CONTRACT",
        `${site.key}:${viewport.name}:${route}:${JSON.stringify({ invalidAnchors, internalAnchorCount: internalAnchors.length, internalAnchorsWithQuery, missingFragmentAnchors: dom.missingFragmentAnchors, missingRequiredHrefs })}`,
      );
    }
    await verifyAnchorTargets({
      hrefs: initialInternalHrefs,
      localOrigin,
      route,
      site,
      viewport,
    });

    await page.evaluate(async () => {
      const wait = (milliseconds) => new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
      });
      const bottom = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      for (const fraction of [0.25, 0.5, 0.75, 1]) {
        window.scrollTo({ top: Math.round(bottom * fraction), behavior: "instant" });
        await wait(150);
      }
    });
    await waitForSameOriginQuiet();

    const visualBasics = await page.evaluate(() => ({
      brokenImages: [...document.images]
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    if (
      visualBasics.brokenImages.length > 0 ||
      visualBasics.scrollWidth > visualBasics.clientWidth + 1
    ) {
      fail(
        "BABY_BROWSER_VISUAL_BASICS",
        `${site.key}:${viewport.name}:${route}:${JSON.stringify(visualBasics)}`,
      );
    }

    if (playwrightRscRequests.length > 0 || rscRequests.length > 0) {
      fail(
        "BABY_BROWSER_AUTOMATIC_RSC_REQUEST",
        `${site.key}:${viewport.name}:${route}:${JSON.stringify({ playwright: playwrightRscRequests, cdp: rscRequests })}`,
      );
    }
    if (httpFailures.length > 0 || requestFailures.length > 0 || pageErrors.length > 0) {
      fail(
        "BABY_BROWSER_RUNTIME_FAILURE",
        `${site.key}:${viewport.name}:${route}:${JSON.stringify({ httpFailures, requestFailures, pageErrors })}`,
      );
    }

    return {
      siteKey: site.key,
      layoutVariant: site.layoutVariant,
      viewport: viewport.name,
      route,
      status: response.status(),
      canonical: expectedCanonical,
      internalAnchors: internalAnchors.length,
      requests: requestCount,
      automaticRscRequests: 0,
    };
  } finally {
    await context.close();
  }
}

const browserPath = chromium.executablePath();
if (!existsSync(browserPath)) {
  fail(
    "BABY_BROWSER_CHROMIUM_MISSING",
    `${browserPath}:run pnpm exec playwright install chromium`,
  );
}

const selectedSites = selectBrowserGateSites(inventory);
const results = [];
let browser;
let browserVersion = "unknown";

try {
  browser = await chromium.launch({ headless: true });
  browserVersion = browser.version();
  for (const site of selectedSites) {
    await rm(NEXT_ROOT, { recursive: true, force: true });
    await rm(OUTPUT_ROOT, { recursive: true, force: true });
    buildSite(site);
    const server = await startStaticServer();
    try {
      for (const viewport of PRODUCTION_BROWSER_VIEWPORTS) {
        for (const route of representativeBrowserRoutes(site)) {
          results.push(
            await auditRoute({
              browser,
              localOrigin: server.origin,
              route,
              site,
              viewport,
            }),
          );
        }
      }
    } finally {
      await server.close();
    }
  }
} finally {
  await browser?.close();
}

const expectedChecks = selectedSites.reduce(
  (total, site) =>
    total + representativeBrowserRoutes(site).length * PRODUCTION_BROWSER_VIEWPORTS.length,
  0,
);
if (results.length !== expectedChecks) {
  fail("BABY_BROWSER_CHECK_COUNT", `${results.length}:${expectedChecks}`);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      browser: browserVersion,
      sites: selectedSites.map((site) => ({
        key: site.key,
        layoutVariant: site.layoutVariant,
        routes: representativeBrowserRoutes(site),
      })),
      viewports: PRODUCTION_BROWSER_VIEWPORTS.map(({ name, context }) => ({
        name,
        viewport: context.viewport,
      })),
      checks: results.length,
      automaticRscRequests: 0,
      results,
    },
    null,
    2,
  ),
);
