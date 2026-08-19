import cityInventoryJson from "../data/city-regions.generated.json";
import {
  ACTIVE_SITE,
  type BabySiteConfig,
  type BabySiteKey,
  getSiteConfig,
} from "../data/site-registry";

export type LegalArea = Readonly<{ code: string; name: string }>;

export type BabyRegionRecord = Readonly<{
  id: string;
  sidoKey: "gyeonggi";
  sidoName: "경기도";
  municipality: string;
  district: string | null;
  officialSigungu: string;
  name: string;
  groupType: string;
  reviewStatus: string;
  legalIdentityMode: string;
  sourceNames: readonly string[];
  sourceCodes: readonly string[];
  legalAreas: readonly LegalArea[];
  /** Segments rebased to the active city's /areas/ root. */
  pathSegments: readonly string[];
  /** Canonical route on the individual baby platform. */
  path: string;
  /** Original committed MassageBom graph identity. */
  sourcePathSegments: readonly string[];
  /** Original committed MassageBom graph route. */
  sourcePath: string;
}>;

export type BabyRegionNodeKind = "home" | "district" | "representative";

export type BabyRegionNode = Readonly<{
  siteKey: BabySiteKey;
  kind: BabyRegionNodeKind;
  name: string;
  displayName: string;
  officialName: string;
  qualifiedName: string;
  municipalityOfficialName: string;
  searchRootName: string;
  segments: readonly string[];
  path: string;
  canonicalUrl: string;
  parentPath: string | null;
  routeOrdinal: number;
  representativeCount: number;
  sourceUnitCount: number;
  sourceAliases: readonly string[];
  records: readonly BabyRegionRecord[];
  representative?: BabyRegionRecord;
}>;

export type RegionBreadcrumb = Readonly<{
  name: string;
  displayName: string;
  officialName: string;
  path: string;
}>;

export type BabyRegionSearchResult = Readonly<{
  node: BabyRegionNode;
  matchedName: string;
  isAliasMatch: boolean;
  context: string;
  path: string;
}>;

type InventoryCounts = Readonly<{
  targetSites: number;
  homes: number;
  districtHubs: number;
  representativeLeaves: number;
  regionalCanonicals: number;
}>;

type InventorySite = Readonly<{
  key: BabySiteKey;
  officialName: string;
  searchName: string;
  sourcePathPrefix: readonly ["gyeonggi", string];
  districtNames: readonly string[];
  counts: Readonly<{
    home: 1;
    districtHubs: number;
    representativeLeaves: number;
    regionalCanonicals: number;
  }>;
  regions: readonly BabyRegionRecord[];
}>;

type CityInventory = Readonly<{
  schemaVersion: number;
  status: string;
  effectiveDate: string;
  sourceArtifactDigest: string;
  sourceRawSha256: string;
  sourceFileSha256: string;
  inventoryDigest: string;
  excludedMunicipalities: readonly string[];
  counts: InventoryCounts;
  sites: readonly InventorySite[];
}>;

const EXPECTED_SOURCE_FILE_SHA256 =
  "0242e5d86894321cba66b7f747675115520d856c7aaada870869e19f247500d2";
const EXPECTED_INVENTORY_DIGEST =
  "sha256:549bea2fa9653359110a811fba678e5ac7bd700d287a0b78b3abd3a1f6dc82cd";

const inventory = cityInventoryJson as unknown as CityInventory;

if (
  inventory.schemaVersion !== 1 ||
  inventory.status !== "COMMITTED" ||
  inventory.effectiveDate !== "2026-07-20" ||
  inventory.sourceFileSha256 !== EXPECTED_SOURCE_FILE_SHA256 ||
  inventory.inventoryDigest !== EXPECTED_INVENTORY_DIGEST ||
  inventory.counts.targetSites !== 27 ||
  inventory.counts.homes !== 27 ||
  inventory.counts.districtHubs !== 24 ||
  inventory.counts.representativeLeaves !== 404 ||
  inventory.counts.regionalCanonicals !== 455
) {
  throw new Error("BABY_REGION_INVENTORY_INTEGRITY_FAILURE");
}

export const BABY_REGION_EFFECTIVE_DATE = inventory.effectiveDate;
export const BABY_REGION_SOURCE_ARTIFACT_DIGEST =
  inventory.sourceArtifactDigest;
export const BABY_REGION_SOURCE_RAW_SHA256 = inventory.sourceRawSha256;
export const BABY_REGION_SOURCE_FILE_SHA256 = inventory.sourceFileSha256;
export const BABY_REGION_INVENTORY_DIGEST = inventory.inventoryDigest;
export const BABY_REGION_INVENTORY_COUNTS = inventory.counts;
export const EXCLUDED_BABY_MUNICIPALITIES =
  inventory.excludedMunicipalities;

const INVENTORY_SITE_BY_KEY = new Map<BabySiteKey, InventorySite>(
  inventory.sites.map((site) => [site.key, site]),
);

function canonicalizeSegments(segments: readonly string[]): string[] {
  return segments.map((value) => {
    try {
      return decodeURIComponent(value).normalize("NFC");
    } catch {
      return value.normalize("NFC");
    }
  });
}

function segmentsKey(segments: readonly string[]): string {
  return JSON.stringify(canonicalizeSegments(segments));
}

function compareSegments(
  left: readonly string[],
  right: readonly string[],
): number {
  return left.join("/").localeCompare(right.join("/"), "ko");
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

export function regionPath(segments: readonly string[]): string {
  const normalized = canonicalizeSegments(segments);
  if (normalized.length === 0) return "/";
  return `/areas/${normalized
    .map((segment) => encodeURIComponent(segment))
    .join("/")}/`;
}

function getInventorySite(siteOrKey: BabySiteConfig | BabySiteKey): InventorySite {
  const key = typeof siteOrKey === "string" ? siteOrKey : siteOrKey.key;
  const site = INVENTORY_SITE_BY_KEY.get(key);
  if (!site) throw new Error(`MISSING_BABY_REGION_SITE:${key}`);
  return site;
}

function makeNode(
  site: BabySiteConfig,
  kind: BabyRegionNodeKind,
  segments: readonly string[],
  records: readonly BabyRegionRecord[],
  routeOrdinal: number,
  representative?: BabyRegionRecord,
): BabyRegionNode {
  const canonicalSegments = Object.freeze(canonicalizeSegments(segments));
  const path = regionPath(canonicalSegments);
  const officialName =
    kind === "home"
      ? site.officialName
      : canonicalSegments.at(-1) ?? site.officialName;
  const displayName = kind === "home" ? site.searchName : officialName;
  const parentSegments = canonicalSegments.slice(0, -1);
  const parentPath = kind === "home" ? null : regionPath(parentSegments);
  const sourceAliases =
    kind === "home"
      ? uniqueStrings([site.searchName, site.officialName])
      : kind === "representative" && representative
        ? uniqueStrings([representative.name, ...representative.sourceNames])
        : uniqueStrings([officialName]);

  return Object.freeze({
    siteKey: site.key,
    kind,
    name: displayName,
    displayName,
    officialName,
    qualifiedName:
      kind === "home"
        ? site.searchName
        : [site.searchName, ...canonicalSegments].join(" "),
    municipalityOfficialName: site.officialName,
    searchRootName: site.searchName,
    segments: canonicalSegments,
    path,
    canonicalUrl: `${site.origin}${path}`,
    parentPath,
    routeOrdinal,
    representativeCount: records.length,
    sourceUnitCount: records.reduce(
      (total, record) => total + record.sourceNames.length,
      0,
    ),
    sourceAliases,
    records: Object.freeze([...records]),
    ...(representative ? { representative } : {}),
  });
}

const NODES_BY_SITE = new Map<BabySiteKey, readonly BabyRegionNode[]>();
const NODE_MAP_BY_SITE = new Map<
  BabySiteKey,
  ReadonlyMap<string, BabyRegionNode>
>();

function buildRegionNodes(site: BabySiteConfig): readonly BabyRegionNode[] {
  const inventorySite = getInventorySite(site);
  const regions = [...inventorySite.regions].sort((left, right) =>
    compareSegments(left.pathSegments, right.pathSegments),
  );
  const districtNames = [...inventorySite.districtNames].sort((left, right) =>
    left.localeCompare(right, "ko"),
  );
  const draft: Array<{
    kind: BabyRegionNodeKind;
    segments: readonly string[];
    records: readonly BabyRegionRecord[];
    representative?: BabyRegionRecord;
  }> = [
    {
      kind: "home",
      segments: [],
      records: regions,
    },
    ...districtNames.map((district) => ({
      kind: "district" as const,
      segments: [district],
      records: regions.filter((record) => record.district === district),
    })),
    ...regions.map((record) => ({
      kind: "representative" as const,
      segments: record.pathSegments,
      records: [record],
      representative: record,
    })),
  ];

  const nodes = Object.freeze(
    draft.map((entry, routeOrdinal) =>
      makeNode(
        site,
        entry.kind,
        entry.segments,
        entry.records,
        routeOrdinal,
        entry.representative,
      ),
    ),
  );

  if (nodes.length !== inventorySite.counts.regionalCanonicals) {
    throw new Error(`BABY_REGION_NODE_COUNT_FAILURE:${site.key}`);
  }

  const nodeMap = new Map(nodes.map((node) => [segmentsKey(node.segments), node]));
  if (nodeMap.size !== nodes.length) {
    throw new Error(`BABY_REGION_ROUTE_COLLISION:${site.key}`);
  }

  NODES_BY_SITE.set(site.key, nodes);
  NODE_MAP_BY_SITE.set(site.key, nodeMap);
  return nodes;
}

export function getRegionNodesForSite(
  siteOrKey: BabySiteConfig | BabySiteKey,
): readonly BabyRegionNode[] {
  const site =
    typeof siteOrKey === "string" ? getSiteConfig(siteOrKey) : siteOrKey;
  return NODES_BY_SITE.get(site.key) ?? buildRegionNodes(site);
}

function getNodeMapForSite(
  siteOrKey: BabySiteConfig | BabySiteKey,
): ReadonlyMap<string, BabyRegionNode> {
  const site =
    typeof siteOrKey === "string" ? getSiteConfig(siteOrKey) : siteOrKey;
  getRegionNodesForSite(site);
  const nodeMap = NODE_MAP_BY_SITE.get(site.key);
  if (!nodeMap) throw new Error(`BABY_REGION_MAP_FAILURE:${site.key}`);
  return nodeMap;
}

export function getNodeBySegmentsForSite(
  siteOrKey: BabySiteConfig | BabySiteKey,
  inputSegments: readonly string[],
): BabyRegionNode | null {
  return (
    getNodeMapForSite(siteOrKey).get(segmentsKey(inputSegments)) ?? null
  );
}

export function getNodeByPathForSite(
  siteOrKey: BabySiteConfig | BabySiteKey,
  path: string,
): BabyRegionNode | null {
  const normalizedPath = path === "/" ? path : `${path.replace(/\/+$/, "")}/`;
  return (
    getRegionNodesForSite(siteOrKey).find(
      (node) => node.path === normalizedPath,
    ) ?? null
  );
}

type NodeOrSegments = BabyRegionNode | readonly string[];

function inputSegments(input: NodeOrSegments): readonly string[] {
  return Array.isArray(input)
    ? input
    : (input as BabyRegionNode).segments;
}

export function getRegionChildrenForSite(
  siteOrKey: BabySiteConfig | BabySiteKey,
  input: NodeOrSegments,
): readonly BabyRegionNode[] {
  const parent = getNodeBySegmentsForSite(siteOrKey, inputSegments(input));
  if (!parent || parent.kind === "representative") return [];
  return getRegionNodesForSite(siteOrKey).filter(
    (node) => node.parentPath === parent.path,
  );
}

export function getRegionParentForSite(
  siteOrKey: BabySiteConfig | BabySiteKey,
  input: NodeOrSegments,
): BabyRegionNode | null {
  const node = getNodeBySegmentsForSite(siteOrKey, inputSegments(input));
  if (!node?.parentPath) return null;
  return getNodeByPathForSite(siteOrKey, node.parentPath);
}

export function getRegionBreadcrumbsForSite(
  siteOrKey: BabySiteConfig | BabySiteKey,
  input: NodeOrSegments,
): readonly RegionBreadcrumb[] {
  const site =
    typeof siteOrKey === "string" ? getSiteConfig(siteOrKey) : siteOrKey;
  const node = getNodeBySegmentsForSite(site, inputSegments(input));
  if (!node) return [];

  const crumbs: RegionBreadcrumb[] = [
    {
      name: site.searchName,
      displayName: site.searchName,
      officialName: site.officialName,
      path: "/",
    },
  ];

  if (node.kind === "home") return Object.freeze(crumbs);

  crumbs.push({
    name: "지역 안내",
    displayName: "지역 안내",
    officialName: "지역 안내",
    path: "/areas/",
  });

  for (let length = 1; length <= node.segments.length; length += 1) {
    const ancestor = getNodeBySegmentsForSite(
      site,
      node.segments.slice(0, length),
    );
    if (ancestor) {
      crumbs.push({
        name: ancestor.displayName,
        displayName: ancestor.displayName,
        officialName: ancestor.officialName,
        path: ancestor.path,
      });
    }
  }

  return Object.freeze(crumbs);
}

export function getRegionStaticParamsForSite(
  siteOrKey: BabySiteConfig | BabySiteKey,
): Array<{ segments: string[] }> {
  return getRegionNodesForSite(siteOrKey)
    .filter((node) => node.kind !== "home")
    .map((node) => ({ segments: [...node.segments] }));
}

export function getCanonicalRegionRoutesForSite(
  siteOrKey: BabySiteConfig | BabySiteKey,
): readonly string[] {
  return Object.freeze(
    getRegionNodesForSite(siteOrKey).map((node) => node.path),
  );
}

export function normalizeRegionQuery(value: string): string {
  return value
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("ko-KR")
    .replace(/제(?=\d)/g, "")
    .replace(/[\s·.・,_-]+/g, "");
}

export function searchRegionsForSite(
  siteOrKey: BabySiteConfig | BabySiteKey,
  queryValue: string,
  limit = 12,
): readonly BabyRegionSearchResult[] {
  const query = normalizeRegionQuery(queryValue);
  if (!query || limit <= 0) return [];

  return getRegionNodesForSite(siteOrKey)
    .flatMap((node) => {
      const names = uniqueStrings([
        node.displayName,
        node.officialName,
        node.qualifiedName,
        ...node.sourceAliases,
      ]);
      const exactIndex = names.findIndex(
        (name) => normalizeRegionQuery(name) === query,
      );
      const prefixIndex = names.findIndex((name) =>
        normalizeRegionQuery(name).startsWith(query),
      );
      const includesIndex = names.findIndex((name) =>
        normalizeRegionQuery(name).includes(query),
      );
      const matchIndex =
        exactIndex >= 0
          ? exactIndex
          : prefixIndex >= 0
            ? prefixIndex
            : includesIndex;
      if (matchIndex < 0) return [];
      const score = exactIndex >= 0 ? 0 : prefixIndex >= 0 ? 1 : 2;
      const matchedName = names[matchIndex];
      return [
        {
          node,
          matchedName,
          score,
        },
      ];
    })
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.node.routeOrdinal - right.node.routeOrdinal,
    )
    .slice(0, limit)
    .map(({ node, matchedName }) => ({
      node,
      matchedName,
      isAliasMatch:
        normalizeRegionQuery(matchedName) !==
        normalizeRegionQuery(node.displayName),
      context: node.qualifiedName,
      path: node.path,
    }));
}

export const ACTIVE_REGION_NODES = getRegionNodesForSite(ACTIVE_SITE);
export const ACTIVE_REGIONAL_CANONICAL_ROUTES =
  getCanonicalRegionRoutesForSite(ACTIVE_SITE);
export const ACTIVE_CANONICAL_REGION_ROUTES =
  ACTIVE_REGIONAL_CANONICAL_ROUTES;

export function getNodeBySegments(
  segments: readonly string[],
): BabyRegionNode | null {
  return getNodeBySegmentsForSite(ACTIVE_SITE, segments);
}

export const resolveRegionNode = getNodeBySegments;

export function getNodeByPath(path: string): BabyRegionNode | null {
  return getNodeByPathForSite(ACTIVE_SITE, path);
}

export function getRegionChildren(
  input: NodeOrSegments,
): readonly BabyRegionNode[] {
  return getRegionChildrenForSite(ACTIVE_SITE, input);
}

export const getDirectChildren = getRegionChildren;

export function getRegionParent(
  input: NodeOrSegments,
): BabyRegionNode | null {
  return getRegionParentForSite(ACTIVE_SITE, input);
}

export function getRegionBreadcrumbs(
  input: NodeOrSegments,
): readonly RegionBreadcrumb[] {
  return getRegionBreadcrumbsForSite(ACTIVE_SITE, input);
}

export function getRegionStaticParams(): Array<{ segments: string[] }> {
  return getRegionStaticParamsForSite(ACTIVE_SITE);
}

export const generateRegionStaticParams = getRegionStaticParams;
export const generateStaticParams = getRegionStaticParams;
export const getAllRegionStaticParams = getRegionStaticParams;

export function searchActiveRegions(
  queryValue: string,
  limit = 12,
): readonly BabyRegionSearchResult[] {
  return searchRegionsForSite(ACTIVE_SITE, queryValue, limit);
}

export const searchRegions = searchActiveRegions;
