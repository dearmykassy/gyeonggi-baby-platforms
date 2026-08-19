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
  normalizedMetaTitleCollisions: number;
  normalizedDescriptionCollisions: number;
  normalizedH1Collisions: number;
  normalizedParagraphCollisions: number;
  normalizedSignatureCollisions: number;
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
    "hard-fails missing authorities and any exact or normalized collision",
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
      expect(report.normalizedMetaTitleCollisions).toBe(0);
      expect(report.normalizedDescriptionCollisions).toBe(0);
      expect(report.normalizedH1Collisions).toBe(0);
      expect(report.normalizedParagraphCollisions).toBe(0);
      expect(report.normalizedSignatureCollisions).toBe(0);
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
