import { describe, expect, it } from "vitest";

import { ALL_BABY_SITES, type BabySiteConfig } from "@/data/site-registry";
import {
  getPreviewOrigin,
  getSitePublicationContract,
} from "@/lib/metadata";

const baseSite = ALL_BABY_SITES[0];

if (!baseSite) throw new Error("BABY_PUBLICATION_TEST_SITE_MISSING");

function withPublication(
  patch: Partial<BabySiteConfig>,
): BabySiteConfig {
  return {
    ...baseSite,
    ...patch,
  };
}

describe("runtime publication contract", () => {
  it("accepts only the exact four-part public tuple across every mixed combination", () => {
    const deploymentStates = ["planned", "preview", "public"] as const;
    const booleans = [false, true] as const;
    const origins = [null, "https://published.example"] as const;
    let combinations = 0;
    let accepted = 0;

    for (const deploymentState of deploymentStates) {
      for (const isPublic of booleans) {
        for (const indexingEnabled of booleans) {
          for (const publicOrigin of origins) {
            combinations += 1;
            const expectedIndexable =
              deploymentState === "public" &&
              isPublic &&
              indexingEnabled &&
              publicOrigin !== null;
            const site = withPublication({
              deploymentState,
              isPublic,
              indexingEnabled,
              publicOrigin,
              // A valid-looking legacy origin must never substitute for the
              // explicit publicOrigin claim.
              origin: "https://origin-field-must-be-ignored.example",
            });
            const publication = getSitePublicationContract(site);

            expect(publication.indexable).toBe(expectedIndexable);
            expect(publication.public).toBe(expectedIndexable);

            if (expectedIndexable) {
              accepted += 1;
              expect(publication.origin).toBe(publicOrigin);
              expect(publication.claimedOrigin).toBe(publicOrigin);
              expect(publication.robots).toEqual({ index: true, follow: true });
              expect(publication.blockers).toEqual([]);
            } else {
              const previewOrigin = getPreviewOrigin(site);
              expect(publication.origin).toBe(previewOrigin);
              expect(publication.origin).toMatch(/\.invalid$/u);
              expect(publication.robots).toEqual({
                index: false,
                follow: false,
                nocache: true,
              });
              expect(publication.sitemapUrl).toBe(`${previewOrigin}/sitemap.xml`);
              expect(publication.rssUrl).toBe(`${previewOrigin}/rss.xml`);
              if (deploymentState !== "public") {
                expect(publication.blockers).toContain("DEPLOYMENT_STATE_NOT_PUBLIC");
              }
              if (!isPublic) {
                expect(publication.blockers).toContain("SITE_NOT_PUBLIC");
              }
              if (!indexingEnabled) {
                expect(publication.blockers).toContain("INDEXING_NOT_ENABLED");
              }
              if (publicOrigin === null) {
                expect(publication.blockers).toContain(
                  "HTTPS_PUBLIC_ORIGIN_NOT_CLAIMED",
                );
              }
            }
          }
        }
      }
    }

    expect(combinations).toBe(24);
    expect(accepted).toBe(1);
  });

  it.each([
    "http://published.example",
    "https://published.example/",
    "https://published.example/path",
    "https://published.example?query=yes",
    "https://published.example#fragment",
    "https://user:pass@published.example",
    "https://published.preview.invalid",
    "not-an-origin",
  ])("rejects a non-exact publicOrigin and ignores site.origin: %s", (publicOrigin) => {
    const site = withPublication({
      deploymentState: "public",
      isPublic: true,
      indexingEnabled: true,
      publicOrigin,
      origin: "https://origin-field-must-be-ignored.example",
    });
    const publication = getSitePublicationContract(site);

    expect(publication.indexable).toBe(false);
    expect(publication.public).toBe(false);
    expect(publication.origin).toBe(getPreviewOrigin(site));
    expect(publication.claimedOrigin).toBeNull();
    expect(publication.blockers).toEqual([
      "HTTPS_PUBLIC_ORIGIN_NOT_CLAIMED",
    ]);
    expect(publication.robots).toEqual({
      index: false,
      follow: false,
      nocache: true,
    });
  });
});
