import { lstat } from "node:fs/promises";
import path from "node:path";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function decodeAttribute(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

export function extractBabyImageUrls(html) {
  const urls = [];
  const attributePattern = /(?:^|[\s<])(src|srcset)\s*=\s*(["'])(.*?)\2/gisu;
  for (const match of html.matchAll(attributePattern)) {
    const attribute = match[1].toLowerCase();
    const value = decodeAttribute(match[3]);
    const candidates =
      attribute === "srcset"
        ? value
            .split(",")
            .map((candidate) => candidate.trim().split(/\s+/u)[0])
            .filter(Boolean)
        : [value.trim()];
    for (const candidate of candidates) {
      if (candidate.includes("/images/baby-template11/")) urls.push(candidate);
    }
  }
  return urls;
}

export async function auditBabyImageUrls({
  urls,
  siteKey,
  output,
  checkedFiles = new Set(),
}) {
  let references = 0;
  for (const rawUrl of urls) {
    if (!rawUrl.startsWith("/")) {
      fail("BABY_AUDIT_IMAGE_URL_NOT_ROOT_RELATIVE", `${siteKey}:${rawUrl}`);
    }
    let parsed;
    try {
      parsed = new URL(rawUrl, "https://baby-build.invalid");
    } catch {
      fail("BABY_AUDIT_IMAGE_URL_INVALID", `${siteKey}:${rawUrl}`);
    }
    if (parsed.origin !== "https://baby-build.invalid" || parsed.search || parsed.hash) {
      fail("BABY_AUDIT_IMAGE_URL_INVALID", `${siteKey}:${rawUrl}`);
    }
    let pathname;
    try {
      pathname = decodeURIComponent(parsed.pathname);
    } catch {
      fail("BABY_AUDIT_IMAGE_URL_INVALID", `${siteKey}:${rawUrl}`);
    }
    const expectedPrefix = `/images/baby-template11/${siteKey}/`;
    if (!pathname.startsWith(expectedPrefix)) {
      fail("BABY_AUDIT_CROSS_SITE_IMAGE", `${siteKey}:${pathname}`);
    }

    const file = path.resolve(output, `.${pathname}`);
    if (file === output || !file.startsWith(`${output}${path.sep}`)) {
      fail("BABY_AUDIT_IMAGE_PATH_ESCAPE", `${siteKey}:${pathname}`);
    }
    references += 1;
    if (checkedFiles.has(file)) continue;

    const fileStat = await lstat(file).catch((error) => {
      if (error?.code === "ENOENT") {
        fail("BABY_AUDIT_IMAGE_FILE_MISSING", `${siteKey}:${pathname}`);
      }
      throw error;
    });
    if (!fileStat.isFile() || fileStat.isSymbolicLink() || fileStat.size <= 0) {
      fail("BABY_AUDIT_IMAGE_FILE_INVALID", `${siteKey}:${pathname}`);
    }
    checkedFiles.add(file);
  }
  return references;
}
