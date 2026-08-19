import type { BabySiteKey } from "@/data/site-registry";
import { ACTIVE_SITE, getSiteConfig } from "@/data/site-registry";
import {
  getNodeByPathForSite,
  getRegionNodesForSite,
  type BabyRegionNode,
} from "@/lib/regions";

export type ResponsiveImageSources = Readonly<{
  desktop: string;
  tablet: string;
  mobile: string;
}>;

export type RegionImageSet = Readonly<{
  hero: ResponsiveImageSources;
  heroAlt: string;
  hero2: ResponsiveImageSources;
  hero2Alt: string;
  bodyA: ResponsiveImageSources;
  bodyAAlt: string;
  bodyB: ResponsiveImageSources;
  bodyBAlt: string;
  closing: ResponsiveImageSources;
  closingAlt: string;
}>;

export type RegionHeroAssignment = Readonly<{
  path: string;
  assetId: string;
  parentPath: string | null;
}>;

const SEVEN_ASSET_SITES = new Set<BabySiteKey>([
  "goyang",
  "seongnam",
  "suwon",
  "yongin",
]);

export function getSiteImageAssetIds(siteKey: BabySiteKey): readonly string[] {
  const count = SEVEN_ASSET_SITES.has(siteKey) ? 7 : 5;
  return Object.freeze(
    Array.from(
      { length: count },
      (_, index) => `gbt11-${siteKey}-${String(index + 1).padStart(2, "0")}`,
    ),
  );
}

export function getImageSources(
  siteKey: BabySiteKey,
  assetId: string,
): ResponsiveImageSources {
  const root = `/images/baby-template11/${siteKey}/${assetId}`;
  return Object.freeze({
    desktop: `${root}/desktop.webp`,
    tablet: `${root}/tablet.webp`,
    mobile: `${root}/mobile.webp`,
  });
}

const ASSIGNMENTS = new Map<BabySiteKey, readonly RegionHeroAssignment[]>();

function buildHeroAssignments(siteKey: BabySiteKey): readonly RegionHeroAssignment[] {
  const nodes = getRegionNodesForSite(siteKey);
  const assetIds = getSiteImageAssetIds(siteKey);
  const usage = new Map(assetIds.map((assetId) => [assetId, 0]));
  const byPath = new Map<string, RegionHeroAssignment>();
  const previousSiblingAsset = new Map<string, string>();
  const assignments: RegionHeroAssignment[] = [];

  for (const node of nodes) {
    const parentAsset = node.parentPath
      ? byPath.get(node.parentPath)?.assetId
      : undefined;
    const siblingGroup = node.parentPath ?? "__root__";
    const previousAsset = previousSiblingAsset.get(siblingGroup);
    const orderedCandidates = assetIds
      .map((assetId, index) => ({
        assetId,
        cyclicDistance:
          (index - (node.routeOrdinal % assetIds.length) + assetIds.length) %
          assetIds.length,
        usage: usage.get(assetId) ?? 0,
      }))
      .filter(
        ({ assetId }) => assetId !== parentAsset && assetId !== previousAsset,
      )
      .sort(
        (left, right) =>
          left.usage - right.usage ||
          left.cyclicDistance - right.cyclicDistance ||
          left.assetId.localeCompare(right.assetId),
      );
    const selected = orderedCandidates[0]?.assetId;
    if (!selected) throw new Error(`BABY_IMAGE_ASSIGNMENT_EXHAUSTED:${siteKey}:${node.path}`);
    usage.set(selected, (usage.get(selected) ?? 0) + 1);
    const assignment = Object.freeze({
      path: node.path,
      assetId: selected,
      parentPath: node.parentPath,
    });
    assignments.push(assignment);
    byPath.set(node.path, assignment);
    previousSiblingAsset.set(siblingGroup, selected);
  }

  const maxUsage = Math.max(...usage.values());
  if (maxUsage > 6) throw new Error(`BABY_IMAGE_USAGE_EXCEEDS_SIX:${siteKey}:${maxUsage}`);
  ASSIGNMENTS.set(siteKey, Object.freeze(assignments));
  return ASSIGNMENTS.get(siteKey) ?? [];
}

export function getHeroAssignmentsForSite(
  siteKey: BabySiteKey,
): readonly RegionHeroAssignment[] {
  return ASSIGNMENTS.get(siteKey) ?? buildHeroAssignments(siteKey);
}

function assetOffset(
  assetIds: readonly string[],
  heroAssetId: string,
  offset: number,
): string {
  const index = assetIds.indexOf(heroAssetId);
  if (index < 0) throw new Error(`UNKNOWN_BABY_IMAGE_ASSET:${heroAssetId}`);
  return assetIds[(index + offset) % assetIds.length];
}

export function getRegionImageSetForSite(
  siteKey: BabySiteKey,
  regionPath: string,
): RegionImageSet {
  const site = getSiteConfig(siteKey);
  const node: BabyRegionNode | null = getNodeByPathForSite(siteKey, regionPath);
  if (!node) throw new Error(`UNKNOWN_BABY_IMAGE_ROUTE:${siteKey}:${regionPath}`);
  const assignment = getHeroAssignmentsForSite(siteKey).find(
    (entry) => entry.path === node.path,
  );
  if (!assignment) throw new Error(`MISSING_BABY_IMAGE_ASSIGNMENT:${siteKey}:${node.path}`);
  const pool = getSiteImageAssetIds(siteKey);
  const hero2 = assetOffset(pool, assignment.assetId, 1);
  const bodyA = assetOffset(pool, assignment.assetId, 2);
  const bodyB = assetOffset(pool, assignment.assetId, 3);
  const closing = assetOffset(pool, assignment.assetId, 4);
  const context = node.kind === "home" ? site.searchName : node.qualifiedName;
  return Object.freeze({
    hero: getImageSources(siteKey, assignment.assetId),
    heroAlt: `${context} 출장마사지 지역 안내 이미지`,
    hero2: getImageSources(siteKey, hero2),
    hero2Alt: `${site.brandName} 예약 준비 안내 이미지`,
    bodyA: getImageSources(siteKey, bodyA),
    bodyAAlt: `${context} 이용 순서 안내 이미지`,
    bodyB: getImageSources(siteKey, bodyB),
    bodyBAlt: `${site.brandName} 코스 확인 안내 이미지`,
    closing: getImageSources(siteKey, closing),
    closingAlt: `${site.searchName} 전화상담 안내 이미지`,
  });
}

export function getRegionImageSet(regionPath: string): RegionImageSet {
  return getRegionImageSetForSite(ACTIVE_SITE.key, regionPath);
}
