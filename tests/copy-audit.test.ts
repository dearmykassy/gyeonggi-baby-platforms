import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

type CopyAuditReport = {
  status: "PASS" | "FAIL";
  authoritativeRepositoryCount: number;
  authoritativeRepositories: string[];
  targetSiteCount: number;
  targetRegionalRouteCount: number;
  targetBlogPostCount: number;
  exactMetaTitleCollisions: number;
  exactDescriptionCollisions: number;
  exactH1Collisions: number;
  exactSignatureCollisions: number;
  normalizedMetaTitleCollisions: number;
  normalizedDescriptionCollisions: number;
  normalizedH1Collisions: number;
  normalizedParagraphCollisions: number;
  normalizedSignatureCollisions: number;
  normalizedParagraphCollisionEnforcement: string;
  normalizedInternalCollisionEnforcement: string;
  officialSuffixLeakCount: number;
  comparisons: Record<
    string,
    {
      absolutePath: string;
      sourceFileCount: number;
      runtimeRouteCount: number;
      substantiveExactCollisions: { count: number };
      brandRegionNormalizedCollisions: { count: number };
    }
  >;
};

describe("portfolio copy audit", () => {
  it(
    "hard-fails missing authorities, target exact collisions, and external portfolio collisions",
    () => {
      const root = path.resolve(import.meta.dirname, "..");
      const output = execFileSync(
        process.execPath,
        [
          "--import",
          "tsx",
          path.join(root, "scripts/audit-copy-duplication.mjs"),
        ],
        {
          cwd: root,
          encoding: "utf8",
          maxBuffer: 256 * 1024 * 1024,
          timeout: 180_000,
        },
      );
      const report = JSON.parse(output) as CopyAuditReport;
      expect(report.status).toBe("PASS");
      expect(report.authoritativeRepositoryCount).toBe(8);
      expect(report.authoritativeRepositories).toHaveLength(8);
      expect(report.targetSiteCount).toBe(27);
      expect(report.targetRegionalRouteCount).toBe(455);
      expect(report.targetBlogPostCount).toBe(54);
      expect(report.exactMetaTitleCollisions).toBe(0);
      expect(report.exactDescriptionCollisions).toBe(0);
      expect(report.exactH1Collisions).toBe(0);
      expect(report.exactSignatureCollisions).toBe(0);
      expect(report.normalizedMetaTitleCollisions).toBeGreaterThanOrEqual(0);
      expect(report.normalizedDescriptionCollisions).toBeGreaterThanOrEqual(0);
      expect(report.normalizedH1Collisions).toBeGreaterThanOrEqual(0);
      expect(report.normalizedParagraphCollisions).toBeGreaterThanOrEqual(0);
      expect(report.normalizedSignatureCollisions).toBeGreaterThanOrEqual(0);
      expect(report.normalizedParagraphCollisionEnforcement).toBe(
        "DIAGNOSTIC_REPLACED_BY_NEAR_DUPLICATE_REPEATED_SHARE_GATE",
      );
      expect(report.normalizedInternalCollisionEnforcement).toBe(
        "DIAGNOSTIC_EXACT_AND_ELIGIBLE_RENDERED_GATES_ARE_AUTHORITATIVE",
      );
      expect(report.officialSuffixLeakCount).toBe(0);
      for (const comparison of Object.values(report.comparisons)) {
        expect(path.isAbsolute(comparison.absolutePath)).toBe(true);
        expect(comparison.sourceFileCount).toBeGreaterThan(0);
        expect(comparison.runtimeRouteCount).toBeGreaterThan(0);
        expect(comparison.substantiveExactCollisions.count).toBe(0);
        expect(comparison.brandRegionNormalizedCollisions.count).toBe(0);
      }
    },
    190_000,
  );
});
