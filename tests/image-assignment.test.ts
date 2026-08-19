import { describe, expect, it } from "vitest";

import { BABY_SITE_KEYS } from "@/data/site-registry";
import {
  getHeroAssignmentsForSite,
  getRegionImageSetForSite,
  getSiteImageAssetIds,
} from "@/lib/images";
import { getRegionNodesForSite } from "@/lib/regions";

describe("baby image assignment", () => {
  it("assigns every regional canonical with a maximum of six hero uses", () => {
    let routes = 0;
    for (const siteKey of BABY_SITE_KEYS) {
      const nodes = getRegionNodesForSite(siteKey);
      const assignments = getHeroAssignmentsForSite(siteKey);
      expect(assignments).toHaveLength(nodes.length);
      expect(new Set(assignments.map((entry) => entry.path)).size).toBe(nodes.length);
      const usage = new Map<string, number>();
      for (const assignment of assignments) {
        usage.set(assignment.assetId, (usage.get(assignment.assetId) ?? 0) + 1);
      }
      expect(Math.max(...usage.values())).toBeLessThanOrEqual(6);
      expect([...usage.keys()].every((assetId) => getSiteImageAssetIds(siteKey).includes(assetId))).toBe(true);
      routes += assignments.length;
    }
    expect(routes).toBe(455);
  });

  it("never gives a parent and child or adjacent siblings the same hero", () => {
    for (const siteKey of BABY_SITE_KEYS) {
      const assignments = getHeroAssignmentsForSite(siteKey);
      const byPath = new Map(assignments.map((entry) => [entry.path, entry]));
      const lastByParent = new Map<string, string>();
      for (const assignment of assignments) {
        if (assignment.parentPath) {
          expect(assignment.assetId).not.toBe(byPath.get(assignment.parentPath)?.assetId);
        }
        const siblingGroup = assignment.parentPath ?? "__root__";
        expect(assignment.assetId).not.toBe(lastByParent.get(siblingGroup));
        lastByParent.set(siblingGroup, assignment.assetId);
      }
    }
  });

  it("provides five distinct Template11 slots for every route", () => {
    for (const siteKey of BABY_SITE_KEYS) {
      for (const node of getRegionNodesForSite(siteKey)) {
        const images = getRegionImageSetForSite(siteKey, node.path);
        const desktop = [images.hero, images.hero2, images.bodyA, images.bodyB, images.closing].map((entry) => entry.desktop);
        expect(new Set(desktop).size).toBe(5);
        expect(desktop.every((value) => value.startsWith(`/images/baby-template11/${siteKey}/`))).toBe(true);
      }
    }
  });
});
