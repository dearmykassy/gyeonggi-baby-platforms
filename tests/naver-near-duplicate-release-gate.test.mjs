import { describe, expect, it } from "vitest";

import { runNaverNearDuplicateAudit } from "../scripts/audit-naver-near-duplicates.mjs";

describe("NAVER near-duplicate release gate", () => {
  it(
    "passes the complete 27-site, 455-region rendered corpus",
    async () => {
      const report = await runNaverNearDuplicateAudit({
        includeCopyAudit: true,
      });

      expect(report.note).toContain("internal release heuristic");
      expect(report.note).toContain("not a published NAVER ranking threshold");
      expect(report.status, JSON.stringify(report.failures)).toBe("PASS");
      expect(report.counts).toMatchObject({
        regionalDocuments: 455,
        renderedDocuments: 455,
        indexEligibleRegionalDocuments: 27,
        ineligibleRegionalDocuments: 428,
        leafDocuments: 404,
        fixedDocuments: 81,
        stagedDocuments: 189,
        eligibleRegionalInventorySha256:
          "8eda7605fb2c3e5253d4149025a6b20870bcd2429832c17502e0778c4e889f5e",
      });
      expect(report.collisions).toMatchObject({
        exactDocument: 0,
        exactTitle: 0,
        exactDescription: 0,
        exactH1: 0,
      });
      expect(report.primaryContentSimilarity.crossSite.p95).toBeLessThan(0.45);
      expect(report.primaryContentSimilarity.crossSite.maximum).toBeLessThan(0.55);
      expect(report.primaryContentSimilarity.withinSite.p95).toBeLessThan(0.45);
      expect(report.primaryContentSimilarity.withinSite.maximum).toBeLessThan(0.55);
      expect(
        report.primaryNarrativeRepeatedBlockCharacterShare.exact.maximum,
      ).toBeLessThanOrEqual(0.25);
      expect(
        report.primaryNarrativeRepeatedBlockCharacterShare.normalized.maximum,
      ).toBeLessThanOrEqual(0.35);
      expect(report.leafFailures).toEqual([]);
      expect(report.regionalSharedDetailFailures).toEqual([]);
      expect(report.structuralFailures).toEqual([]);
      expect(report.headingCounts.regionalContentH2HardGate.minimum).toBeGreaterThanOrEqual(10);
      expect(report.headingCounts.regionalContentH2HardGate.maximum).toBeLessThanOrEqual(12);
      expect(report.headingCounts.renderedHeadingQualityFailures).toEqual([]);
      expect(report.antiFillerFailureCount).toBe(0);
      expect(report.technicalFillerFailureCount).toBe(0);
      expect(report.indexEligibilityFailures).toEqual([]);
      expect(report.indexableInventoryFailures).toEqual([]);
      expect(report.homeFactProvenanceFailures).toEqual([]);
      expect(report.counts.cityHomeFactProvenanceSha256).toMatch(
        /^[a-f0-9]{64}$/u,
      );
      expect(report.eligibilitySelectionFailures).toEqual([]);
      expect(report.routeDiscoveryFailures).toEqual([]);
      expect(report.counts.desiredRegionalSitemapDocuments).toBe(
        report.counts.indexEligibleRegionalDocuments,
      );
      expect(report.counts.eligibleRegionalInventorySha256).toMatch(
        /^[a-f0-9]{64}$/u,
      );
      expect(report.factDerivedCopySelection.source.status).toBe("PASS");
      expect(report.factDerivedCopySelection.factProfileFailureCount).toBe(0);
      expect(report.fixedPages.status).toBe("PASS");
      expect(report.stagedRoutes.status).toBe("PASS");
      expect(report.stagedRoutes.counts).toMatchObject({ documents: 189 });
      expect(report.stagedIndexingSource.status).toBe("PASS");
      expect(report.copyAudit.status).toBe("PASS");
      expect(report.copyAudit.authoritativeRepositoryCount).toBe(8);
      expect(report.copyAudit).toMatchObject({
        exactMetaTitleCollisions: 0,
        exactDescriptionCollisions: 0,
        exactH1Collisions: 0,
        exactSignatureCollisions: 0,
      });
      expect(Object.keys(report.copyAudit.externalCollisionCounts)).toHaveLength(8);
    },
    120_000,
  );
});
