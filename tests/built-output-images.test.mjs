import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  auditBabyImageUrls,
  extractBabyImageUrls,
} from "../scripts/lib/built-output-images.mjs";
import { computeDirectoryDigest } from "../scripts/lib/cloudflare-pages-contract.mjs";

const temporaryRoots = [];

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "baby-image-audit-"));
  temporaryRoots.push(root);
  const imageDirectory = path.join(
    root,
    "images",
    "baby-template11",
    "suwon",
    "gbt11-suwon-01",
  );
  await mkdir(imageDirectory, { recursive: true });
  for (const name of ["mobile.webp", "tablet.webp", "desktop.webp"]) {
    await writeFile(path.join(imageDirectory, name), `fixture-${name}`);
  }
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("built output baby image contract", () => {
  it("extracts src and every srcset candidate, then verifies all files", async () => {
    const root = await fixture();
    const html = `
      <picture>
        <source srcset="/images/baby-template11/suwon/gbt11-suwon-01/mobile.webp 480w,
          /images/baby-template11/suwon/gbt11-suwon-01/tablet.webp 768w">
        <img src="/images/baby-template11/suwon/gbt11-suwon-01/desktop.webp">
      </picture>`;
    const urls = extractBabyImageUrls(html);
    expect(urls).toHaveLength(3);
    await expect(
      auditBabyImageUrls({ urls, siteKey: "suwon", output: root }),
    ).resolves.toBe(3);
  });

  it("rejects a missing later srcset candidate instead of checking only the first", async () => {
    const root = await fixture();
    const urls = extractBabyImageUrls(
      '<source srcset="/images/baby-template11/suwon/gbt11-suwon-01/mobile.webp 480w, /images/baby-template11/suwon/gbt11-suwon-01/missing.webp 768w">',
    );
    await expect(
      auditBabyImageUrls({ urls, siteKey: "suwon", output: root }),
    ).rejects.toThrow("BABY_AUDIT_IMAGE_FILE_MISSING");
  });

  it("rejects cross-site image leakage even when the file exists", async () => {
    const root = await fixture();
    const foreign = path.join(
      root,
      "images",
      "baby-template11",
      "goyang",
      "gbt11-goyang-01",
    );
    await mkdir(foreign, { recursive: true });
    await writeFile(path.join(foreign, "desktop.webp"), "foreign");
    await expect(
      auditBabyImageUrls({
        urls: ["/images/baby-template11/goyang/gbt11-goyang-01/desktop.webp"],
        siteKey: "suwon",
        output: root,
      }),
    ).rejects.toThrow("BABY_AUDIT_CROSS_SITE_IMAGE");
  });

  it("binds ordinary artifact bytes while excluding the build receipt itself", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "baby-artifact-digest-"));
    temporaryRoots.push(root);
    await writeFile(path.join(root, "index.html"), "first");
    await writeFile(path.join(root, ".baby-build.json"), "receipt-one");
    const first = await computeDirectoryDigest(root);

    await writeFile(path.join(root, ".baby-build.json"), "receipt-two");
    expect(await computeDirectoryDigest(root)).toEqual(first);

    await writeFile(path.join(root, "index.html"), "second");
    expect((await computeDirectoryDigest(root)).digest).not.toBe(first.digest);
  });
});
