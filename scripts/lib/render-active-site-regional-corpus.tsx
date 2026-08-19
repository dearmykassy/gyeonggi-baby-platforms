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
  ACTIVE_SITE,
  type BabySiteConfig,
} from "@/lib/site-config";
import type { Metadata } from "next";

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
    (section) => !section.id.includes("directory"),
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
  const siblingIndex = siblings.findIndex((candidate) => candidate.path === node.path);
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
    childCount: children.length,
    childTypes: typeHistogram(children),
    siblingCount: siblings.length,
    siblingIndex,
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
      value.includes(ACTIVE_SITE.officialName),
    );
  const primaryBlocks = renderedPrimaryBlocks(node.kind, content);
  const renderedVisibleText = stripRenderedHtml(html);
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
  const renderedH2Matches = [...html.matchAll(/<h2(?:\s[^>]*)?>([\s\S]*?)<\/h2>/giu)];
  const renderedH2Texts = renderedH2Matches.map((match) =>
    stripRenderedHtml(match[1] ?? ""),
  );
  const primaryBlocksVerified = primaryBlocks.every((block) =>
    renderedVisibleText.includes(block),
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
    factProfile: factProfile(node, children, parent, siblings),
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
