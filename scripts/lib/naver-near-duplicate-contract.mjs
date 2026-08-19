import { createHash } from "node:crypto";
import ts from "typescript";

export const NAVER_NEAR_DUPLICATE_THRESHOLDS = Object.freeze({
  primaryContent: Object.freeze({
    percentile: 0.95,
    percentileExclusiveMaximum: 0.45,
    pairExclusiveMaximum: 0.55,
  }),
  repeatedBlockCharacterShare: Object.freeze({
    exactMaximum: 0.25,
    normalizedMaximum: 0.35,
  }),
  minimumLeafVerifiedRegionFacts: 3,
  minimumContextualLinksWhereAvailable: 3,
  minimumContentSections: 10,
  maximumContentSections: 12,
});

export const INITIAL_INDEXABLE_REGIONAL_INVENTORY = Object.freeze({
  count: 27,
  sha256: "8eda7605fb2c3e5253d4149025a6b20870bcd2429832c17502e0778c4e889f5e",
});

export const VERIFIED_LEAF_FACT_SECTION_IDS = Object.freeze(
  new Set([
    "parent-hierarchy",
    "sibling-scope",
    "adjacent-routes",
    "source-aliases",
    "source-units",
    "legal-area-map",
    "route-depth",
    "route-type",
    "city-scope",
  ]),
);

export const ARTIFICIAL_EDITORIAL_FILLER_PATTERNS = Object.freeze([
  /\bEDITORIAL(?:\s+CUE)?\b/iu,
  /주소\s*장부/u,
  /주소표처럼/u,
  /(?:경계선|위치|순서|확인)\s*표식/u,
  /(?:일정|시간|주소|메모|확인|서로\s*다른|서로다른)\s*칸/u,
  /(?:첫째|둘째|셋째|넷째|다섯째|여섯째|일곱째|여덟째|아홉째|열째|다음)\s*(?:칸|갈래|묶음|줄|표식)/u,
]);

export const CUSTOMER_FACING_TECHNICAL_FILLER_PATTERNS = Object.freeze([
  /시·군\s*서비스\s*루트/u,
  /구\s*단위\s*허브/u,
  /(?:동|읍|면)\s*단위\s*대표\s*경로/u,
  /(?:지역\s*)?(?:그래프|레코드|루트|허브)/u,
  /원천\s*(?:지역)?(?:명|명칭|별칭)/u,
  /원본\s*(?:행정\s*)?(?:자료|깊이)/u,
  /(?:밀도|분포|최댓값|최솟값|최대값|최소값|배수)/u,
  /원천명(?:\s*수)?\s*(?:근접|집중|분포|밀도|비중)/u,
  /법정지역\s*연결\s*수\s*(?:근접|집중|분포|밀도|비중)/u,
  /(?:원본|소스)\s*(?:행정\s*자료의\s*)?경로\s*깊이/u,
  /경로별\s*(?:비중|밀도|분포)/u,
  /(?:최댓값|최대값|최대).*(?:최솟값|최소값|최소).*(?:배|차이)/u,
  /직계\s*경로당/u,
  /행정\s*레코드/u,
  /지역\s*그래프/u,
  /(?:원천|소스)\s*코드/u,
  /URL\s*지역\s*단계/iu,
]);

const BLOCK_TAG_PATTERN =
  /<(p|h1|h2|h3|summary|dt|dd|strong|small)\b[^>]*>([\s\S]*?)<\/\1>/giu;
const SCRIPT_STYLE_PATTERN =
  /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/giu;
const TAG_PATTERN = /<[^>]+>/gu;
const WORD_PATTERN = /[\p{L}\p{N}]+/gu;
const KOREAN_COUNTER_NUMBER_PATTERN =
  /(?:스물아홉|스물여덟|스물일곱|스물여섯|스물다섯|스물넷|스물네|스물셋|스물세|스물둘|스물두|스물하나|열아홉|열여덟|열일곱|열여섯|열다섯|열넷|열네|열셋|열세|열둘|열두|열하나|스물|스무|열|아홉|여덟|일곱|여섯|다섯|하나|둘|셋|넷|한|두|세|네)(?=\s*(?:개|곳|단계|종|배|가지|건|명|구|동|읍|면|페이지|경로|항목|자릿수|이상|이하|미만))/gu;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#(?:x27|39);/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">");
}

export function cleanText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim();
}

export function digestText(value) {
  return createHash("sha256").update(cleanText(value)).digest("hex");
}

export function createRegionalNormalizer({ brands, labels }) {
  const brandValues = [...new Set(brands.map(cleanText).filter(Boolean))].sort(
    (left, right) => right.length - left.length,
  );
  const regionValues = [...new Set(labels.map(cleanText).filter(Boolean))]
    .filter((label) => !brandValues.includes(label))
    .sort((left, right) => right.length - left.length);
  const brandPattern = brandValues.length
    ? new RegExp(brandValues.map(escapeRegExp).join("|"), "giu")
    : null;
  const regionPattern = regionValues.length
    ? new RegExp(regionValues.map(escapeRegExp).join("|"), "gu")
    : null;

  return (value) => {
    let normalized = cleanText(value).toLocaleLowerCase("ko-KR");
    if (brandPattern) normalized = normalized.replace(brandPattern, "{브랜드}");
    if (regionPattern) normalized = normalized.replace(regionPattern, "{지역}");
    return normalized
      .replace(/\d[\d,.·~\-]*/gu, "{수}")
      .replace(KOREAN_COUNTER_NUMBER_PATTERN, "{수}")
      .replace(/\s+/gu, " ")
      .trim();
  };
}

export function primaryContentText(recordOrContent) {
  const blocks = recordOrContent?.content
    ? recordPrimaryNarrativeBlocks(recordOrContent)
    : primaryNarrativeBlocks(recordOrContent);
  return cleanText(blocks.join("\u001f"));
}

/**
 * Authored regional narrative blocks only. Shared site chrome, image captions,
 * fixed-route service details, and directory-link labels are intentionally not
 * part of the 25%/35% release gate.
 */
export function primaryNarrativeBlocks(content) {
  return [
    content.title,
    content.description,
    content.h1,
    content.eyebrow,
    ...(content.hooks ?? []),
    content.faqIntro,
    ...(content.sections ?? []).flatMap((section) => [
      section.heading,
      ...(section.paragraphs ?? []),
    ]),
  ]
    .map(cleanText)
    .filter(Boolean);
}

export function recordPrimaryNarrativeBlocks(record) {
  if (Array.isArray(record.renderedPrimaryBlocks)) {
    return record.renderedPrimaryBlocks.map(cleanText).filter(Boolean);
  }
  return primaryNarrativeBlocks(record.content);
}

/**
 * SEO copy must be selected from committed graph facts.  A route identity may
 * still choose presentation-only CSS/layout, but it must never choose titles,
 * paragraphs, section membership, or the corpus order used by this audit.
 */
export function evaluateFactDerivedSelectionSource(source) {
  const forbidden = [
    {
      code: "GLOBAL_ROUTE_IDENTITY_COPY_VARIATION",
      pattern: /\bglobalRouteIndex\s*\(/gu,
    },
    {
      code: "ROUTE_IDENTITY_COPY_VARIATION",
      pattern: /\brouteIdentity\b/gu,
    },
    {
      code: "ROUTE_ORDINAL_COPY_VARIATION",
      pattern: /\brouteOrdinal\b/gu,
    },
    {
      code: "HASH_SCORE_COPY_VARIATION",
      pattern: /\bstableScore\s*\(/gu,
    },
    {
      code: "RANDOM_COPY_VARIATION",
      pattern: /\b(?:Math\.random|randomUUID|createHash)\b/gu,
    },
  ];
  const violations = forbidden.flatMap(({ code, pattern }) =>
    [...String(source ?? "").matchAll(pattern)].map((match) => {
      const offset = match.index ?? 0;
      const line = String(source ?? "").slice(0, offset).split("\n").length;
      return { code, line, token: match[0] };
    }),
  );
  return {
    status: violations.length === 0 ? "PASS" : "FAIL",
    note:
      "SEO copy selection must be graph-fact-derived; route/site identity may vary presentation only.",
    violations,
  };
}

export function evaluateStagedIndexingSource({
  metadataSource,
  sitemapSource,
  ancillaryRouteSource = "",
}) {
  const violations = [];
  if (!/routeIndexEligible\s*=\s*false/u.test(metadataSource)) {
    violations.push("ROUTE_METADATA_DEFAULT_NOT_STAGED");
  }
  if (!/getIndexEligibleRegionNodes/u.test(sitemapSource)) {
    violations.push("SITEMAP_MISSING_ELIGIBLE_REGIONAL_INVENTORY");
  }
  for (const [pattern, code] of [
    [/\bFIXED_ROUTES\b/u, "SITEMAP_INCLUDES_FIXED_ROUTES"],
    [/\bgetBlogPosts\b/u, "SITEMAP_INCLUDES_BLOG_POSTS"],
    [/\bblogIndex\b/u, "SITEMAP_INCLUDES_BLOG_INDEX"],
  ]) {
    if (pattern.test(sitemapSource)) violations.push(code);
  }
  const ancillarySourceFile = ts.createSourceFile(
    "ancillary-route-corpus.tsx",
    String(ancillaryRouteSource),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const explicitIndexableCalls = [];
  const visitAncillarySource = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "createRouteMetadataContract" &&
      node.arguments.length >= 6 &&
      node.arguments[5].kind !== ts.SyntaxKind.FalseKeyword
    ) {
      explicitIndexableCalls.push(
        ancillarySourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      );
    }
    ts.forEachChild(node, visitAncillarySource);
  };
  visitAncillarySource(ancillarySourceFile);
  if (explicitIndexableCalls.length > 0) {
    violations.push("ANCILLARY_ROUTE_EXPLICITLY_INDEXABLE");
  }
  return {
    status: violations.length === 0 ? "PASS" : "FAIL",
    note:
      "Initial public discovery inventory is city-home-only; all ancillary routes remain staged noindex,follow.",
    explicitIndexableCallLines: explicitIndexableCalls,
    violations,
  };
}

export function factProfileSelectionFailures(records, normalize) {
  const eligibleLeaves = records.filter(
    (record) =>
      record.kind === "representative" && record.indexEligible !== false,
  );
  const failures = eligibleLeaves
    .filter((record) => !cleanText(record.factProfile))
    .map((record) => ({
      siteKey: record.siteKey,
      path: record.path,
      reasons: ["MISSING_FACT_PROFILE"],
    }));
  const groups = new Map();
  for (const record of eligibleLeaves) {
    const profile = cleanText(record.factProfile);
    if (!profile) continue;
    const existing = groups.get(profile) ?? [];
    existing.push(record);
    groups.set(profile, existing);
  }
  for (const [profile, group] of groups) {
    if (group.length < 2) continue;
    const signatures = new Map();
    for (const record of group) {
      const signature = JSON.stringify({
        title: normalize(record.content.title),
        description: normalize(record.content.description),
        h1: normalize(record.content.h1),
        sectionIds: [...(record.content.sections ?? [])]
          .map((section) => section.id)
          .filter((id) => !id.includes("directory"))
          .sort((left, right) => left.localeCompare(right, "en")),
      });
      const existing = signatures.get(signature) ?? [];
      existing.push(`${record.siteKey}:${record.path}`);
      signatures.set(signature, existing);
    }
    if (signatures.size > 1) {
      failures.push({
        factProfile: profile,
        reasons: ["FACT_PROFILE_COPY_SELECTION_DIVERGENCE"],
        records: group.map((record) => `${record.siteKey}:${record.path}`),
        signatures: [...signatures.values()],
      });
    }
  }
  return failures;
}

export function wordTrigrams(value) {
  const tokens = cleanText(value).match(WORD_PATTERN) ?? [];
  const trigrams = new Set();
  for (let index = 0; index + 2 < tokens.length; index += 1) {
    trigrams.add(tokens.slice(index, index + 3).join(" "));
  }
  return trigrams;
}

export function jaccardSimilarity(left, right) {
  const smaller = left.size <= right.size ? left : right;
  const larger = left.size <= right.size ? right : left;
  let intersection = 0;
  for (const value of smaller) {
    if (larger.has(value)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

export function percentile(values, quantile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil(quantile * sorted.length) - 1),
  );
  return sorted[index];
}

export function summarizeNumbers(values) {
  if (values.length === 0) {
    return { count: 0, minimum: 0, median: 0, p95: 0, maximum: 0, mean: 0 };
  }
  const sorted = [...values].sort((left, right) => left - right);
  const mean = sorted.reduce((total, value) => total + value, 0) / sorted.length;
  return {
    count: sorted.length,
    minimum: sorted[0],
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    maximum: sorted.at(-1),
    mean,
  };
}

export function duplicateGroups(values) {
  const groups = new Map();
  values.forEach((value, index) => {
    const normalized = cleanText(value);
    const existing = groups.get(normalized) ?? [];
    existing.push(index);
    groups.set(normalized, existing);
  });
  return [...groups]
    .filter(([, indexes]) => indexes.length > 1)
    .map(([value, indexes]) => ({ value, indexes }));
}

function duplicateIndexGroups(values, transform = (value) => value) {
  const groups = new Map();
  values.forEach((value, index) => {
    const comparable = transform(value);
    const existing = groups.get(comparable) ?? [];
    existing.push(index);
    groups.set(comparable, existing);
  });
  return [...groups.values()].filter((indexes) => indexes.length > 1);
}

function sameKindSimilarities(records, normalize, pairIsInScope) {
  const prepared = records.map((record) => ({
    ...record,
    trigrams: wordTrigrams(normalize(primaryContentText(record))),
  }));
  const pairs = [];
  for (let leftIndex = 0; leftIndex < prepared.length; leftIndex += 1) {
    const left = prepared[leftIndex];
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < prepared.length;
      rightIndex += 1
    ) {
      const right = prepared[rightIndex];
      if (left.kind !== right.kind || !pairIsInScope(left, right)) continue;
      pairs.push({
        left: `${left.siteKey}:${left.path}`,
        right: `${right.siteKey}:${right.path}`,
        kind: left.kind,
        similarity: jaccardSimilarity(left.trigrams, right.trigrams),
      });
    }
  }
  return pairs;
}

export function crossSiteSameKindSimilarities(records, normalize) {
  return sameKindSimilarities(
    records,
    normalize,
    (left, right) => left.siteKey !== right.siteKey,
  );
}

export function withinSiteSameKindSimilarities(records, normalize) {
  return sameKindSimilarities(
    records,
    normalize,
    (left, right) => left.siteKey === right.siteKey,
  );
}

export function stripHtml(value) {
  return cleanText(
    decodeHtmlEntities(
      String(value ?? "")
        .replace(SCRIPT_STYLE_PATTERN, " ")
        .replace(TAG_PATTERN, " "),
    ),
  );
}

export function extractVisibleBlocks(html) {
  const withoutScripts = String(html ?? "").replace(SCRIPT_STYLE_PATTERN, " ");
  return [...withoutScripts.matchAll(BLOCK_TAG_PATTERN)]
    .map((match) => stripHtml(match[2] ?? ""))
    .filter(Boolean);
}

function documentFrequency(blockLists) {
  const frequency = new Map();
  for (const blocks of blockLists) {
    for (const block of new Set(blocks)) {
      frequency.set(block, (frequency.get(block) ?? 0) + 1);
    }
  }
  return frequency;
}

function repeatedCharacterShare(blocks, frequency) {
  let total = 0;
  let repeated = 0;
  for (const block of blocks) {
    const length = block.replace(/\s/gu, "").length;
    total += length;
    if ((frequency.get(block) ?? 0) > 1) repeated += length;
  }
  return total === 0 ? 0 : repeated / total;
}

function repeatedTextBlockCharacterShares(records, normalize, getBlocks) {
  const exactBlocks = records.map((record) => getBlocks(record));
  const normalizedBlocks = exactBlocks.map((blocks) => blocks.map(normalize));
  const exactFrequency = documentFrequency(exactBlocks);
  const normalizedFrequency = documentFrequency(normalizedBlocks);
  return records.map((record, index) => ({
    siteKey: record.siteKey,
    path: record.path,
    kind: record.kind,
    exact: repeatedCharacterShare(exactBlocks[index], exactFrequency),
    normalized: repeatedCharacterShare(
      normalizedBlocks[index],
      normalizedFrequency,
    ),
  }));
}

export function primaryNarrativeRepeatedCharacterShares(records, normalize) {
  return repeatedTextBlockCharacterShares(
    records,
    normalize,
    (record) => recordPrimaryNarrativeBlocks(record),
  );
}

export function renderedRepeatedCharacterShares(renderedRecords, normalize) {
  return repeatedTextBlockCharacterShares(
    renderedRecords,
    normalize,
    (record) => extractVisibleBlocks(record.html),
  );
}

function sectionHtml(html, className) {
  const pattern = new RegExp(
    `<section\\b[^>]*class=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/section>`,
    "iu",
  );
  return pattern.exec(String(html ?? ""))?.[1] ?? "";
}

function classCount(html, className) {
  const pattern = new RegExp(
    `class=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["']`,
    "giu",
  );
  return [...String(html ?? "").matchAll(pattern)].length;
}

export function leafCommonBlockSignatures(html) {
  const pricing = sectionHtml(html, "pricing-preview");
  const process = sectionHtml(html, "process-section");
  const faq = sectionHtml(html, "faq-section");
  const standards = sectionHtml(html, "standards-section");
  const pricingCardCount = classCount(pricing, "pricing-card");
  const pricingRowCount = [...pricing.matchAll(/<dt\b/giu)].length;
  const processStepCount = [...process.matchAll(/<li\b/giu)].length;
  const faqItemCount = [...faq.matchAll(/<details\b/giu)].length;
  const standardsItemCount = [...standards.matchAll(/<article\b/giu)].length;
  return {
    pricingCardCount,
    pricingRowCount,
    processStepCount,
    faqItemCount,
    standardsItemCount,
    fullPricing: pricingCardCount >= 5 || pricingRowCount >= 14,
    fullPricingTable: pricingRowCount >= 14,
    fullProcess: processStepCount >= 5,
    fullFaq: faqItemCount >= 7,
    fullStandards: standardsItemCount >= 6,
  };
}

export function extractInternalHrefs(html) {
  return [
    ...String(html ?? "")
      .replace(SCRIPT_STYLE_PATTERN, " ")
      .matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/giu),
  ]
    .map((match) => decodeHtmlEntities(match[1] ?? ""))
    .filter((href) => href.startsWith("/") && !href.startsWith("//"));
}

export function contextualInternalHrefs(html, currentPath) {
  const generic = new Set([
    "/pricing/",
    "/guide/",
    "/notice/",
    "/blog/",
    "/sitemap.xml",
    "/rss.xml",
  ]);
  return [
    ...new Set(
      extractInternalHrefs(html).filter(
        (href) => href !== currentPath && !generic.has(href),
      ),
    ),
  ];
}

export function verifiedLeafFactCount(content) {
  return new Set(
    (content.sections ?? [])
      .filter(
        (section) =>
          VERIFIED_LEAF_FACT_SECTION_IDS.has(section.id) &&
          cleanText(section.heading) &&
          (section.paragraphs ?? []).some((paragraph) => cleanText(paragraph)),
      )
      .map((section) => section.id),
  ).size;
}

export function indexEligibilityContractFailures(records) {
  return records.flatMap((record) => {
      const reasons = [];
      if (record.indexEligible === false) {
        if (record.kind === "home") reasons.push("HOME_ROUTE_EXCLUSION");
        if (record.routeRobotsIndex !== false) {
          reasons.push("INELIGIBLE_ROUTE_NOT_NOINDEX");
        }
        const expectedDeferredReason =
          record.kind === "district"
            ? "deferred-district-route"
            : "deferred-regional-route";
        if (record.indexEligibilityReason !== expectedDeferredReason) {
          reasons.push("INVALID_INDEX_ELIGIBILITY_REASON");
        }
        if (
          !cleanText(record.indexEligibilityTargetPath).startsWith("/") ||
          record.indexEligibilityTargetPath === record.path ||
          (record.parentPath &&
            record.indexEligibilityTargetPath !== record.parentPath)
        ) {
          reasons.push("INVALID_INDEX_ELIGIBILITY_TARGET");
        }
        if (record.indexEligibilityTargetLinked !== true) {
          reasons.push("INDEX_ELIGIBILITY_TARGET_NOT_LINKED");
        }
      } else {
        const expectedReason = record.kind === "home" ? "city-home" : null;
        if (record.kind !== "home") reasons.push("NON_HOME_ROUTE_INDEXABLE");
        if (expectedReason && record.indexEligibilityReason !== expectedReason) {
          reasons.push("INVALID_INDEX_ELIGIBILITY_REASON");
        }
        if (record.indexEligibilityTargetPath !== null) {
          reasons.push("ELIGIBLE_ROUTE_HAS_FALLBACK_TARGET");
        }
      }
      return reasons.length > 0
        ? [{ siteKey: record.siteKey, path: record.path, reasons }]
        : [];
    });
}

export function cityHomeProvenanceFailures(records) {
  return records
    .filter(
      (record) =>
        record.kind === "home" && record.indexEligible !== false,
    )
    .flatMap((record) => {
      const provenance = record.cityFactProvenance;
      const reasons = [];
      if (!provenance) {
        reasons.push("MISSING_CITY_FACT_PROVENANCE");
      } else {
        if (provenance.checkedAt !== "2026-08-19") {
          reasons.push("STALE_CITY_FACT_PROVENANCE");
        }
        if (
          provenance.sourceCount < 1 ||
          provenance.sourceUrls.length !== provenance.sourceCount ||
          provenance.sourceLabels.length !== provenance.sourceCount
        ) {
          reasons.push("CITY_FACT_SOURCE_COUNT");
        }
        if (
          provenance.sourceLabels.some((label) => !cleanText(label)) ||
          provenance.sourceUrls.some((value) => {
            try {
              const url = new URL(value);
              return (
                url.protocol !== "https:" ||
                url.username.length > 0 ||
                url.password.length > 0
              );
            } catch {
              return true;
            }
          })
        ) {
          reasons.push("INVALID_CITY_FACT_SOURCE");
        }
        if (provenance.factSectionCount !== 4) {
          reasons.push("CITY_FACT_SECTION_COUNT");
        }
        if (provenance.renderedFactBlocksVerified !== true) {
          reasons.push("CITY_FACT_NOT_RENDERED");
        }
      }
      return reasons.length > 0
        ? [{ siteKey: record.siteKey, path: record.path, reasons }]
        : [];
    });
}

export function eligibilitySelectionContractFailures(records) {
  const leaves = records.filter((record) => record.kind === "representative");
  const failures = [];
  const selectedGroups = new Map();
  for (const record of leaves.filter((candidate) => candidate.indexEligible !== false)) {
    const groupKey =
      record.indexEligibilityReason === "richest-city-leaf"
        ? `city:${record.siteKey}`
        : record.indexEligibilityReason === "richest-local-type"
          ? `type:${record.siteKey}:${record.localType}`
          : null;
    if (!groupKey) continue;
    const group = leaves.filter((candidate) =>
      groupKey.startsWith("city:")
        ? candidate.siteKey === record.siteKey
        : candidate.siteKey === record.siteKey &&
          candidate.localType === record.localType,
    );
    const expected = [...group].sort(
      (left, right) =>
        (right.eligibilityEvidenceScore ?? Number.NEGATIVE_INFINITY) -
          (left.eligibilityEvidenceScore ?? Number.NEGATIVE_INFINITY) ||
        (left.routeOrdinal ?? Number.POSITIVE_INFINITY) -
          (right.routeOrdinal ?? Number.POSITIVE_INFINITY),
    )[0];
    const selected = selectedGroups.get(groupKey) ?? [];
    selected.push(record);
    selectedGroups.set(groupKey, selected);
    const reasons = [];
    if (!Number.isFinite(record.eligibilityEvidenceScore)) {
      reasons.push("MISSING_ELIGIBILITY_EVIDENCE_SCORE");
    }
    if (!cleanText(record.localType)) reasons.push("MISSING_LOCAL_TYPE");
    if (!expected || expected.path !== record.path) {
      reasons.push("ELIGIBLE_LEAF_NOT_FACT_RICHEST");
    }
    if (reasons.length > 0) {
      failures.push({
        siteKey: record.siteKey,
        path: record.path,
        groupKey,
        expectedPath: expected?.path ?? null,
        reasons,
      });
    }
  }
  for (const [groupKey, selected] of selectedGroups) {
    if (selected.length > 1) {
      failures.push({
        groupKey,
        records: selected.map((record) => `${record.siteKey}:${record.path}`),
        reasons: ["MULTIPLE_RICHEST_LEAVES_SELECTED"],
      });
    }
  }
  return failures;
}

export function renderedHeadingQualityFailures(records) {
  return records.flatMap((record) => {
    const headings = (record.renderedH2Texts ?? []).map(cleanText);
    const duplicates = duplicateGroups(headings).map((group) => group.value);
    const placeholders = headings.filter((heading) =>
      /^(?:안내|정보|확인|제목|section|heading|h2|\d+)$/iu.test(heading),
    );
    const reasons = [];
    if (headings.length !== (record.renderedH2Count ?? headings.length)) {
      reasons.push("EMPTY_RENDERED_H2");
    }
    if (duplicates.length > 0) reasons.push("DUPLICATE_RENDERED_H2");
    if (placeholders.length > 0) reasons.push("PLACEHOLDER_RENDERED_H2");
    return reasons.length > 0
      ? [{
          siteKey: record.siteKey,
          path: record.path,
          reasons,
          duplicates: duplicates.slice(0, 8),
          placeholders: placeholders.slice(0, 8),
        }]
      : [];
  });
}

function compactPair(pair) {
  return {
    left: pair.left,
    right: pair.right,
    kind: pair.kind,
    similarity: Number(pair.similarity.toFixed(6)),
  };
}

export function evaluateFixedPageDuplication(fixedRecords, normalize) {
  const expectedPaths = ["/pricing/", "/guide/", "/notice/"];
  const groupsFor = (getValue, transform = (value) => value) => {
    const values = fixedRecords.map((record) =>
      `${record.path}\u0000${getValue(record)}`,
    );
    return duplicateIndexGroups(values, transform);
  };
  const visibleText = fixedRecords.map((record) => stripHtml(record.html));
  const exactSignatures = fixedRecords.map((record) =>
    cleanText(
      [
        record.metaTitle,
        record.description,
        record.h1,
        ...(record.surroundingBlocks ?? []),
      ].join("\u001f"),
    ),
  );
  const normalizedSurroundingSignatures = exactSignatures.map(normalize);
  const byteGroups = groupsFor((record) => record.html);
  const textGroups = groupsFor(
    (record) => visibleText[fixedRecords.indexOf(record)],
  );
  const signatureGroups = groupsFor(
    (record) => exactSignatures[fixedRecords.indexOf(record)],
  );
  const normalizedSignatureGroups = groupsFor(
    (record) => normalizedSurroundingSignatures[fixedRecords.indexOf(record)],
  );
  const surroundingShares = repeatedTextBlockCharacterShares(
    fixedRecords,
    normalize,
    (record) => [
      record.metaTitle,
      record.description,
      record.h1,
      ...(record.surroundingBlocks ?? []),
    ].map(cleanText),
  );
  const routeCounts = Object.fromEntries(
    expectedPaths.map((path) => [
      path,
      fixedRecords.filter((record) => record.path === path).length,
    ]),
  );
  const failures = [];
  if (fixedRecords.length !== 81) failures.push("FIXED_DOCUMENT_COUNT");
  if (Object.values(routeCounts).some((count) => count !== 27)) {
    failures.push("FIXED_ROUTE_SITE_COUNT");
  }
  const groupExamples = (groups) =>
    groups.slice(0, 8).map((indexes) =>
      indexes.map((index) => ({
        siteKey: fixedRecords[index].siteKey,
        path: fixedRecords[index].path,
      })),
    );
  return {
    status: failures.length === 0 ? "PASS" : "FAIL",
    counts: {
      documents: fixedRecords.length,
      routeCounts,
    },
    exactCollisions: {
      byteDocumentGroups: byteGroups.length,
      visibleTextGroups: textGroups.length,
      surroundingSignatureGroups: signatureGroups.length,
      examples: {
        byteDocument: groupExamples(byteGroups),
        visibleText: groupExamples(textGroups),
        surroundingSignature: groupExamples(signatureGroups),
      },
    },
    diagnostics: {
      note:
        "Fixed routes are staged noindex; exact and normalized copy collisions are diagnostic while route discovery is hard-gated separately.",
      brandRegionNormalizedSurroundingCollisionGroups:
        normalizedSignatureGroups.length,
      normalizedCollisionExamples: groupExamples(normalizedSignatureGroups),
      surroundingRepeatedCharacterShare: {
        exact: summarizeNumbers(surroundingShares.map((record) => record.exact)),
        normalized: summarizeNumbers(
          surroundingShares.map((record) => record.normalized),
        ),
      },
    },
    failures,
  };
}

export function evaluateStagedRouteContract(stagedRecords) {
  const routeCounts = new Map();
  const failures = [];
  for (const record of stagedRecords) {
    const family = /^\/blog\/[^/]+\/$/u.test(record.path)
      ? "/blog/:slug/"
      : record.path;
    routeCounts.set(family, (routeCounts.get(family) ?? 0) + 1);
    const reasons = [];
    if (record.staticRenderPass !== true) reasons.push("STATIC_RENDER_FAILURE");
    if (record.selfCanonicalPass !== true) reasons.push("NON_SELF_CANONICAL");
    if (record.previewContractPass !== true) {
      reasons.push("PREVIEW_GLOBAL_NOINDEX_CONTRACT");
    }
    if (record.routeRobotsIndex !== false || record.routeRobotsFollow !== true) {
      reasons.push("PUBLIC_STAGED_ROUTE_ROBOTS");
    }
    if (record.sitemapPresent === true) reasons.push("STAGED_ROUTE_IN_SITEMAP");
    if (reasons.length > 0) {
      failures.push({ siteKey: record.siteKey, path: record.path, reasons });
    }
  }
  const expected = new Map([
    ["/areas/", 27],
    ["/pricing/", 27],
    ["/guide/", 27],
    ["/notice/", 27],
    ["/blog/", 27],
    ["/blog/:slug/", 54],
  ]);
  for (const [family, count] of expected) {
    if (routeCounts.get(family) !== count) {
      failures.push({
        family,
        expected: count,
        actual: routeCounts.get(family) ?? 0,
        reasons: ["STAGED_ROUTE_FAMILY_COUNT"],
      });
    }
  }
  if (stagedRecords.length !== 189) {
    failures.push({
      expected: 189,
      actual: stagedRecords.length,
      reasons: ["STAGED_ROUTE_DOCUMENT_COUNT"],
    });
  }
  return {
    status: failures.length === 0 ? "PASS" : "FAIL",
    counts: {
      documents: stagedRecords.length,
      routeFamilies: Object.fromEntries(routeCounts),
    },
    failures,
  };
}

export function evaluateCrossPlatformCopyAuditBoundary(report) {
  const failures = [];
  if (report.authoritativeRepositoryCount !== 8) {
    failures.push("AUTHORITATIVE_REPOSITORY_COUNT");
  }
  if (report.targetSiteCount !== 27 || report.targetRegionalRouteCount !== 455) {
    failures.push("TARGET_CORPUS_COUNT");
  }
  if (report.targetBlogPostCount !== 54) failures.push("TARGET_BLOG_COUNT");
  for (const [field, code] of [
    ["exactMetaTitleCollisions", "EXACT_META_TITLE_COLLISION"],
    ["exactDescriptionCollisions", "EXACT_DESCRIPTION_COLLISION"],
    ["exactH1Collisions", "EXACT_H1_COLLISION"],
    ["exactSignatureCollisions", "EXACT_DOCUMENT_SIGNATURE_COLLISION"],
  ]) {
    if (report[field] !== 0) failures.push(code);
  }
  if (report.officialSuffixLeakCount !== 0) failures.push("OFFICIAL_SUFFIX_LEAK");
  const externalEntries = Object.values(report.comparisons ?? {});
  if (
    externalEntries.length !== 8 ||
    externalEntries.some(
      (comparison) =>
        comparison.substantiveExactCollisions.count !== 0 ||
        comparison.brandRegionNormalizedCollisions.count !== 0,
    )
  ) {
    failures.push("EXTERNAL_PLATFORM_COPY_COLLISION");
  }
  return {
    status: failures.length === 0 ? "PASS" : "FAIL",
    failures,
    diagnostics: {
      note:
        "Brand/region/number-normalized internal collisions are diagnostic; exact uniqueness and eligible rendered near-duplicate gates are authoritative.",
      normalizedMetaTitleCollisions:
        report.normalizedMetaTitleCollisions ?? null,
      normalizedDescriptionCollisions:
        report.normalizedDescriptionCollisions ?? null,
      normalizedH1Collisions: report.normalizedH1Collisions ?? null,
      normalizedSignatureCollisions:
        report.normalizedSignatureCollisions ?? null,
      normalizedParagraphCollisions:
        report.normalizedParagraphCollisions ?? null,
      normalizedParagraphCollisionEnforcement:
        "DIAGNOSTIC_REPLACED_BY_NEAR_DUPLICATE_REPEATED_SHARE_GATE",
    },
  };
}

export function evaluateNaverNearDuplicateGate({
  records,
  renderedRecords,
  fixedRecords = [],
  stagedRecords = [],
  normalize,
  selectionSourceContract = { status: "PASS", violations: [] },
  stagedIndexingSourceContract = { status: "PASS", violations: [] },
}) {
  const thresholds = NAVER_NEAR_DUPLICATE_THRESHOLDS;
  const exactDocuments = records.map((record) =>
    primaryContentText(record),
  );
  const normalizedDocuments = exactDocuments.map(normalize);
  const exactTitles = records.map((record) => record.content.title);
  const normalizedTitles = exactTitles.map(normalize);
  const exactDescriptions = records.map((record) => record.content.description);
  const normalizedDescriptions = exactDescriptions.map(normalize);
  const exactH1s = records.map((record) => record.content.h1);
  const normalizedH1s = exactH1s.map(normalize);
  const indexEligibleRecords = records.filter(
    (record) => record.indexEligible !== false,
  );
  const ineligibleRecords = records.filter(
    (record) => record.indexEligible === false,
  );
  const eligibleRegionalInventory = indexEligibleRecords
    .map((record) => `${record.siteKey}:${record.path}`)
    .sort();
  const eligibleRegionalInventorySha256 = digestText(
    eligibleRegionalInventory.join("\n"),
  );
  const eligibleHomeCountsBySite = new Map();
  for (const record of indexEligibleRecords) {
    if (record.kind !== "home" || record.path !== "/") continue;
    eligibleHomeCountsBySite.set(
      record.siteKey,
      (eligibleHomeCountsBySite.get(record.siteKey) ?? 0) + 1,
    );
  }
  const indexableInventoryFailures = [];
  if (
    indexEligibleRecords.length !== INITIAL_INDEXABLE_REGIONAL_INVENTORY.count
  ) {
    indexableInventoryFailures.push("INDEXABLE_REGIONAL_DOCUMENT_COUNT");
  }
  if (
    eligibleHomeCountsBySite.size !== INITIAL_INDEXABLE_REGIONAL_INVENTORY.count ||
    [...eligibleHomeCountsBySite.values()].some((count) => count !== 1) ||
    indexEligibleRecords.some(
      (record) => record.kind !== "home" || record.path !== "/",
    )
  ) {
    indexableInventoryFailures.push("CITY_HOME_ONLY_INDEXABLE_INVENTORY");
  }
  if (
    eligibleRegionalInventorySha256 !==
    INITIAL_INDEXABLE_REGIONAL_INVENTORY.sha256
  ) {
    indexableInventoryFailures.push("INDEXABLE_REGIONAL_INVENTORY_SHA256");
  }
  const crossSiteSimilarities = crossSiteSameKindSimilarities(
    indexEligibleRecords,
    normalize,
  );
  const withinSiteSimilarities = withinSiteSameKindSimilarities(
    indexEligibleRecords,
    normalize,
  );
  const crossSiteSimilaritySummary = summarizeNumbers(
    crossSiteSimilarities.map((pair) => pair.similarity),
  );
  const withinSiteSimilaritySummary = summarizeNumbers(
    withinSiteSimilarities.map((pair) => pair.similarity),
  );
  const repeatedShares = primaryNarrativeRepeatedCharacterShares(
    indexEligibleRecords,
    normalize,
  );
  const exactRepeatedSummary = summarizeNumbers(
    repeatedShares.map((record) => record.exact),
  );
  const normalizedRepeatedSummary = summarizeNumbers(
    repeatedShares.map((record) => record.normalized),
  );
  const fullRenderedRepeatedShares = renderedRepeatedCharacterShares(
    renderedRecords,
    normalize,
  );
  const fullRenderedExactSummary = summarizeNumbers(
    fullRenderedRepeatedShares.map((record) => record.exact),
  );
  const fullRenderedNormalizedSummary = summarizeNumbers(
    fullRenderedRepeatedShares.map((record) => record.normalized),
  );
  const renderedByKey = new Map(
    renderedRecords.map((record) => [`${record.siteKey}:${record.path}`, record]),
  );
  const fixedPages = evaluateFixedPageDuplication(fixedRecords, normalize);
  const stagedRoutes = evaluateStagedRouteContract(stagedRecords);
  const contentH2CountSummary = summarizeNumbers(
    records.map((record) => record.content.sections.length),
  );
  const renderedH2CountSummary = summarizeNumbers(
    records.map((record) => record.renderedH2Count ?? 0),
  );
  const indexEligibilityFailures = indexEligibilityContractFailures(records);
  const homeFactProvenanceFailures = cityHomeProvenanceFailures(records);
  const eligibilitySelectionFailures =
    eligibilitySelectionContractFailures(records);
  const factProfileFailures = factProfileSelectionFailures(records, normalize);
  const renderedHeadingFailures = renderedHeadingQualityFailures(records);
  const routeDiscoveryFailures = records.flatMap((record) => {
    const reasons = [];
    if (record.staticRenderPass !== true) reasons.push("STATIC_RENDER_FAILURE");
    if (record.selfCanonicalPass !== true) reasons.push("NON_SELF_CANONICAL");
    if (record.indexEligible === false) {
      if (record.routeRobotsIndex !== false || record.routeRobotsFollow !== true) {
        reasons.push("PUBLIC_INELIGIBLE_ROBOTS");
      }
      if (record.sitemapPresent === true) {
        reasons.push("INELIGIBLE_ROUTE_IN_SITEMAP");
      }
    } else {
      if (record.routeRobotsIndex !== true || record.routeRobotsFollow !== true) {
        reasons.push("PUBLIC_ELIGIBLE_ROBOTS");
      }
      if (record.sitemapPresent !== true) {
        reasons.push("ELIGIBLE_ROUTE_MISSING_FROM_SITEMAP");
      }
    }
    return reasons.length > 0
      ? [{ siteKey: record.siteKey, path: record.path, reasons }]
      : [];
  });
  const customerVisibleRecords = [
    ...records.map((record) => {
      const rendered = renderedByKey.get(`${record.siteKey}:${record.path}`);
      return {
        siteKey: record.siteKey,
        path: record.path,
        visibleBlocks: rendered
          ? extractVisibleBlocks(rendered.html)
          : recordPrimaryNarrativeBlocks(record),
      };
    }),
    ...stagedRecords.map((record) => ({
      siteKey: record.siteKey,
      path: record.path,
      visibleBlocks: extractVisibleBlocks(record.html),
    })),
  ];
  const antiFillerFailures = customerVisibleRecords.flatMap((record) => {
    const visibleBlocks = record.visibleBlocks;
    const matches = visibleBlocks.flatMap((block) =>
      ARTIFICIAL_EDITORIAL_FILLER_PATTERNS.flatMap((pattern) =>
        pattern.test(block)
          ? [{ pattern: pattern.source, text: block.slice(0, 240) }]
          : [],
      ),
    );
    return matches.length > 0
      ? [{ siteKey: record.siteKey, path: record.path, matches: matches.slice(0, 8) }]
      : [];
  });
  const technicalFillerFailures = customerVisibleRecords.flatMap((record) => {
    const visibleBlocks = record.visibleBlocks;
    const matches = visibleBlocks.flatMap((block) =>
      CUSTOMER_FACING_TECHNICAL_FILLER_PATTERNS.flatMap((pattern) =>
        pattern.test(block)
          ? [{ pattern: pattern.source, text: block.slice(0, 240) }]
          : [],
      ),
    );
    return matches.length > 0
      ? [{ siteKey: record.siteKey, path: record.path, matches: matches.slice(0, 8) }]
      : [];
  });

  const leafFailures = records
    .filter(
      (record) =>
        record.kind === "representative" && record.indexEligible !== false,
    )
    .flatMap((record) => {
      const rendered = renderedByKey.get(`${record.siteKey}:${record.path}`);
      if (!rendered) {
        return [{ siteKey: record.siteKey, path: record.path, reason: "MISSING_RENDER" }];
      }
      const signatures = leafCommonBlockSignatures(rendered.html);
      const verifiedFacts = verifiedLeafFactCount(record.content);
      const contextualLinks = contextualInternalHrefs(
        rendered.html,
        record.path,
      ).length;
      const requiredContextualLinks = Math.min(
        thresholds.minimumContextualLinksWhereAvailable,
        rendered.availableContextualLinkCount ??
          thresholds.minimumContextualLinksWhereAvailable,
      );
      const reasons = [];
      if (
        signatures.fullPricing ||
        signatures.fullProcess ||
        signatures.fullFaq ||
        signatures.fullStandards
      ) {
        reasons.push("FULL_SHARED_SERVICE_BLOCK");
      }
      if (verifiedFacts < thresholds.minimumLeafVerifiedRegionFacts) {
        reasons.push("VERIFIED_REGION_FACTS");
      }
      if (contextualLinks < requiredContextualLinks) {
        reasons.push("CONTEXTUAL_LINKS");
      }
      return reasons.length
        ? [
            {
              siteKey: record.siteKey,
              path: record.path,
              reasons,
              signatures,
              verifiedFacts,
              contextualLinks,
              requiredContextualLinks,
            },
          ]
        : [];
    });

  const regionalSharedDetailFailures = records.flatMap((record) => {
    const rendered = renderedByKey.get(`${record.siteKey}:${record.path}`);
    if (!rendered) return [];
    const signatures = leafCommonBlockSignatures(rendered.html);
    const reasons = [];
    if (
      (record.kind === "home" || record.kind === "district") &&
      signatures.fullPricingTable
    ) {
      reasons.push("FULL_14_ROW_PRICING_OUTSIDE_FIXED_ROUTE");
    }
    if (
      (record.kind === "home" || record.kind === "district") &&
      signatures.fullFaq
    ) {
      reasons.push("FULL_7_ITEM_FAQ_OUTSIDE_FIXED_ROUTE");
    }
    return reasons.length
      ? [{ siteKey: record.siteKey, path: record.path, reasons, signatures }]
      : [];
  });

  const structuralFailures = records.flatMap((record) => {
    const sectionCount = record.content.sections.length;
    const lastSectionId = record.content.sections.at(-1)?.id ?? "";
    const reasons = [];
    if (
      sectionCount < thresholds.minimumContentSections ||
      sectionCount > thresholds.maximumContentSections
    ) {
      reasons.push("REGIONAL_CONTENT_H2_COUNT");
    }
    if (!/directory$/u.test(lastSectionId)) reasons.push("DIRECTORY_NOT_LAST");
    if (record.h1Count !== 1) reasons.push("H1_COUNT");
    if (record.metaContractPass !== true) reasons.push("META_CONTRACT");
    if (record.primaryBlocksVerified !== true) {
      reasons.push("PRIMARY_BLOCK_NOT_RENDERED");
    }
    if (record.shortLabelLeak === true) reasons.push("OFFICIAL_SUFFIX_LEAK");
    if (record.previewContractPass !== true) reasons.push("PREVIEW_CONTRACT");
    return reasons.length
      ? [{ siteKey: record.siteKey, path: record.path, reasons }]
      : [];
  });

  const collisionReport = {
    exactDocument: duplicateGroups(exactDocuments).length,
    normalizedDocument: duplicateGroups(normalizedDocuments).length,
    exactTitle: duplicateGroups(exactTitles).length,
    normalizedTitle: duplicateGroups(normalizedTitles).length,
    exactDescription: duplicateGroups(exactDescriptions).length,
    normalizedDescription: duplicateGroups(normalizedDescriptions).length,
    exactH1: duplicateGroups(exactH1s).length,
    normalizedH1: duplicateGroups(normalizedH1s).length,
  };
  const worstCrossSitePairs = [...crossSiteSimilarities]
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, 12)
    .map(compactPair);
  const worstWithinSitePairs = [...withinSiteSimilarities]
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, 12)
    .map(compactPair);
  const repeatedFailures = repeatedShares
    .filter(
      (record) =>
        record.exact > thresholds.repeatedBlockCharacterShare.exactMaximum ||
        record.normalized >
          thresholds.repeatedBlockCharacterShare.normalizedMaximum,
    )
    .sort(
      (left, right) =>
        right.normalized - left.normalized || right.exact - left.exact,
    )
    .slice(0, 20)
    .map((record) => ({
      ...record,
      exact: Number(record.exact.toFixed(6)),
      normalized: Number(record.normalized.toFixed(6)),
    }));

  const failures = [];
  if (records.length !== 455) failures.push("REGIONAL_DOCUMENT_COUNT");
  if (renderedRecords.length !== 455) failures.push("RENDERED_DOCUMENT_COUNT");
  if (
    [
      collisionReport.exactDocument,
      collisionReport.exactTitle,
      collisionReport.exactDescription,
      collisionReport.exactH1,
    ].some((count) => count !== 0)
  ) {
    failures.push("EXACT_COLLISION");
  }
  if (
    crossSiteSimilaritySummary.p95 >=
    thresholds.primaryContent.percentileExclusiveMaximum
  ) {
    failures.push("PRIMARY_CONTENT_P95_SIMILARITY");
  }
  if (
    crossSiteSimilaritySummary.maximum >=
    thresholds.primaryContent.pairExclusiveMaximum
  ) {
    failures.push("PRIMARY_CONTENT_MAX_SIMILARITY");
  }
  if (
    withinSiteSimilaritySummary.p95 >=
    thresholds.primaryContent.percentileExclusiveMaximum
  ) {
    failures.push("WITHIN_SITE_PRIMARY_CONTENT_P95_SIMILARITY");
  }
  if (
    withinSiteSimilaritySummary.maximum >=
    thresholds.primaryContent.pairExclusiveMaximum
  ) {
    failures.push("WITHIN_SITE_PRIMARY_CONTENT_MAX_SIMILARITY");
  }
  if (
    exactRepeatedSummary.maximum >
      thresholds.repeatedBlockCharacterShare.exactMaximum ||
    normalizedRepeatedSummary.maximum >
      thresholds.repeatedBlockCharacterShare.normalizedMaximum
  ) {
    failures.push("REPEATED_BLOCK_CHARACTER_SHARE");
  }
  if (leafFailures.length > 0) failures.push("LEAF_RELEASE_CONTRACT");
  if (regionalSharedDetailFailures.length > 0) {
    failures.push("REGIONAL_SHARED_DETAIL_CONTRACT");
  }
  if (structuralFailures.length > 0) failures.push("SEO_STRUCTURE_CONTRACT");
  if (fixedPages.status !== "PASS") failures.push("FIXED_PAGE_CORPUS_CONTRACT");
  if (antiFillerFailures.length > 0) failures.push("ARTIFICIAL_EDITORIAL_FILLER");
  if (technicalFillerFailures.length > 0) {
    failures.push("CUSTOMER_FACING_TECHNICAL_FILLER");
  }
  if (indexEligibilityFailures.length > 0) {
    failures.push("INDEX_ELIGIBILITY_CONTRACT");
  }
  if (indexableInventoryFailures.length > 0) {
    failures.push("INDEXABLE_INVENTORY_CONTRACT");
  }
  if (homeFactProvenanceFailures.length > 0) {
    failures.push("CITY_HOME_FACT_PROVENANCE_CONTRACT");
  }
  if (eligibilitySelectionFailures.length > 0) {
    failures.push("INDEX_ELIGIBILITY_SELECTION_CONTRACT");
  }
  if (routeDiscoveryFailures.length > 0) {
    failures.push("ROUTE_DISCOVERY_CONTRACT");
  }
  if (selectionSourceContract.status !== "PASS") {
    failures.push("FACT_DERIVED_COPY_SELECTION_SOURCE_CONTRACT");
  }
  if (factProfileFailures.length > 0) {
    failures.push("FACT_PROFILE_COPY_SELECTION_CONTRACT");
  }
  if (renderedHeadingFailures.length > 0) {
    failures.push("RENDERED_HEADING_QUALITY_CONTRACT");
  }
  if (stagedRoutes.status !== "PASS") {
    failures.push("STAGED_ROUTE_DISCOVERY_CONTRACT");
  }
  if (stagedIndexingSourceContract.status !== "PASS") {
    failures.push("STAGED_INDEXING_SOURCE_CONTRACT");
  }

  return {
    schemaVersion: 1,
    status: failures.length === 0 ? "PASS" : "FAIL",
    note:
      "Similarity thresholds are an internal release heuristic, not a published NAVER ranking threshold.",
    thresholds,
    counts: {
      regionalDocuments: records.length,
      renderedDocuments: renderedRecords.length,
      indexEligibleRegionalDocuments: indexEligibleRecords.length,
      ineligibleRegionalDocuments: ineligibleRecords.length,
      ineligibleLeafDocuments: ineligibleRecords.filter(
        (record) => record.kind === "representative",
      ).length,
      desiredRegionalSitemapDocuments: records.filter(
        (record) => record.sitemapPresent === true,
      ).length,
      crossSiteSameKindPairs: crossSiteSimilarities.length,
      withinSiteSameKindPairs: withinSiteSimilarities.length,
      leafDocuments: records.filter(
        (record) => record.kind === "representative",
      ).length,
      fixedDocuments: fixedRecords.length,
      stagedDocuments: stagedRecords.length,
      eligibleRegionalInventorySha256,
      cityHomeFactProvenanceSha256: digestText(
        indexEligibleRecords
          .flatMap((record) =>
            (record.cityFactProvenance?.sourceUrls ?? []).map(
              (url) => `${record.siteKey}:${url}`,
            ),
          )
          .sort()
          .join("\n"),
      ),
    },
    collisions: collisionReport,
    normalizedCollisionDiagnostic: {
      note:
        "Normalized collisions are diagnostic to avoid lexical rotation; exact identity and eligible rendered similarity are hard gates.",
      document: collisionReport.normalizedDocument,
      title: collisionReport.normalizedTitle,
      description: collisionReport.normalizedDescription,
      h1: collisionReport.normalizedH1,
    },
    primaryContentSimilarity: {
      crossSite: {
        ...Object.fromEntries(
          Object.entries(crossSiteSimilaritySummary).map(([key, value]) => [
            key,
            typeof value === "number" ? Number(value.toFixed(6)) : value,
          ]),
        ),
        worstPairs: worstCrossSitePairs,
      },
      withinSite: {
        ...Object.fromEntries(
          Object.entries(withinSiteSimilaritySummary).map(([key, value]) => [
            key,
            typeof value === "number" ? Number(value.toFixed(6)) : value,
          ]),
        ),
        worstPairs: worstWithinSitePairs,
      },
    },
    primaryNarrativeRepeatedBlockCharacterShare: {
      exact: exactRepeatedSummary,
      normalized: normalizedRepeatedSummary,
      failures: repeatedFailures,
    },
    fullRenderedRepeatedBlockCharacterShareDiagnostic: {
      note:
        "Diagnostic only: shared chrome and fixed operational facts are intentionally excluded from the 25%/35% hard gate.",
      exact: fullRenderedExactSummary,
      normalized: fullRenderedNormalizedSummary,
    },
    headingCounts: {
      regionalContentH2HardGate: contentH2CountSummary,
      renderedH2Diagnostic: renderedH2CountSummary,
      renderedHeadingQualityFailures: renderedHeadingFailures.slice(0, 30),
    },
    leafFailures: leafFailures.slice(0, 30),
    regionalSharedDetailFailures: regionalSharedDetailFailures.slice(0, 30),
    structuralFailures: structuralFailures.slice(0, 30),
    fixedPages,
    stagedRoutes,
    stagedIndexingSource: stagedIndexingSourceContract,
    antiFillerFailureCount: antiFillerFailures.length,
    antiFillerFailures: antiFillerFailures.slice(0, 30),
    technicalFillerFailureCount: technicalFillerFailures.length,
    technicalFillerFailures: technicalFillerFailures.slice(0, 30),
    indexEligibilityFailures: indexEligibilityFailures.slice(0, 30),
    indexableInventoryFailures,
    homeFactProvenanceFailures: homeFactProvenanceFailures.slice(0, 30),
    eligibilitySelectionFailures: eligibilitySelectionFailures.slice(0, 30),
    routeDiscoveryFailures: routeDiscoveryFailures.slice(0, 30),
    factDerivedCopySelection: {
      source: selectionSourceContract,
      factProfileFailureCount: factProfileFailures.length,
      factProfileFailures: factProfileFailures.slice(0, 30),
      similarityOrderPolicy:
        "Semantic block identifiers are canonicalized; presentation order does not reduce similarity.",
    },
    failures,
  };
}

export function assertNaverNearDuplicateGate(report) {
  if (report.status !== "PASS") {
    const error = new Error(
      `BABY_NAVER_NEAR_DUPLICATE_GATE_FAILED:${report.failures.join(",")}`,
    );
    error.report = report;
    throw error;
  }
  return report;
}
