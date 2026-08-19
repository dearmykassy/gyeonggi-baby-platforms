import { renderToStaticMarkup } from "react-dom/server";

import AreasPage, {
  generateMetadata as generateAreasMetadata,
} from "@/app/areas/page";
import BlogPage, {
  generateMetadata as generateBlogMetadata,
} from "@/app/blog/page";
import BlogArticlePage, {
  generateMetadata as generateBlogArticleMetadata,
} from "@/app/blog/[slug]/page";
import GuidePage, {
  generateMetadata as generateGuideMetadata,
} from "@/app/guide/page";
import NoticePage, {
  generateMetadata as generateNoticeMetadata,
} from "@/app/notice/page";
import PricingPage, {
  generateMetadata as generatePricingMetadata,
} from "@/app/pricing/page";

import buildSitemap from "@/app/sitemap";
import { RegionPage } from "@/components/region-page";
import { Template11Home } from "@/components/template11-home";
import {
  toBreadcrumbItems,
  toDirectoryItems,
} from "@/components/view-model";
import { createRegionContent } from "@/lib/content";
import {
  createRouteMetadataContract,
  createRegionMetadataContract,
  getSitePublicationContract,
} from "@/lib/metadata";
import {
  getRegionBreadcrumbsForSite,
  getRegionChildrenForSite,
  getRegionNodesForSite,
  getRegionParentForSite,
} from "@/lib/regions";
import { getRegionContentModifiedAt } from "@/lib/site-revisions";
import { getCityFactProfile } from "@/data/city-fact-profiles";
import {
  getRegionPublicFacilityFacts,
  REGION_PUBLIC_FACILITY_SOURCE,
} from "@/data/region-public-facilities.generated";
import {
  getRegionRoadFacts,
  REGION_ROAD_FACT_DATA_DIGEST,
  REGION_ROAD_FACT_SOURCE,
} from "@/data/region-road-facts.generated";
import {
  ACTIVE_SITE,
  type BabySiteConfig,
} from "@/lib/site-config";
import type { Metadata } from "next";
import {
  canonicalAuthoredLocalParagraphEntries,
  extractRenderedAuthoredSections,
  hasPreciseAddressExposure,
} from "./rendered-authored-scope";

function cleanText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim();
}

function stripRenderedHtml(value: string): string {
  return cleanText(
    value
      .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/giu, " ")
      .replace(/<[^>]+>/gu, " ")
      .replace(/&nbsp;/giu, " ")
      .replace(/&amp;/giu, "&")
      .replace(/&quot;/giu, '"')
      .replace(/&#(?:x27|39);/giu, "'")
      .replace(/&lt;/giu, "<")
      .replace(/&gt;/giu, ">"),
  );
}

function firstVisibleWords(value: string, limit = 100): string {
  return (cleanText(value).match(/[\p{L}\p{N}]+/gu) ?? [])
    .slice(0, limit)
    .join(" ");
}

function containsServiceIntent(value: string): boolean {
  const text = cleanText(value);
  return (
    /(?:여성\s*)?마사지사.{0,40}방문|방문.{0,40}(?:여성\s*)?마사지사|방문.{0,24}(?:관리|서비스)/u.test(text) &&
    /코스/u.test(text) &&
    /24시간.{0,24}전화|전화.{0,24}24시간/u.test(text) &&
    /(?:현장(?:에서|\s*)\s*(?:후불|결제)|관리\s*(?:후|뒤).{0,24}(?:결제|후불))/u.test(text)
  );
}

function normalizedInternalPath(value: string): string {
  return value === "/" ? value : value.replace(/\/+$/u, "");
}

function customerFacingShortLabelFields(
  content: ReturnType<typeof createRegionContent>,
): readonly string[] {
  return [
    content.title,
    content.description,
    content.h1,
    content.eyebrow,
    ...content.keywords,
    ...content.sections.map((section) => section.heading),
    content.childDirectory.heading,
  ];
}

function publicationContractPass(
  metadata: ReturnType<typeof createRegionMetadataContract>,
): boolean {
  const publication = getSitePublicationContract(ACTIVE_SITE);
  if (publication.indexable) {
    return (
      ACTIVE_SITE.deploymentState === "public" &&
      metadata.robots.index === true &&
      metadata.robots.follow === true &&
      new URL(metadata.canonical).origin === publication.origin
    );
  }
  return (
    metadata.robots.index === false &&
    metadata.robots.follow === false &&
    metadata.robots.nocache === true &&
    publication.origin.endsWith(".invalid") &&
    new URL(metadata.canonical).hostname.endsWith(".invalid")
  );
}

function renderedPrimaryBlocks(
  kind: "home" | "district" | "representative",
  content: ReturnType<typeof createRegionContent>,
): readonly string[] {
  const narrativeSections = content.sections.filter(
    (section) => section.auditScope !== "directory",
  ).toSorted((left, right) => left.id.localeCompare(right.id, "en"));
  return [
    content.h1,
    content.eyebrow,
    ...(kind === "home"
      ? [...content.hooks, content.faqIntro]
      : [content.description]),
    ...narrativeSections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
    ]),
  ]
    .map(cleanText)
    .filter(Boolean);
}

function normalizedFactRefs(values: readonly string[]): readonly string[] {
  return values
    .map(cleanText)
    .filter(Boolean)
    .toSorted((left, right) => left.localeCompare(right, "ko"));
}

function renderedAuthoredScopeContractFailures(
  content: ReturnType<typeof createRegionContent>,
  parsed: ReturnType<typeof extractRenderedAuthoredSections>,
): readonly string[] {
  const failures = [...parsed.failures];
  const expectedById = new Map(
    content.sections.map((section) => [section.id, section]),
  );
  const renderedById = new Map(
    parsed.sections.map((section) => [section.sectionId, section]),
  );

  if (expectedById.size !== content.sections.length) {
    failures.push("DUPLICATE_SOURCE_SECTION_ID");
  }
  if (parsed.sections.length !== content.sections.length) {
    failures.push(
      `RENDERED_SECTION_COUNT:${parsed.sections.length}:${content.sections.length}`,
    );
  }

  for (const expected of content.sections) {
    const rendered = renderedById.get(expected.id);
    if (!rendered) {
      failures.push(`MISSING_RENDERED_SECTION:${expected.id}`);
      continue;
    }
    if (rendered.auditScope !== expected.auditScope) {
      failures.push(`RENDERED_SCOPE_MISMATCH:${expected.id}`);
    }
    if (
      JSON.stringify(normalizedFactRefs(rendered.factRefs)) !==
      JSON.stringify(normalizedFactRefs(expected.factRefs))
    ) {
      failures.push(`RENDERED_FACT_REFS_MISMATCH:${expected.id}`);
    }
    const expectedParagraphs = (
      expected.auditScope === "directory"
        ? expected.paragraphs.slice(0, 1)
        : expected.paragraphs
    ).map(cleanText);
    if (
      JSON.stringify(rendered.paragraphs.map(cleanText)) !==
      JSON.stringify(expectedParagraphs)
    ) {
      failures.push(`RENDERED_PARAGRAPHS_MISMATCH:${expected.id}`);
    }
  }

  for (const rendered of parsed.sections) {
    if (!expectedById.has(rendered.sectionId)) {
      failures.push(`UNEXPECTED_RENDERED_SECTION:${rendered.sectionId}`);
    }
  }

  const directory = content.sections.at(-1);
  if (
    !directory ||
    directory.id !== content.childDirectory.id ||
    directory.auditScope !== content.childDirectory.auditScope ||
    directory.heading !== content.childDirectory.heading ||
    directory.paragraphs[0] !== content.childDirectory.intro ||
    JSON.stringify(normalizedFactRefs(directory.factRefs)) !==
      JSON.stringify(normalizedFactRefs(content.childDirectory.factRefs))
  ) {
    failures.push("CHILD_DIRECTORY_TRACE_PROJECTION");
  }

  return [...new Set(failures)].sort();
}

function uniqueCount(values: readonly string[]): number {
  return new Set(values.map(cleanText).filter(Boolean)).size;
}

function nodeLocalTypes(node: ReturnType<typeof getRegionNodesForSite>[number]): readonly string[] {
  return [...new Set(node.records.map((record) => record.groupType).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "ko"));
}

function localTypeLabel(
  node: ReturnType<typeof getRegionNodesForSite>[number],
): "동" | "읍" | "면" {
  if (node.displayName.endsWith("읍")) return "읍";
  if (node.displayName.endsWith("면")) return "면";
  return "동";
}

function eligibilityEvidenceScore(
  node: ReturnType<typeof getRegionNodesForSite>[number],
): number {
  const legalCount = uniqueCount(
    node.records.flatMap((record) =>
      record.legalAreas.map((area) => area.name),
    ),
  );
  const aliasCount = uniqueCount(
    node.records
      .flatMap((record) => [record.name, ...record.sourceNames])
      .filter((name) => name !== node.displayName),
  );
  return (
    node.sourceUnitCount * 1000 +
    legalCount * 20 +
    aliasCount * 10 +
    node.segments.length
  );
}

function typeHistogram(
  nodes: readonly ReturnType<typeof getRegionNodesForSite>[number][],
): Readonly<Record<string, number>> {
  const entries = new Map<string, number>();
  for (const node of nodes) {
    const key = node.kind === "representative"
      ? nodeLocalTypes(node).join("+") || "representative"
      : node.kind;
    entries.set(key, (entries.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...entries].sort(([left], [right]) => left.localeCompare(right, "ko")),
  );
}

function factProfile(
  node: ReturnType<typeof getRegionNodesForSite>[number],
  children: readonly ReturnType<typeof getRegionNodesForSite>[number][],
  parent: ReturnType<typeof getRegionParentForSite>,
  siblings: readonly ReturnType<typeof getRegionNodesForSite>[number][],
): string {
  const legalNames = node.records.flatMap((record) =>
    record.legalAreas.map((area) => area.name),
  );
  const aliases = node.records.flatMap((record) => [
    record.name,
    ...record.sourceNames,
  ]);
  const sourceCodes = node.records.flatMap((record) => record.sourceCodes);
  const recordModes = node.records.map((record) => record.legalIdentityMode);
  const sourceDepths = node.records.map(
    (record) => record.sourcePathSegments.length,
  );
  const parentChildren = parent
    ? getRegionChildrenForSite(ACTIVE_SITE, parent)
    : [];
  const verifiedRoadNames = getRegionRoadFacts(ACTIVE_SITE.key, node.path)
    .flatMap((fact) => [fact.roadName, ...fact.roadNames])
    .toSorted((left, right) => left.localeCompare(right, "ko"));
  return JSON.stringify({
    kind: node.kind,
    localTypes: nodeLocalTypes(node),
    routeDepth: node.segments.length,
    sourceUnitCount: node.sourceUnitCount,
    representativeCount: node.representativeCount,
    recordCount: node.records.length,
    legalAreaCount: uniqueCount(legalNames),
    aliasCount: uniqueCount(aliases),
    sourceCodeCount: uniqueCount(sourceCodes),
    recordModes: [...new Set(recordModes)].sort(),
    sourceDepths: [...new Set(sourceDepths)].sort((left, right) => left - right),
    legalNames: [...new Set(legalNames)].sort((left, right) => left.localeCompare(right, "ko")),
    aliases: [...new Set(aliases)].sort((left, right) => left.localeCompare(right, "ko")),
    sourceCodes: [...new Set(sourceCodes)].sort((left, right) => left.localeCompare(right, "en")),
    verifiedRoadNames,
    childCount: children.length,
    childTypes: typeHistogram(children),
    siblingCount: siblings.length,
    siblingTypes: typeHistogram(siblings),
    parentKind: parent?.kind ?? null,
    parentSourceUnitCount: parent?.sourceUnitCount ?? 0,
    parentRepresentativeCount: parent?.representativeCount ?? 0,
    parentChildCount: parentChildren.length,
    parentChildTypes: typeHistogram(parentChildren),
  });
}

function normalizationLabels(
  node: ReturnType<typeof getRegionNodesForSite>[number],
): readonly string[] {
  const leafAliases = node.kind === "representative"
    ? [
        ...node.sourceAliases,
        ...node.records.flatMap((record) => [
          record.name,
          ...record.sourceNames,
        ]),
      ]
    : [];
  return [
    ...new Set([
      ACTIVE_SITE.searchName,
      ACTIVE_SITE.officialName,
      node.displayName,
      node.officialName,
      node.qualifiedName,
      node.name,
      ...leafAliases,
    ].map(cleanText).filter(Boolean)),
  ].sort((left, right) => right.length - left.length);
}

const records = [];
const renderedRecords = [];
const fixedRecords = [];
const stagedRecords: Array<{
  siteKey: string;
  path: string;
  html: string;
  staticRenderPass: boolean;
  selfCanonicalPass: boolean;
  actualPublicationContractPass: boolean;
  routeRobotsIndex: boolean;
  routeRobotsFollow: boolean;
  sitemapPresent: boolean;
}> = [];
const sitemapEntries = buildSitemap();
const sitemapByUrl = new Map(
  sitemapEntries.map((entry) => [entry.url, entry]),
);
const sitemapUrls = new Set(sitemapByUrl.keys());
const publicAuditOrigin = `https://${ACTIVE_SITE.slug}.release-audit.example`;
const publicAuditSite: BabySiteConfig = {
  ...ACTIVE_SITE,
  publicOrigin: publicAuditOrigin,
  origin: publicAuditOrigin,
  deploymentState: "public",
  isPublic: true,
  indexingEnabled: true,
};

for (const node of getRegionNodesForSite(ACTIVE_SITE)) {
  const content = createRegionContent(node, ACTIVE_SITE);
  const metadata = createRegionMetadataContract(node, ACTIVE_SITE);
  const publicMetadata = createRegionMetadataContract(node, publicAuditSite);
  const children = getRegionChildrenForSite(ACTIVE_SITE, node);
  const parent = getRegionParentForSite(ACTIVE_SITE, node);
  const related = children.length
    ? children
    : parent
      ? getRegionChildrenForSite(ACTIVE_SITE, parent).filter(
          (candidate) => candidate.path !== node.path,
        )
      : [];
  const siblings = parent
    ? getRegionChildrenForSite(ACTIVE_SITE, parent)
    : [];
  const directoryItems = toDirectoryItems(related);
  const html = renderToStaticMarkup(
    node.kind === "home" ? (
      <Template11Home
        brandName={ACTIVE_SITE.brandName}
        cityName={ACTIVE_SITE.searchName}
        content={content}
        designProfile={ACTIVE_SITE.designProfile}
        directoryItems={directoryItems}
        layoutVariant={ACTIVE_SITE.layoutVariant}
      />
    ) : (
      <RegionPage
        breadcrumbs={toBreadcrumbItems(
          getRegionBreadcrumbsForSite(ACTIVE_SITE, node),
        )}
        content={content}
        directoryItems={directoryItems}
        layoutVariant={ACTIVE_SITE.layoutVariant}
        regionName={node.qualifiedName}
        regionPath={node.path}
      />
    ),
  );
  const expectedCanonical = new URL(
    node.path,
    getSitePublicationContract(ACTIVE_SITE).origin,
  ).href;
  const expectedPublicCanonical = new URL(node.path, publicAuditOrigin).href;
  const sitemapEntry = sitemapByUrl.get(metadata.canonical);
  const sitemapLastModified = sitemapEntry?.lastModified instanceof Date
    ? sitemapEntry.lastModified.toISOString()
    : cleanText(sitemapEntry?.lastModified);
  const metaContractPass =
    metadata.route === node.path &&
    metadata.title === content.title &&
    metadata.description === content.description &&
    JSON.stringify(metadata.keywords) === JSON.stringify(content.keywords) &&
    metadata.canonical === expectedCanonical;
  const shortLabelLeak =
    ACTIVE_SITE.officialName !== ACTIVE_SITE.searchName &&
    customerFacingShortLabelFields(content).some((value) =>
      new RegExp(
        `${ACTIVE_SITE.officialName}(?=$|[\\s·,|:;!?()[\\]/-]|출장|마사지|안마|지역|방문|코스)`,
        "u",
      ).test(value),
    );
  const primaryBlocks = renderedPrimaryBlocks(node.kind, content);
  const renderedVisibleText = stripRenderedHtml(html);
  const renderedH1Text = stripRenderedHtml(
    html.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/iu)?.[1] ?? "",
  );
  const primaryKeyword = content.primaryKeyword;
  const renderedFirst100Words = firstVisibleWords(renderedVisibleText);
  const cityFactProfile = node.kind === "home"
    ? getCityFactProfile(ACTIVE_SITE.key)
    : null;
  const cityFactProfileBlocks = cityFactProfile
    ? [
        cityFactProfile.heading,
        ...cityFactProfile.paragraphs,
        ...cityFactProfile.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
        ]),
      ]
    : [];
  const roadFacts = node.kind === "representative"
    ? getRegionRoadFacts(ACTIVE_SITE.key, node.path)
    : [];
  const facilityFacts = node.kind === "representative"
    ? getRegionPublicFacilityFacts(ACTIVE_SITE.key, node.path).slice(0, 6)
    : [];
  const nodeSourceCodes = new Set(
    node.records.flatMap((record) => record.sourceCodes),
  );
  const nodeLegalNames = new Set(
    node.records.flatMap((record) =>
      record.legalAreas.map((area) => area.name),
    ),
  );
  const expectedRoadDistrictName = parent?.kind === "district"
    ? `${ACTIVE_SITE.officialName} ${parent.displayName}`
    : ACTIVE_SITE.officialName;
  const verifiedRoadNamePool = new Set(
    roadFacts.flatMap((fact) => [fact.roadName, ...fact.roadNames]),
  );
  const renderedH2Matches = [...html.matchAll(/<h2(?:\s[^>]*)?>([\s\S]*?)<\/h2>/giu)];
  const renderedH2Texts = renderedH2Matches.map((match) =>
    stripRenderedHtml(match[1] ?? ""),
  );
  const renderedPrimaryKeywordH2Count = renderedH2Texts.filter((heading) =>
    heading.includes(primaryKeyword),
  ).length;
  const primaryBlocksVerified = primaryBlocks.every((block) =>
    renderedVisibleText.includes(block),
  );
  const renderedAuthoredScope = extractRenderedAuthoredSections(html);
  const renderedAuthoredScopeFailures =
    renderedAuthoredScopeContractFailures(content, renderedAuthoredScope);
  const expectedRegionalUniqueParagraphs =
    canonicalAuthoredLocalParagraphEntries(content.sections);
  const renderedRegionalUniqueParagraphs =
    canonicalAuthoredLocalParagraphEntries(
      renderedAuthoredScope.sections.map((section) => ({
        id: section.sectionId,
        auditScope: section.auditScope,
        paragraphs: section.paragraphs,
      })),
    );
  const regionalUniqueBlocks = renderedRegionalUniqueParagraphs.map(
    (entry) => entry.paragraph,
  );
  const regionalUniqueBlocksVerified =
    renderedAuthoredScopeFailures.length === 0 &&
    JSON.stringify(renderedRegionalUniqueParagraphs) ===
      JSON.stringify(expectedRegionalUniqueParagraphs);
  const nonLocalRenderedText = cleanText(
    renderedAuthoredScope.sections
      .filter((section) => section.auditScope !== "local-substantive")
      .flatMap((section) => section.paragraphs)
      .join(" "),
  );
  const localParagraphSet = new Set(regionalUniqueBlocks);
  const localFactEscapedSharedScope =
    renderedAuthoredScope.sections
      .filter((section) => section.auditScope !== "local-substantive")
      .flatMap((section) => section.paragraphs)
      .some((paragraph) => localParagraphSet.has(cleanText(paragraph))) ||
    facilityFacts.some(
      (fact) =>
        nonLocalRenderedText.includes(fact.name) ||
        nonLocalRenderedText.includes(fact.roadName),
    );
  const renderedLocalFactRefs = renderedAuthoredScope.sections
    .filter((section) => section.auditScope === "local-substantive")
    .flatMap((section) => section.factRefs);
  const facilityRoadNamePool = new Set(
    facilityFacts.map((fact) => fact.roadName),
  );
  const allowedLocalRoadNamePool = new Set([
    ...facilityRoadNamePool,
    ...verifiedRoadNamePool,
  ]);
  const explicitLocalRoadRefs = [
    ...new Set(
      renderedLocalFactRefs.flatMap((reference) => {
        const match = cleanText(reference).match(/^road:(.+)$/u);
        return match?.[1] ? [cleanText(match[1])] : [];
      }),
    ),
  ].sort((left, right) => left.localeCompare(right, "ko"));
  const displayedRoadNames = explicitLocalRoadRefs.filter((roadName) =>
    regionalUniqueBlocks.some((block) => block.includes(`‘${roadName}’`)),
  );
  const displayedAllowedRoadNames = [...allowedLocalRoadNamePool].filter(
    (roadName) =>
      regionalUniqueBlocks.some((block) => block.includes(`‘${roadName}’`)),
  );
  const roadFallbackNames = displayedRoadNames.filter(
    (roadName) =>
      verifiedRoadNamePool.has(roadName) &&
      !facilityRoadNamePool.has(roadName),
  );
  const roadReferenceContractPass =
    explicitLocalRoadRefs.length > 0 &&
    explicitLocalRoadRefs.every((roadName) =>
      allowedLocalRoadNamePool.has(roadName),
    ) &&
    displayedRoadNames.length === explicitLocalRoadRefs.length &&
    displayedAllowedRoadNames.every((roadName) =>
      explicitLocalRoadRefs.includes(roadName),
    ) &&
    explicitLocalRoadRefs.every(
      (roadName) => !nonLocalRenderedText.includes(`‘${roadName}’`),
    ) &&
    !(
      ACTIVE_SITE.key === "hanam" &&
      node.path === "/areas/%EC%B4%88%EC%9D%B4%EB%8F%99/" &&
      roadFallbackNames.length < 1
    );
  const renderedInternalPaths = new Set(
    [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/giu)]
      .map((match) => match[1] ?? "")
      .filter((href) => href.startsWith("/"))
      .map(normalizedInternalPath),
  );
  const renderedDirectoryHtml =
    html.match(
      /<section\b[^>]*class="[^"]*\bregion-directory\b[^"]*"[^>]*>[\s\S]*?<\/section>/iu,
    )?.[0] ?? "";
  const renderedDirectoryPathList = [
    ...renderedDirectoryHtml.matchAll(/<a\b[^>]*\bhref="([^"]+)"/giu),
  ]
    .map((match) => match[1] ?? "")
    .filter((href) => href.startsWith("/"))
    .map(normalizedInternalPath);
  const renderedDirectoryPaths = new Set(renderedDirectoryPathList);
  const indexEligibilityTargetLinked =
    content.indexEligibilityTargetPath === null ||
    renderedInternalPaths.has(
      normalizedInternalPath(content.indexEligibilityTargetPath),
    );
  const possibleContextualPaths = new Set(
    [
      "/",
      parent?.path,
      ...related.map((candidate) => candidate.path),
    ].filter(
      (path): path is string => Boolean(path) && path !== node.path,
    ),
  );
  const expectedDirectoryPaths = new Set(
    related.map((candidate) => normalizedInternalPath(candidate.path)),
  );
  const renderedDirectoryPathCount = [...expectedDirectoryPaths].filter(
    (path) => renderedDirectoryPaths.has(path),
  ).length;
  const unexpectedDirectoryPathCount = [...renderedDirectoryPaths].filter(
    (path) => !expectedDirectoryPaths.has(path),
  ).length;

  records.push({
    siteKey: ACTIVE_SITE.key,
    path: node.path,
    kind: node.kind,
    nodeDisplayName: node.displayName,
    content,
    normalizationLabels: normalizationLabels(node),
    indexEligible: content.indexEligible,
    indexEligibilityReason: content.indexEligibilityReason,
    indexEligibilityTargetPath: content.indexEligibilityTargetPath,
    parentPath: node.parentPath,
    localType: node.kind === "representative" ? localTypeLabel(node) : null,
    eligibilityEvidenceScore:
      node.kind === "representative" ? eligibilityEvidenceScore(node) : null,
    routeOrdinal: node.routeOrdinal,
    indexEligibilityTargetLinked,
    directoryCoveragePass:
      renderedDirectoryPathCount === expectedDirectoryPaths.size &&
      renderedDirectoryPathList.length === expectedDirectoryPaths.size &&
      unexpectedDirectoryPathCount === 0,
    directoryExpectedLinkCount: expectedDirectoryPaths.size,
    directoryRenderedLinkCount: renderedDirectoryPathList.length,
    directoryUnexpectedLinkCount: unexpectedDirectoryPathCount,
    routeRobotsIndex: publicMetadata.robots.index,
    routeRobotsFollow: publicMetadata.robots.follow,
    sitemapPresent: sitemapUrls.has(metadata.canonical),
    sitemapLastModified,
    sitemapLastModifiedPass:
      sitemapLastModified === getRegionContentModifiedAt(node) &&
      Number.isFinite(Date.parse(sitemapLastModified)) &&
      Date.parse(sitemapLastModified) <= Date.now(),
    selfCanonicalPass:
      metadata.canonical === expectedCanonical &&
      publicMetadata.canonical === expectedPublicCanonical,
    staticRenderPass: true,
    renderedPrimaryBlocks: primaryBlocks,
    renderedRegionalUniqueParagraphs,
    renderedRegionalUniqueBlocks: regionalUniqueBlocks,
    regionalUniqueBlocksVerified,
    renderedAuthoredScopePass: renderedAuthoredScopeFailures.length === 0,
    renderedAuthoredScopeFailures,
    localFactEscapedSharedScope,
    primaryBlocksVerified,
    cityFactProvenance: cityFactProfile
      ? {
          checkedAt: cityFactProfile.checkedAt,
          sourceCount: cityFactProfile.sources.length,
          sourceUrls: cityFactProfile.sources.map((source) => source.url),
          sourceLabels: cityFactProfile.sources.map((source) => source.label),
          factSectionCount: cityFactProfile.sections.length,
          renderedFactBlocksVerified: cityFactProfileBlocks.every((block) =>
            renderedVisibleText.includes(block),
          ),
        }
      : null,
    roadFactProvenance: node.kind === "representative"
      ? {
          sourceAgency: REGION_ROAD_FACT_SOURCE.agency,
          snapshotDate: REGION_ROAD_FACT_SOURCE.snapshotDate,
          archiveSha256: REGION_ROAD_FACT_SOURCE.archiveSha256,
          roadNameSnapshot: REGION_ROAD_FACT_SOURCE.roadNameSnapshot,
          roadNameArchiveSha256:
            REGION_ROAD_FACT_SOURCE.roadNameArchiveSha256,
          roadNameEntrySha256: REGION_ROAD_FACT_SOURCE.roadNameEntrySha256,
          dataDigest: REGION_ROAD_FACT_DATA_DIGEST,
          factCount: roadFacts.length,
          sourceCodeJoinPass:
            roadFacts.length > 0 &&
            roadFacts.every((fact) => nodeSourceCodes.has(fact.adminCode)),
          safeSelectionPass: roadFacts.every((fact) =>
            [
              "administrative_center",
              "public_building",
              "named_non_residential_building",
            ].includes(fact.selectionTier),
          ),
          roadNameAreaJoinPass:
            displayedRoadNames.length > 0 &&
            displayedRoadNames.every((roadName) =>
              allowedLocalRoadNamePool.has(roadName),
            ) &&
            roadFacts.every(
              (fact) =>
                fact.roadNames.length === 8 &&
                fact.roadDistrictName === expectedRoadDistrictName &&
                fact.roadLegalNames.length > 0 &&
                fact.roadLegalNames.every((name) => nodeLegalNames.has(name)),
            ),
          serviceContextSectionsPass: roadReferenceContractPass,
          explicitLocalRoadRefCount: explicitLocalRoadRefs.length,
          displayedLocalRoadRefCount: displayedRoadNames.length,
          verifiedFallbackRoadCount: roadFallbackNames.length,
          preciseAddressExposurePass:
            !hasPreciseAddressExposure(regionalUniqueBlocks),
          displayedRoadNames,
        }
      : null,
    facilityFactProvenance: node.kind === "representative"
      ? {
          sourceAgency: REGION_PUBLIC_FACILITY_SOURCE.agency,
          sourceDataset: REGION_PUBLIC_FACILITY_SOURCE.dataset,
          snapshotDate: REGION_PUBLIC_FACILITY_SOURCE.snapshotDate,
          archiveSha256: REGION_PUBLIC_FACILITY_SOURCE.archiveSha256,
          dataDigest: REGION_PUBLIC_FACILITY_SOURCE.dataDigest,
          factCount: facilityFacts.length,
          sourceCodeJoinPass:
            facilityFacts.length > 0 &&
            facilityFacts.every((fact) => nodeSourceCodes.has(fact.adminCode)),
          adminNameJoinPass: facilityFacts.every((fact) =>
            node.records.some(
              (record) =>
                record.sourceCodes.includes(fact.adminCode) &&
                [record.name, ...record.sourceNames].includes(fact.adminName),
            ),
          ),
          legalNameJoinPass: facilityFacts.every((fact) =>
            nodeLegalNames.has(fact.legalName),
          ),
          sourceRowHashesPass: facilityFacts.every((fact) =>
            [
              fact.auxRowSha256,
              fact.addressRowSha256,
              fact.roadCodeRowSha256,
              fact.jibunRowSha256,
            ].every((value) => /^[a-f0-9]{64}$/u.test(value)),
          ),
          renderedExactlyOncePass: facilityFacts.every(
            (fact) => {
              const exactRenderedPairs = regionalUniqueBlocks.filter(
                (block) =>
                  block.includes(`‘${fact.name}’`) &&
                  block.includes(`‘${fact.roadName}’`),
              );
              return (
                renderedLocalFactRefs.filter(
                (reference) =>
                  reference ===
                  `facility:${fact.name}|road:${fact.roadName}|legal:${fact.legalName}`,
                ).length === 1 && exactRenderedPairs.length === 1
              );
            },
          ),
          buildingNumberExposurePass:
            !hasPreciseAddressExposure(regionalUniqueBlocks),
          displayedFacilities: facilityFacts.map((fact) => ({
            name: fact.name,
            category: fact.category,
            adminCode: fact.adminCode,
            adminName: fact.adminName,
            roadName: fact.roadName,
            legalName: fact.legalName,
            sourceField: fact.sourceField,
            auxRowSha256: fact.auxRowSha256,
            addressRowSha256: fact.addressRowSha256,
            roadCodeRowSha256: fact.roadCodeRowSha256,
            jibunRowSha256: fact.jibunRowSha256,
          })),
        }
      : null,
    factProfile: factProfile(node, children, parent, siblings),
    primaryKeyword,
    renderedH1Text,
    renderedFirst100Words,
    keywordContract: {
      titlePrefixPass: cleanText(metadata.title).startsWith(primaryKeyword),
      h1Pass: renderedH1Text.startsWith(primaryKeyword),
      first100WordsPass: renderedFirst100Words.includes(primaryKeyword),
      h2Count: renderedPrimaryKeywordH2Count,
      h2Pass: renderedPrimaryKeywordH2Count >= 2,
    },
    serviceIntentContract: {
      renderedPass:
        containsServiceIntent(renderedVisibleText) &&
        renderedInternalPaths.has("/pricing") &&
        renderedInternalPaths.has("/guide"),
      descriptionPass: containsServiceIntent(content.description),
      hooksPass: containsServiceIntent(content.hooks.join(" ")),
      faqIntroPass:
        /(?:방문|관리)/u.test(content.faqIntro) &&
        /(?:전화|예약)/u.test(content.faqIntro) &&
        /(?:현장\s*(?:후불|결제)|결제)/u.test(content.faqIntro),
    },
    h1Count: html.match(/<h1(?:\s|>)/giu)?.length ?? 0,
    renderedH2Count: renderedH2Matches.length,
    renderedH2Texts,
    metaContractPass,
    actualPublicationContractPass: publicationContractPass(metadata),
    shortLabelLeak,
  });
  renderedRecords.push({
    siteKey: ACTIVE_SITE.key,
    path: node.path,
    kind: node.kind,
    html,
    normalizationLabels: normalizationLabels(node),
    availableContextualLinkCount: possibleContextualPaths.size,
  });
}

function metadataTitle(metadata: Metadata): string {
  if (typeof metadata.title === "string") return metadata.title;
  if (metadata.title && typeof metadata.title === "object") {
    if ("absolute" in metadata.title) return metadata.title.absolute;
    if ("default" in metadata.title) return metadata.title.default;
  }
  return "";
}

function metadataCanonical(metadata: Metadata): string {
  const canonical = metadata.alternates?.canonical;
  if (typeof canonical === "string") return canonical;
  if (canonical instanceof URL) return canonical.href;
  return "";
}

function metadataKeywords(metadata: Metadata): readonly string[] {
  const keywords = metadata.keywords;
  if (Array.isArray(keywords)) return keywords.map(String);
  return typeof keywords === "string" ? [keywords] : [];
}

function actualAncillaryMetadataContractPass(
  metadata: Metadata,
  expectedCanonical: string,
): boolean {
  const robots = metadata.robots;
  if (typeof robots !== "object" || robots === null) return false;
  const publication = getSitePublicationContract(ACTIVE_SITE);
  const robotsPass = publication.indexable
    ? robots.index === false && robots.follow === true && robots.nocache === true
    : robots.index === false && robots.follow === false && robots.nocache === true;
  return (
    metadataCanonical(metadata) === expectedCanonical &&
    robotsPass
  );
}

function addStagedRoute({
  path,
  html,
  metadata,
}: {
  path: string;
  html: string;
  metadata: Metadata;
}) {
  const title = metadataTitle(metadata);
  const description = cleanText(metadata.description);
  const canonical = metadataCanonical(metadata);
  const publicContract = createRouteMetadataContract(
    path,
    title,
    description,
    metadataKeywords(metadata),
    publicAuditSite,
  );
  const expectedCanonical = new URL(
    path,
    getSitePublicationContract(ACTIVE_SITE).origin,
  ).href;
  const expectedPublicCanonical = new URL(path, publicAuditOrigin).href;
  stagedRecords.push({
    siteKey: ACTIVE_SITE.key,
    path,
    html,
    staticRenderPass: html.length > 0,
    selfCanonicalPass:
      canonical === expectedCanonical &&
      publicContract.canonical === expectedPublicCanonical,
    actualPublicationContractPass: actualAncillaryMetadataContractPass(
      metadata,
      expectedCanonical,
    ),
    routeRobotsIndex: publicContract.robots.index,
    routeRobotsFollow: publicContract.robots.follow,
    sitemapPresent: sitemapUrls.has(canonical),
  });
  return { title, description, canonical };
}

const fixedDefinitions = [
  {
    path: "/pricing/",
    render: () => renderToStaticMarkup(<PricingPage />),
    metadata: () => generatePricingMetadata(),
  },
  {
    path: "/guide/",
    render: () => renderToStaticMarkup(<GuidePage />),
    metadata: () => generateGuideMetadata(),
  },
  {
    path: "/notice/",
    render: () => renderToStaticMarkup(<NoticePage />),
    metadata: () => generateNoticeMetadata(),
  },
] as const;

for (const definition of fixedDefinitions) {
  const html = definition.render();
  const metadata = definition.metadata();
  const staged = addStagedRoute({ path: definition.path, html, metadata });
  fixedRecords.push({
    siteKey: ACTIVE_SITE.key,
    path: definition.path,
    metaTitle: staged.title,
    description: staged.description,
    h1: stripRenderedHtml(html.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/iu)?.[1] ?? ""),
    html,
    surroundingBlocks: [],
  });
}

addStagedRoute({
  path: "/areas/",
  html: renderToStaticMarkup(<AreasPage />),
  metadata: generateAreasMetadata(),
});
addStagedRoute({
  path: "/blog/",
  html: renderToStaticMarkup(<BlogPage />),
  metadata: generateBlogMetadata(),
});
for (const post of (await import("@/data/blog-posts")).getBlogPosts(ACTIVE_SITE)) {
  const params = Promise.resolve({ slug: post.slug });
  addStagedRoute({
    path: `/blog/${post.slug}/`,
    html: renderToStaticMarkup(await BlogArticlePage({ params })),
    metadata: await generateBlogArticleMetadata({ params }),
  });
}

process.stdout.write(
  JSON.stringify({
    siteKey: ACTIVE_SITE.key,
    sitemapContract: {
      siteKey: ACTIVE_SITE.key,
      documentCount: sitemapEntries.length,
      uniqueDocumentCount: sitemapUrls.size,
      lastModifiedCount: sitemapEntries.filter((entry) =>
        Boolean(entry.lastModified),
      ).length,
      unsupportedHintCount: sitemapEntries.filter(
        (entry) => entry.changeFrequency !== undefined || entry.priority !== undefined,
      ).length,
    },
    records,
    renderedRecords,
    fixedRecords,
    stagedRecords,
  }),
);
