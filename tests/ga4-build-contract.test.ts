import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ALL_BABY_SITES } from "../src/data/site-registry";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("independent GA4 build contract", () => {
  it("declares exactly one blank measurement-ID environment variable per site", async () => {
    const example = await readFile(path.join(ROOT, ".env.example"), "utf8");
    const declared = [...example.matchAll(/^(NEXT_PUBLIC_GA_MEASUREMENT_ID_[A-Z0-9_]+)=$/gmu)]
      .map((match) => match[1])
      .sort();
    const expected = ALL_BABY_SITES.map((site) => site.gaMeasurementIdEnv).sort();

    expect(declared).toEqual(expected);
    expect(example).not.toMatch(/^NEXT_PUBLIC_GA_MEASUREMENT_ID=$/mu);
    expect(example).not.toMatch(/=G-[A-Z0-9]+$/mu);
  });

  it("maps only the active site's stream into the static client environment", async () => {
    const buildScript = await readFile(
      path.join(ROOT, "scripts/build-site.mjs"),
      "utf8",
    );

    expect(buildScript).toContain("process.env[site.gaMeasurementIdEnv]");
    expect(buildScript).toContain("BABY_PUBLIC_GA4_MEASUREMENT_ID_REQUIRED");
    expect(buildScript).toContain("NEXT_PUBLIC_GA_MEASUREMENT_ID: gaMeasurementId");
  });

  it("keeps manual page views, privacy flags, and PII-free CTA events", async () => {
    const analytics = await readFile(
      path.join(ROOT, "src/components/analytics.tsx"),
      "utf8",
    );

    expect(analytics).toContain("send_page_view:false");
    expect(analytics).toContain("allow_google_signals:false");
    expect(analytics).toContain("allow_ad_personalization_signals:false");
    expect(analytics).toContain('sendEvent("event", "page_view"');
    expect(analytics).toContain('sendEvent("event", "phone_cta_clicked"');
    expect(analytics).not.toContain("target.href");
    expect(analytics).not.toContain("window.location.search");
  });
});
