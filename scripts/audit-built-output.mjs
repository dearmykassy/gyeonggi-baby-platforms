import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import {
  auditBabyImageUrls,
  extractBabyImageUrls,
} from "./lib/built-output-images.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const siteKey = args.get("--site") ?? process.env.BABY_SITE_KEY;
const output = path.resolve(args.get("--output") ?? path.join(ROOT, "out"));
const inventory = JSON.parse(
  await readFile(path.join(ROOT, "src/data/city-regions.generated.json"), "utf8"),
);
const site = inventory.sites.find((candidate) => candidate.key === siteKey);
if (!site) throw new Error(`BABY_AUDIT_UNKNOWN_SITE:${siteKey}`);
if (!(await stat(output)).isDirectory()) throw new Error(`BABY_AUDIT_OUTPUT_MISSING:${output}`);

const indexable = Boolean(
  site.isPublic &&
    site.indexingEnabled &&
    site.publicOrigin &&
    String(site.publicOrigin).startsWith("https://"),
);
const origin = indexable
  ? new URL(site.publicOrigin).origin
  : `https://${site.slug}.preview.gyeonggi-baby.invalid`;
const sitemapXml = await readFile(path.join(output, "sitemap.xml"), "utf8");
const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) => match[1]);
const lastmods = [...sitemapXml.matchAll(/<lastmod>([^<]+)<\/lastmod>/gu)].map(
  (match) => match[1],
);
const expectedUrlCount = site.counts.regionalCanonicals + 7;
if (
  locs.length !== expectedUrlCount ||
  new Set(locs).size !== locs.length ||
  lastmods.length !== expectedUrlCount ||
  sitemapXml.includes("<priority>") ||
  sitemapXml.includes("<changefreq>")
) {
  throw new Error(
    `BABY_AUDIT_SITEMAP_CONTRACT:${site.key}:${locs.length}:${lastmods.length}:${expectedUrlCount}`,
  );
}
for (const value of lastmods) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed) || parsed > Date.parse("2026-08-19T23:59:59+09:00")) {
    throw new Error(`BABY_AUDIT_LASTMOD_INVALID:${site.key}:${value}`);
  }
}

function htmlPathFor(url) {
  const pathname = new URL(url).pathname;
  if (pathname === "/") return path.join(output, "index.html");
  return path.join(output, decodeURIComponent(pathname), "index.html");
}

let imageReferences = 0;
const checkedImageFiles = new Set();
for (const loc of locs) {
  const parsed = new URL(loc);
  if (parsed.origin !== origin || parsed.search || parsed.hash || !parsed.pathname.endsWith("/")) {
    throw new Error(`BABY_AUDIT_CANONICAL_URL_INVALID:${site.key}:${loc}`);
  }
  const htmlFile = htmlPathFor(loc);
  const html = await readFile(htmlFile, "utf8");
  const canonicalTag = html.match(/<link[^>]*rel="canonical"[^>]*>/u)?.[0];
  const canonical = canonicalTag?.match(/href="([^"]+)"/u)?.[1];
  if (canonical !== loc) {
    throw new Error(`BABY_AUDIT_CANONICAL_MISMATCH:${site.key}:${loc}:${canonical}`);
  }
  const robotsTag = html.match(/<meta[^>]*name="robots"[^>]*>/u)?.[0] ?? "";
  const robotsContent = robotsTag.match(/content="([^"]+)"/u)?.[1] ?? "";
  if (indexable ? !/index,\s*follow/u.test(robotsContent) : !/noindex,\s*nofollow/u.test(robotsContent)) {
    throw new Error(`BABY_AUDIT_ROBOTS_META:${site.key}:${loc}:${robotsContent}`);
  }
  if ((html.match(/<h1(?:\s|>)/gu) ?? []).length !== 1) {
    throw new Error(`BABY_AUDIT_H1_COUNT:${site.key}:${loc}`);
  }
  if (!/<title>[^<]+<\/title>/u.test(html) || !/<meta[^>]*name="description"/u.test(html)) {
    throw new Error(`BABY_AUDIT_META_MISSING:${site.key}:${loc}`);
  }
  imageReferences += await auditBabyImageUrls({
    urls: extractBabyImageUrls(html),
    siteKey: site.key,
    output,
    checkedFiles: checkedImageFiles,
  });
}
if (imageReferences === 0 || checkedImageFiles.size === 0) {
  throw new Error(`BABY_AUDIT_IMAGE_REFERENCE_ZERO:${site.key}`);
}

const robotsText = await readFile(path.join(output, "robots.txt"), "utf8");
if (indexable ? !robotsText.includes("Allow: /") : !robotsText.includes("Disallow: /")) {
  throw new Error(`BABY_AUDIT_ROBOTS_FILE:${site.key}`);
}
const rssXml = await readFile(path.join(output, "rss.xml"), "utf8");
if (
  (rssXml.match(/<item>/gu) ?? []).length !== 2 ||
  (rssXml.match(/<content:encoded>/gu) ?? []).length !== 2 ||
  !rssXml.includes("<language>ko-KR</language>")
) {
  throw new Error(`BABY_AUDIT_RSS:${site.key}`);
}

const imageRoot = path.join(output, "images", "baby-template11");
try {
  const entries = await readdir(imageRoot, { withFileTypes: true });
  if (
    entries.length !== 1 ||
    !entries[0].isDirectory() ||
    entries[0].isSymbolicLink() ||
    entries[0].name !== site.key
  ) {
    throw new Error(
      `BABY_AUDIT_IMAGE_SCOPE:${site.key}:${entries.map((entry) => entry.name).join(",")}`,
    );
  }
} catch (error) {
  if (error?.code === "ENOENT") {
    throw new Error(`BABY_AUDIT_IMAGE_ROOT_MISSING:${site.key}`);
  }
  throw error;
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      siteKey: site.key,
      indexable,
      origin,
      sitemapUrls: locs.length,
      lastmods: lastmods.length,
      rssItems: 2,
      imageReferences,
      imageFiles: checkedImageFiles.size,
    },
    null,
    2,
  ),
);
