import { createHash } from "node:crypto";
import ts from "typescript";
import {
  SHARED_SERVICE_SECTION_IDS,
  sharedServiceContractFailures,
} from "./shared-service-copy-contract.mjs";

export const NAVER_NEAR_DUPLICATE_THRESHOLDS = Object.freeze({
  primaryContent: Object.freeze({
    crossSite: Object.freeze({
      percentile: 0.95,
      percentileMaximum: 0.45,
      pairMaximum: 0.55,
    }),
    withinSite: Object.freeze({
      percentile: 0.95,
      percentileMaximum: 0.45,
      pairMaximum: 0.55,
    }),
  }),
  repeatedBlockCharacterShare: Object.freeze({
    exactMaximum: 0.25,
    normalizedMaximum: 0.35,
  }),
  minimumLeafVerifiedRegionFacts: 3,
  minimumLocalSubstantiveSections: 3,
  minimumLocalSubstantiveParagraphs: 3,
  minimumLocalSubstantiveCharacters: 240,
  minimumContextualLinksWhereAvailable: 3,
  minimumContentSections: 10,
  maximumContentSections: 12,
});

export const FULL_INDEXABLE_REGIONAL_INVENTORY = Object.freeze({
  count: 455,
  sha256: "1c6e72e9614aae92347983a60fbf359e27aa792f8886c7cc2b02974192bf90f4",
});

export const CONTENT_AUDIT_SCOPES = Object.freeze(
  new Set(["shared-service", "local-substantive", "directory"]),
);

export const DIRECTORY_SECTION_IDS = Object.freeze(
  new Set(["child-directory", "related-region-directory"]),
);

const SHARED_SERVICE_SECTION_ID_SET = new Set(SHARED_SERVICE_SECTION_IDS);

export const ARTIFICIAL_EDITORIAL_FILLER_PATTERNS = Object.freeze([
  /\bEDITORIAL(?:\s+CUE)?\b/iu,
  /주소\s*장부/u,
  /주소표처럼/u,
  /(?:경계선|위치|순서|확인)\s*표식/u,
  /(?:일정|시간|주소|메모|확인|서로\s*다른|서로다른)\s*칸/u,
  /(?:첫째|둘째|셋째|넷째|다섯째|여섯째|일곱째|여덟째|아홉째|열째|다음)\s*(?:칸|갈래|묶음|줄|표식)/u,
  /가까운\s*기준/u,
  /주소가\s*아닌\s*현재\s*방문지/u,
  /목록(?:의|에서)?\s*(?:첫|마지막|앞|뒤)(?:째|쪽)?/u,
  /목록\s*(?:표시\s*)?순서/u,
  /(?:이전|다음)\s*(?:지역|구|동|읍|면|카드|링크)/u,
  /(?:목록|지역|주소)\s*끝/u,
  /(?:→|->)/u,
  /같은\s*단계에\s*놓인/u,
  /묶음\s*별칭\s*없이/u,
  /상위\s*목록의\s*다른\s*이름으로\s*남겨/u,
  /페이지\s*끝의?\s*주소\s*목록/u,
  /같은\s*가격표와\s*절차를\s*지역\s*본문마다\s*반복하지/u,
]);

export const CUSTOMER_FACING_TECHNICAL_FILLER_PATTERNS = Object.freeze([
  /시·군\s*서비스\s*루트/u,
  /구\s*단위\s*허브/u,
  /(?:동|읍|면)\s*단위\s*대표\s*경로/u,
  /(?:지역\s*)?(?:그래프|레코드|루트|허브)/u,
  /원천\s*(?:지역)?(?:명|명칭|별칭)/u,
  /원본\s*(?:행정\s*)?(?:자료|깊이)/u,
  /(?:밀도|분포|최댓값|최솟값|최대값|최소값|배수)(?=$|[\s,.:;!?])/u,
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

export const REGIONAL_ADMIN_UI_FILLER_PATTERNS = Object.freeze([
  /(?:지역|하위|개별)\s*카드/u,
  /카드\s*(?:이름|안|가운데)/u,
  /실제\s*지역\s*링크/u,
  /(?:상위|하위|지역)\s*목록/u,
  /행정\s*단계/u,
  /법정\s*표기/u,
  /공식\s*도시\s*안내/u,
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

export function normalizeRegionalRecordText(record, value, normalize) {
  const identityValues = [
    ...new Set(
      (record?.normalizationLabels ?? [])
        .map(cleanText)
        .filter(Boolean),
    ),
  ].sort((left, right) => right.length - left.length);
  const identityPattern = identityValues.length
    ? new RegExp(
        `(?:${identityValues.map(escapeRegExp).join("|")})(?=$|[\\s\\d.,·:;!?()[\\]{}|/~\-]|은|는|이|가|을|를|의|에|로|와|과|도|만|부터|까지|처럼|보다|출장|방문|지역|안내|페이지|주소|코스|마사지|안마)`,
        "gu",
      )
    : null;
  const identityNeutralized = identityPattern
    ? cleanText(value).replace(identityPattern, "{지역}")
    : value;
  return normalize(identityNeutralized);
}

export function primaryContentText(recordOrContent) {
  const blocks = recordOrContent?.content
    ? recordPrimaryNarrativeBlocks(recordOrContent)
    : primaryNarrativeBlocks(recordOrContent);
  return cleanText(blocks.join("\u001f"));
}

/**
 * Page-specific regional prose only. Shared, truthful operating copy such as
 * course/price, 24-hour phone booking, hygiene, on-site post-payment, and the
 * common primary-keyword heading contract is validated separately and must
 * not be forced through synonym rotation merely to lower similarity scores.
 */
export function regionalUniqueNarrativeBlocks(content) {
  return canonicalRegionalUniqueParagraphEntries(content.sections ?? []).map(
    (entry) => entry.paragraph,
  );
}

export function canonicalRegionalUniqueParagraphEntries(sections) {
  return (sections ?? [])
    .filter((section) => section.auditScope === "local-substantive")
    .flatMap((section) => {
      const sectionId = cleanText(section.id);
      return (section.paragraphs ?? []).map((paragraph) => ({
        sectionId,
        paragraph: cleanText(paragraph),
      }));
    })
    .filter((entry) => entry.sectionId && entry.paragraph)
    .sort(
      (left, right) =>
        left.sectionId.localeCompare(right.sectionId, "en") ||
        left.paragraph.localeCompare(right.paragraph, "ko"),
    );
}

export function recordRegionalUniqueNarrativeBlocks(record) {
  if (Array.isArray(record.renderedRegionalUniqueParagraphs)) {
    return record.renderedRegionalUniqueParagraphs
      .map((entry) => ({
        sectionId: cleanText(entry?.sectionId),
        paragraph: cleanText(entry?.paragraph),
      }))
      .filter((entry) => entry.sectionId && entry.paragraph)
      .sort(
        (left, right) =>
          left.sectionId.localeCompare(right.sectionId, "en") ||
          left.paragraph.localeCompare(right.paragraph, "ko"),
      )
      .map((entry) => entry.paragraph);
  }
  if (Array.isArray(record.renderedRegionalUniqueBlocks)) {
    return record.renderedRegionalUniqueBlocks
      .map(cleanText)
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, "ko"));
  }
  return regionalUniqueNarrativeBlocks(record.content);
}

export function regionalUniqueContentText(recordOrContent) {
  const blocks = recordOrContent?.content
    ? recordRegionalUniqueNarrativeBlocks(recordOrContent)
    : regionalUniqueNarrativeBlocks(recordOrContent);
  return cleanText(blocks.join("\u001f"));
}

/**
 * Authored regional narrative blocks only. Shared site chrome, image captions,
 * fixed-route service details, and the separately hard-gated directory block
 * are intentionally not part of the 25%/35% release gate.
 */
export function primaryNarrativeBlocks(content) {
  const narrativeSections = (content.sections ?? []).filter(
    (section) => section.auditScope !== "directory",
  );
  return [
    content.title,
    content.description,
    content.h1,
    content.eyebrow,
    ...(content.hooks ?? []),
    content.faqIntro,
    ...narrativeSections.flatMap((section) => [
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
  if (!/getRegionContentModifiedAt/u.test(sitemapSource)) {
    violations.push("SITEMAP_MISSING_STABLE_LASTMOD");
  }
  if (/\blastModified\s*:\s*(?:new\s+Date|Date\.now)/u.test(sitemapSource)) {
    violations.push("SITEMAP_BUILD_TIME_LASTMOD");
  }
  if (/\b(?:changeFrequency|priority)\s*:/u.test(sitemapSource)) {
    violations.push("SITEMAP_UNSUPPORTED_HINT_FIELD");
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
      "All 455 regional routes are eligible for public discovery; generic ancillary routes remain staged noindex,follow.",
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
        title: normalizeRegionalRecordText(
          record,
          record.content.title,
          normalize,
        ),
        description: normalizeRegionalRecordText(
          record,
          record.content.description,
          normalize,
        ),
        h1: normalizeRegionalRecordText(record, record.content.h1, normalize),
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

function roundedNumberSummary(values) {
  return Object.fromEntries(
    Object.entries(summarizeNumbers(values)).map(([key, value]) => [
      key,
      typeof value === "number" ? Number(value.toFixed(6)) : value,
    ]),
  );
}

function similaritySummariesByKind(pairs) {
  return Object.fromEntries(
    ["home", "district", "representative"].map((kind) => [
      kind,
      roundedNumberSummary(
        pairs
          .filter((pair) => pair.kind === kind)
          .map((pair) => pair.similarity),
      ),
    ]),
  );
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
    trigrams: recordRegionalUniqueNarrativeBlocks(record).reduce(
      (trigrams, block) => {
        for (const trigram of wordTrigrams(
          normalizeRegionalRecordText(record, block, normalize),
        )) {
          trigrams.add(trigram);
        }
        return trigrams;
      },
      new Set(),
    ),
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

function repeatedTextBlockCharacterShares(
  records,
  normalize,
  getBlocks,
  neutralizeRecordIdentity = false,
) {
  const exactBlocks = records.map((record) => getBlocks(record));
  const normalizedBlocks = exactBlocks.map((blocks, recordIndex) =>
    blocks.map((block) =>
      neutralizeRecordIdentity
        ? normalizeRegionalRecordText(records[recordIndex], block, normalize)
        : normalize(block),
    ),
  );
  const exactFrequency = documentFrequency(exactBlocks);
  const normalizedFrequency = documentFrequency(normalizedBlocks);
  return records.map((record, index) => {
    const repeatedExactBlocks = exactBlocks[index].filter(
      (block) => (exactFrequency.get(block) ?? 0) > 1,
    );
    const repeatedNormalizedBlocks = normalizedBlocks[index].filter(
      (block) => (normalizedFrequency.get(block) ?? 0) > 1,
    );
    return {
      siteKey: record.siteKey,
      path: record.path,
      kind: record.kind,
      exact: repeatedCharacterShare(exactBlocks[index], exactFrequency),
      normalized: repeatedCharacterShare(
        normalizedBlocks[index],
        normalizedFrequency,
      ),
      repeatedExactBlockCount: repeatedExactBlocks.length,
      repeatedNormalizedBlockCount: repeatedNormalizedBlocks.length,
      repeatedNormalizedExamples: repeatedNormalizedBlocks.slice(0, 6),
    };
  });
}

export function primaryNarrativeRepeatedCharacterShares(records, normalize) {
  return repeatedTextBlockCharacterShares(
    records,
    normalize,
    (record) => recordRegionalUniqueNarrativeBlocks(record),
    true,
  );
}

export function renderedRepeatedCharacterShares(renderedRecords, normalize) {
  return repeatedTextBlockCharacterShares(
    renderedRecords,
    normalize,
    (record) => extractVisibleBlocks(record.html),
    true,
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
  return (content.sections ?? []).filter(
    (section) =>
      section.auditScope === "local-substantive" &&
      cleanText(section.heading) &&
      (section.paragraphs ?? []).some((paragraph) => cleanText(paragraph)) &&
      Array.isArray(section.factRefs) &&
      section.factRefs.some((reference) => cleanText(reference)),
  ).length;
}

export function indexEligibilityContractFailures(records) {
  return records.flatMap((record) => {
      const reasons = [];
      const expectedReason =
        record.kind === "home"
          ? "city-home"
          : record.kind === "district"
            ? "regional-district"
            : "regional-leaf";
      if (record.indexEligible !== true) {
        reasons.push("REGIONAL_ROUTE_EXCLUSION");
      }
      if (record.indexEligibilityReason !== expectedReason) {
        reasons.push("INVALID_INDEX_ELIGIBILITY_REASON");
      }
      if (record.indexEligibilityTargetPath !== null) {
        reasons.push("INDEXABLE_ROUTE_HAS_FALLBACK_TARGET");
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

function compactPair(pair, recordByKey, normalize) {
  const leftRecord = recordByKey.get(pair.left);
  const rightRecord = recordByKey.get(pair.right);
  const leftText = leftRecord
    ? normalizeRegionalRecordText(
        leftRecord,
        regionalUniqueContentText(leftRecord),
        normalize,
      )
    : "";
  const rightText = rightRecord
    ? normalizeRegionalRecordText(
        rightRecord,
        regionalUniqueContentText(rightRecord),
        normalize,
      )
    : "";
  const leftTokens = new Set(leftText.match(WORD_PATTERN) ?? []);
  const rightTokens = new Set(rightText.match(WORD_PATTERN) ?? []);
  const leftOnlyTokens = [...leftTokens].filter(
    (token) => !rightTokens.has(token),
  );
  const rightOnlyTokens = [...rightTokens].filter(
    (token) => !leftTokens.has(token),
  );
  return {
    left: pair.left,
    right: pair.right,
    kind: pair.kind,
    similarity: Number(pair.similarity.toFixed(6)),
    normalizedDiff: {
      leftCharacters: leftText.length,
      rightCharacters: rightText.length,
      leftIdentityLabels: (leftRecord?.normalizationLabels ?? []).slice(0, 12),
      rightIdentityLabels: (rightRecord?.normalizationLabels ?? []).slice(0, 12),
      leftOnlyTokens: leftOnlyTokens.slice(0, 24),
      rightOnlyTokens: rightOnlyTokens.slice(0, 24),
      leftExcerpt: leftText.slice(0, 420),
      rightExcerpt: rightText.slice(0, 420),
    },
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
    if (record.actualPublicationContractPass !== true) {
      reasons.push("ACTUAL_PUBLICATION_TUPLE_CONTRACT");
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
  if (report.sharedServiceContractViolationCount !== 0) {
    failures.push("SHARED_SERVICE_COPY_CONTRACT");
  }
  if (
    report.allowlist?.sharedServiceAllowlistSource !==
    "FIXED_SECTION_ID_AND_COPY_CONTRACT"
  ) {
    failures.push("DYNAMIC_SHARED_SERVICE_ALLOWLIST");
  }
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

function semanticAuditScope(sectionId) {
  const id = cleanText(sectionId);
  if (SHARED_SERVICE_SECTION_ID_SET.has(id)) return "shared-service";
  if (DIRECTORY_SECTION_IDS.has(id)) return "directory";
  return "local-substantive";
}

export function contentAuditScopeFailures(
  records,
  thresholds = NAVER_NEAR_DUPLICATE_THRESHOLDS,
) {
  return records.flatMap((record) => {
    const sections = record.content?.sections ?? [];
    const localSections = sections.filter(
      (section) => section.auditScope === "local-substantive",
    );
    const sharedSections = sections.filter(
      (section) => section.auditScope === "shared-service",
    );
    const directorySections = sections.filter(
      (section) => section.auditScope === "directory",
    );
    const localParagraphs = localSections
      .flatMap((section) => section.paragraphs ?? [])
      .map(cleanText)
      .filter(Boolean);
    const nonLocalParagraphs = [...sharedSections, ...directorySections]
      .flatMap((section) => section.paragraphs ?? [])
      .map(cleanText)
      .filter(Boolean);
    const escapedLocalParagraphs = nonLocalParagraphs.filter((paragraph) =>
      localParagraphs.includes(paragraph),
    );
    const localCharacters = localParagraphs
      .join("")
      .replace(/\s/gu, "").length;
    const localFactRefs = [
      ...new Set(
        localSections
          .flatMap((section) => section.factRefs ?? [])
          .map(cleanText)
          .filter(Boolean),
      ),
    ];
    const sectionIds = sections.map((section) => cleanText(section.id));
    const semanticScopeMismatches = sections
      .map((section) => ({
        id: cleanText(section.id),
        expected: semanticAuditScope(section.id),
        actual: section.auditScope,
      }))
      .filter((entry) => entry.expected !== entry.actual);
    let fixedSharedServiceFailures = [];
    try {
      fixedSharedServiceFailures = sharedServiceContractFailures(record.content);
    } catch (error) {
      fixedSharedServiceFailures = [
        error instanceof Error ? error.message : "SHARED_SERVICE_CONTRACT_ERROR",
      ];
    }
    const expectedRenderedEntries = canonicalRegionalUniqueParagraphEntries(
      sections,
    );
    const renderedEntries = Array.isArray(
      record.renderedRegionalUniqueParagraphs,
    )
      ? record.renderedRegionalUniqueParagraphs
          .map((entry) => ({
            sectionId: cleanText(entry?.sectionId),
            paragraph: cleanText(entry?.paragraph),
          }))
          .filter((entry) => entry.sectionId && entry.paragraph)
          .sort(
            (left, right) =>
              left.sectionId.localeCompare(right.sectionId, "en") ||
              left.paragraph.localeCompare(right.paragraph, "ko"),
          )
      : null;
    const renderedBlocks = Array.isArray(record.renderedRegionalUniqueBlocks)
      ? record.renderedRegionalUniqueBlocks.map(cleanText).filter(Boolean)
      : null;
    const expectedRenderedBlocks = expectedRenderedEntries.map(
      (entry) => entry.paragraph,
    );
    const reasons = [];

    if (
      sections.some(
        (section) => !CONTENT_AUDIT_SCOPES.has(section.auditScope),
      )
    ) {
      reasons.push("UNKNOWN_CONTENT_AUDIT_SCOPE");
    }
    if (new Set(sectionIds).size !== sectionIds.length) {
      reasons.push("DUPLICATE_CONTENT_SECTION_ID");
    }
    if (semanticScopeMismatches.length > 0) {
      reasons.push("SECTION_SEMANTIC_SCOPE_MISMATCH");
    }
    if (fixedSharedServiceFailures.length > 0) {
      reasons.push("SHARED_SERVICE_COPY_CONTRACT");
    }
    if (
      sharedSections.length !== SHARED_SERVICE_SECTION_IDS.length ||
      SHARED_SERVICE_SECTION_IDS.some(
        (id) => !sharedSections.some((section) => cleanText(section.id) === id),
      )
    ) {
      reasons.push("SHARED_SERVICE_SECTION_ID_CONTRACT");
    }
    if (
      directorySections.length !== 1 ||
      sections.at(-1)?.auditScope !== "directory" ||
      !DIRECTORY_SECTION_IDS.has(cleanText(sections.at(-1)?.id))
    ) {
      reasons.push("DIRECTORY_SCOPE_CONTRACT");
    }
    if (
      sharedSections.some(
        (section) => (section.factRefs ?? []).some((reference) => cleanText(reference)),
      )
    ) {
      reasons.push("LOCAL_FACT_REF_IN_SHARED_SCOPE");
    }
    if (
      localSections.some(
        (section) =>
          !(section.factRefs ?? []).some((reference) => cleanText(reference)) ||
          !(section.paragraphs ?? []).some((paragraph) => cleanText(paragraph)),
      )
    ) {
      reasons.push("LOCAL_SCOPE_MISSING_FACT_OR_PARAGRAPH");
    }
    if (
      directorySections.some(
        (section) => (section.factRefs ?? []).some((reference) => cleanText(reference)),
      )
    ) {
      reasons.push("LOCAL_FACT_REF_IN_DIRECTORY_SCOPE");
    }
    if (localSections.length < thresholds.minimumLocalSubstantiveSections) {
      reasons.push("LOCAL_SUBSTANTIVE_SECTION_COUNT");
    }
    if (localParagraphs.length < thresholds.minimumLocalSubstantiveParagraphs) {
      reasons.push("LOCAL_SUBSTANTIVE_PARAGRAPH_COUNT");
    }
    if (localCharacters < thresholds.minimumLocalSubstantiveCharacters) {
      reasons.push("LOCAL_SUBSTANTIVE_CHARACTER_COUNT");
    }
    if (
      record.renderedAuthoredScopePass !== true ||
      !Array.isArray(record.renderedAuthoredScopeFailures) ||
      record.renderedAuthoredScopeFailures.length > 0
    ) {
      reasons.push("RENDERED_AUTHORED_SCOPE_CONTRACT");
    }
    if (renderedEntries === null || renderedBlocks === null) {
      reasons.push("RENDERED_LOCAL_SCOPE_CORPUS_MISSING");
    } else if (
      JSON.stringify(renderedEntries) !==
        JSON.stringify(expectedRenderedEntries) ||
      JSON.stringify(renderedBlocks) !==
        JSON.stringify(expectedRenderedBlocks)
    ) {
      reasons.push("RENDERED_LOCAL_SCOPE_CORPUS_MISMATCH");
    }
    if (record.regionalUniqueBlocksVerified !== true) {
      reasons.push("LOCAL_SUBSTANTIVE_BLOCK_NOT_RENDERED");
    }
    if (record.localFactEscapedSharedScope === true) {
      reasons.push("LOCAL_FACT_ESCAPED_SHARED_SCOPE");
    }
    if (escapedLocalParagraphs.length > 0) {
      reasons.push("LOCAL_PARAGRAPH_ESCAPED_NONLOCAL_SCOPE");
    }
    if (
      record.kind === "representative" &&
      record.siteKey === "hanam" &&
      record.path === "/areas/%EC%B4%88%EC%9D%B4%EB%8F%99/" &&
      localFactRefs.length < 6
    ) {
      reasons.push("LOW_COVERAGE_LEAF_FACT_FALLBACK");
    }

    return reasons.length > 0
      ? [{
          siteKey: record.siteKey,
          path: record.path,
          reasons: [...new Set(reasons)],
          semanticScopeMismatches,
          sharedServiceContractFailures: fixedSharedServiceFailures,
          renderedScopeFailures: record.renderedAuthoredScopeFailures ?? null,
          localSectionCount: localSections.length,
          localParagraphCount: localParagraphs.length,
          localCharacters,
          localFactRefCount: localFactRefs.length,
        }]
      : [];
  });
}

export function roadFactProvenanceContractFailures(records) {
  return records.flatMap((record) => {
    if (record.kind !== "representative") {
      return record.roadFactProvenance === null ||
        record.roadFactProvenance === undefined
        ? []
        : [{
            siteKey: record.siteKey,
            path: record.path,
            reasons: ["ROAD_FACT_ON_NON_LEAF"],
          }];
    }
    const provenance = record.roadFactProvenance;
    const reasons = [];
    if (!provenance || provenance.factCount < 1) {
      reasons.push("ROAD_FACT_COVERAGE");
    }
    if (
      provenance?.sourceAgency !==
        "행정안전부 도로명주소 업무 시스템 / 한국지역정보개발원" ||
      provenance?.snapshotDate !== "2026-07-31" ||
      provenance?.archiveSha256 !==
        "da5c4007d696bf98f066b3832b53dc1f95d85b32fe1c479b7be79c42b3c6c1d9" ||
      provenance?.roadNameSnapshot !== "2026-07" ||
      provenance?.roadNameArchiveSha256 !==
        "9234d8ed1c2fa8bd13e18e5a4a5f66e9b5dea409421845ec77dd01a33e3f365f" ||
      provenance?.roadNameEntrySha256 !==
        "2dab7220a8602fbc5711123641c932a93e4a70578dd6c9bf1a1803943028e57c" ||
      provenance?.dataDigest !==
        "sha256:acf74bc883028b4570deef4a8d87248ba17ec35150e506e3836937d180402438"
    ) {
      reasons.push("ROAD_FACT_SOURCE_PROVENANCE");
    }
    if (provenance?.sourceCodeJoinPass !== true) {
      reasons.push("ROAD_FACT_SOURCE_CODE_JOIN");
    }
    if (provenance?.safeSelectionPass !== true) {
      reasons.push("ROAD_FACT_UNSAFE_SAMPLE");
    }
    if (provenance?.roadNameAreaJoinPass !== true) {
      reasons.push("ROAD_FACT_AREA_JOIN");
    }
    if (provenance?.serviceContextSectionsPass !== true) {
      reasons.push("ROAD_FACT_LOCAL_REF_RENDER_CONTRACT");
    }
    if (provenance?.preciseAddressExposurePass !== true) {
      reasons.push("ROAD_FACT_PRECISE_ADDRESS_EXPOSURE");
    }
    return reasons.length > 0
      ? [{ siteKey: record.siteKey, path: record.path, reasons, provenance }]
      : [];
  });
}

export function evaluateNaverNearDuplicateGate({
  records,
  renderedRecords,
  fixedRecords = [],
  stagedRecords = [],
  siteSitemapContracts = [],
  normalize,
  selectionSourceContract = { status: "PASS", violations: [] },
  stagedIndexingSourceContract = { status: "PASS", violations: [] },
}) {
  const thresholds = NAVER_NEAR_DUPLICATE_THRESHOLDS;
  const exactDocuments = records.map((record) =>
    primaryContentText(record),
  );
  const renderedVisibleDocuments = renderedRecords.map((record) =>
    stripHtml(record.html),
  );
  const renderedHtmlDocuments = renderedRecords.map((record) =>
    cleanText(record.html),
  );
  const normalizedDocuments = exactDocuments.map((value, index) =>
    normalizeRegionalRecordText(records[index], value, normalize),
  );
  const exactTitles = records.map((record) => record.content.title);
  const normalizedTitles = exactTitles.map((value, index) =>
    normalizeRegionalRecordText(records[index], value, normalize),
  );
  const exactDescriptions = records.map((record) => record.content.description);
  const normalizedDescriptions = exactDescriptions.map((value, index) =>
    normalizeRegionalRecordText(records[index], value, normalize),
  );
  const exactH1s = records.map((record) => record.content.h1);
  const normalizedH1s = exactH1s.map((value, index) =>
    normalizeRegionalRecordText(records[index], value, normalize),
  );
  const renderedH1s = renderedRecords.map((record) =>
    stripHtml(
      String(record.html ?? "").match(
        /<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/iu,
      )?.[1] ?? "",
    ),
  );
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
  const indexableInventoryFailures = [];
  if (
    indexEligibleRecords.length !== FULL_INDEXABLE_REGIONAL_INVENTORY.count ||
    ineligibleRecords.length !== 0
  ) {
    indexableInventoryFailures.push("INDEXABLE_REGIONAL_DOCUMENT_COUNT");
  }
  if (
    records.some((record) => record.indexEligible !== true)
  ) {
    indexableInventoryFailures.push("ALL_REGIONAL_ROUTES_MUST_BE_INDEXABLE");
  }
  if (
    eligibleRegionalInventorySha256 !==
    FULL_INDEXABLE_REGIONAL_INVENTORY.sha256
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
  const crossSiteSimilarityByKind = similaritySummariesByKind(
    crossSiteSimilarities,
  );
  const withinSiteSimilarityByKind = similaritySummariesByKind(
    withinSiteSimilarities,
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
  const roadFactProvenanceFailures =
    roadFactProvenanceContractFailures(records);
  const facilityFactProvenanceFailures = records.flatMap((record) => {
    if (record.kind !== "representative") {
      return record.facilityFactProvenance === null ||
        record.facilityFactProvenance === undefined
        ? []
        : [{
            siteKey: record.siteKey,
            path: record.path,
            reasons: ["FACILITY_FACT_ON_NON_LEAF"],
          }];
    }
    const provenance = record.facilityFactProvenance;
    const lowCoverageException =
      record.siteKey === "hanam" &&
      record.path === "/areas/%EC%B4%88%EC%9D%B4%EB%8F%99/";
    const reasons = [];
    if (
      !provenance ||
      provenance.factCount < (lowCoverageException ? 2 : 3) ||
      provenance.factCount > 6
    ) {
      reasons.push("FACILITY_FACT_COVERAGE");
    }
    if (
      provenance?.sourceAgency !==
        "행정안전부 도로명주소 업무 시스템 / 한국지역정보개발원" ||
      provenance?.sourceDataset !== "주소DB 전국 전체분" ||
      provenance?.snapshotDate !== "2026-07-31" ||
      provenance?.archiveSha256 !==
        "da5c4007d696bf98f066b3832b53dc1f95d85b32fe1c479b7be79c42b3c6c1d9" ||
      provenance?.dataDigest !==
        "sha256:cfee0fa7239df1d1422af491b46e7f44130818117986c98edc9c72bc0888afa2"
    ) {
      reasons.push("FACILITY_FACT_SOURCE_PROVENANCE");
    }
    if (provenance?.sourceCodeJoinPass !== true) {
      reasons.push("FACILITY_FACT_SOURCE_CODE_JOIN");
    }
    if (provenance?.adminNameJoinPass !== true) {
      reasons.push("FACILITY_FACT_ADMIN_NAME_JOIN");
    }
    if (provenance?.legalNameJoinPass !== true) {
      reasons.push("FACILITY_FACT_LEGAL_NAME_JOIN");
    }
    if (provenance?.sourceRowHashesPass !== true) {
      reasons.push("FACILITY_FACT_SOURCE_ROW_HASHES");
    }
    if (provenance?.renderedExactlyOncePass !== true) {
      reasons.push("FACILITY_FACT_RENDERED_EXACTLY_ONCE");
    }
    if (provenance?.buildingNumberExposurePass !== true) {
      reasons.push("FACILITY_FACT_PRECISE_ADDRESS_EXPOSURE");
    }
    const unsafeNamePattern =
      /(?:법원사|교회|성당|사찰|병원|의원|약국|요양|어린이집|아파트|빌라|오피스텔|호텔|모텔|마트|슈퍼|상가|공장|주식회사)/u;
    if (
      (provenance?.displayedFacilities ?? []).some((fact) =>
        unsafeNamePattern.test(cleanText(fact.name)),
      )
    ) {
      reasons.push("FACILITY_FACT_UNSAFE_NAME");
    }
    return reasons.length > 0
      ? [{ siteKey: record.siteKey, path: record.path, reasons, provenance }]
      : [];
  });
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
      if (record.sitemapLastModifiedPass !== true) {
        reasons.push("SITEMAP_LASTMOD_CONTRACT");
      }
    }
    return reasons.length > 0
      ? [{
          siteKey: record.siteKey,
          path: record.path,
          reasons,
        }]
      : [];
  });
  const sitemapCorpusFailures = [];
  const regionalSiteKeys = new Set(records.map((record) => record.siteKey));
  const sitemapSiteKeys = new Set(
    siteSitemapContracts.map((contract) => contract.siteKey),
  );
  if (siteSitemapContracts.length !== 27) {
    sitemapCorpusFailures.push({
      reasons: ["SITEMAP_SITE_COUNT"],
      expected: 27,
      actual: siteSitemapContracts.length,
    });
  }
  if (
    regionalSiteKeys.size !== 27 ||
    sitemapSiteKeys.size !== 27 ||
    [...regionalSiteKeys].some((siteKey) => !sitemapSiteKeys.has(siteKey))
  ) {
    sitemapCorpusFailures.push({
      reasons: ["SITEMAP_SITE_KEY_COVERAGE"],
      regionalSiteKeys: [...regionalSiteKeys].sort(),
      sitemapSiteKeys: [...sitemapSiteKeys].sort(),
    });
  }
  for (const contract of siteSitemapContracts) {
    const expected = records.filter(
      (record) => record.siteKey === contract.siteKey,
    ).length;
    const reasons = [];
    if (contract.documentCount !== expected) {
      reasons.push("SITEMAP_DOCUMENT_COUNT");
    }
    if (contract.uniqueDocumentCount !== expected) {
      reasons.push("SITEMAP_UNIQUE_DOCUMENT_COUNT");
    }
    if (contract.lastModifiedCount !== expected) {
      reasons.push("SITEMAP_LASTMOD_COUNT");
    }
    if (contract.unsupportedHintCount !== 0) {
      reasons.push("SITEMAP_UNSUPPORTED_HINT_FIELD");
    }
    if (reasons.length > 0) {
      sitemapCorpusFailures.push({
        siteKey: contract.siteKey,
        expected,
        contract,
        reasons,
      });
    }
  }
  if (
    siteSitemapContracts.reduce(
      (total, contract) => total + contract.documentCount,
      0,
    ) !== FULL_INDEXABLE_REGIONAL_INVENTORY.count
  ) {
    sitemapCorpusFailures.push({
      reasons: ["SITEMAP_TOTAL_DOCUMENT_COUNT"],
      expected: FULL_INDEXABLE_REGIONAL_INVENTORY.count,
      actual: siteSitemapContracts.reduce(
        (total, contract) => total + contract.documentCount,
        0,
      ),
    });
  }
  const customerVisibleRecords = [
    ...records.map((record) => {
      const rendered = renderedByKey.get(`${record.siteKey}:${record.path}`);
      return {
        siteKey: record.siteKey,
        path: record.path,
        regional: true,
        visibleBlocks: rendered
          ? extractVisibleBlocks(rendered.html)
          : recordPrimaryNarrativeBlocks(record),
      };
    }),
    ...stagedRecords.map((record) => ({
      siteKey: record.siteKey,
      path: record.path,
      regional: false,
      visibleBlocks: extractVisibleBlocks(record.html),
    })),
  ];
  const antiFillerFailures = customerVisibleRecords.flatMap((record) => {
    const visibleBlocks = record.visibleBlocks;
    const patterns = record.regional
      ? [
          ...ARTIFICIAL_EDITORIAL_FILLER_PATTERNS,
          ...REGIONAL_ADMIN_UI_FILLER_PATTERNS,
        ]
      : ARTIFICIAL_EDITORIAL_FILLER_PATTERNS;
    const matches = visibleBlocks.flatMap((block) =>
      patterns.flatMap((pattern) =>
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

  const contentScopeFailures = contentAuditScopeFailures(records, thresholds);

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
    if (signatures.fullPricing) reasons.push("FULL_PRICING_OUTSIDE_FIXED_ROUTE");
    if (signatures.fullProcess) reasons.push("FULL_PROCESS_OUTSIDE_FIXED_ROUTE");
    if (signatures.fullFaq) reasons.push("FULL_FAQ_OUTSIDE_FIXED_ROUTE");
    if (signatures.fullStandards) reasons.push("FULL_STANDARDS_OUTSIDE_FIXED_ROUTE");
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
    if (record.directoryCoveragePass !== true) {
      reasons.push("DIRECTORY_LINK_COVERAGE");
    }
    if (record.h1Count !== 1) reasons.push("H1_COUNT");
    if (record.metaContractPass !== true) reasons.push("META_CONTRACT");
    if (record.keywordContract?.titlePrefixPass !== true) {
      reasons.push("PRIMARY_KEYWORD_TITLE_PREFIX");
    }
    if (record.keywordContract?.h1Pass !== true) {
      reasons.push("PRIMARY_KEYWORD_H1");
    }
    if (record.keywordContract?.first100WordsPass !== true) {
      reasons.push("PRIMARY_KEYWORD_FIRST_100_WORDS");
    }
    if (record.keywordContract?.h2Pass !== true) {
      reasons.push("PRIMARY_KEYWORD_TWO_H2");
    }
    if (record.serviceIntentContract?.renderedPass !== true) {
      reasons.push("RENDERED_SERVICE_INTENT");
    }
    if (record.serviceIntentContract?.descriptionPass !== true) {
      reasons.push("META_DESCRIPTION_SERVICE_INTENT");
    }
    if (record.serviceIntentContract?.hooksPass !== true) {
      reasons.push("HOOKS_SERVICE_INTENT");
    }
    if (record.serviceIntentContract?.faqIntroPass !== true) {
      reasons.push("FAQ_INTRO_SERVICE_INTENT");
    }
    if (record.primaryBlocksVerified !== true) {
      reasons.push("PRIMARY_BLOCK_NOT_RENDERED");
    }
    if (record.shortLabelLeak === true) reasons.push("OFFICIAL_SUFFIX_LEAK");
    if (record.actualPublicationContractPass !== true) {
      reasons.push("ACTUAL_PUBLICATION_TUPLE_CONTRACT");
    }
    return reasons.length
      ? [{
          siteKey: record.siteKey,
          path: record.path,
          reasons,
          directoryExpectedLinkCount: record.directoryExpectedLinkCount,
          directoryRenderedLinkCount: record.directoryRenderedLinkCount,
          directoryUnexpectedLinkCount: record.directoryUnexpectedLinkCount,
        }]
      : [];
  });

  const emptyRegionPlaceholderFailures = records.flatMap((record) => {
    const rendered = renderedByKey.get(`${record.siteKey}:${record.path}`);
    const prose = cleanText([
      ...primaryNarrativeBlocks(record.content),
      record.content.childDirectory?.heading,
      record.content.childDirectory?.intro,
      ...(record.content.sections ?? []).flatMap((section) => [
        section.heading,
        ...(section.paragraphs ?? []),
      ]),
    ].join("\n"));
    const reasons = [];
    if (prose.includes("별도 항목 없음")) {
      reasons.push("EMPTY_REGION_PLACEHOLDER_TEXT");
    }
    if (
      /(?:^|[\s,.(·])([가-힣]{1,20}(?:구|동|읍|면|리))(?:부터\s*\1까지|·\1|(?:은|는)\s*\1(?:과|와)\s*서로 다른)/u.test(
        prose,
      )
    ) {
      reasons.push("SELF_COMPARISON_TEXT");
    }
    if (
      /도시는\s*([가-힣]{1,20}),\s*(?:상위 지역|바로 위 지역)은\s*\1(?:이며|입니다)/u.test(
        prose,
      )
    ) {
      reasons.push("DUPLICATE_CITY_PARENT_TEXT");
    }
    if (record.nodeDisplayName) {
      const duplicateTargetHeading = new RegExp(
        `${escapeRegExp(record.nodeDisplayName)}\\s+${escapeRegExp(record.nodeDisplayName)}(?=\\s|·|에서|으로|부터|까지|은|는|이|가|을|를|과|와|의|로|도|만|$)`,
        "u",
      );
      if (
        (record.content.sections ?? []).some((section) =>
          duplicateTargetHeading.test(cleanText(section.heading))
        )
      ) {
        reasons.push("DUPLICATE_TARGET_HEADING_PREFIX");
      }
    }
    const isPeerlessLeaf =
      record.kind === "representative" &&
      record.directoryExpectedLinkCount === 0;
    if (isPeerlessLeaf) {
      if (
        /(?:같은 단계|관련 지역|인접 지역|형제 지역).{0,24}(?:링크|목록)|(?:링크|목록).{0,24}(?:같은 단계|관련 지역|인접 지역|형제 지역)/u.test(
          prose,
        )
      ) {
        reasons.push("PEERLESS_ROUTE_LINK_CLAIM");
      }
      const contextualHrefs = rendered
        ? contextualInternalHrefs(rendered.html, record.path)
        : [];
      const parentPathKey = String(record.parentPath ?? "").replace(/\/+$/u, "");
      if (
        !record.parentPath ||
        !contextualHrefs.some(
          (href) => String(href).replace(/\/+$/u, "") === parentPathKey,
        )
      ) {
        reasons.push("PEERLESS_PARENT_LINK_MISSING");
      }
    }
    return reasons.length > 0
      ? [{ siteKey: record.siteKey, path: record.path, reasons }]
      : [];
  });

  const collisionReport = {
    exactDocument: duplicateGroups(renderedVisibleDocuments).length,
    exactRenderedHtml: duplicateGroups(renderedHtmlDocuments).length,
    exactPrimaryNarrative: duplicateGroups(exactDocuments).length,
    normalizedDocument: duplicateGroups(normalizedDocuments).length,
    exactTitle: duplicateGroups(exactTitles).length,
    normalizedTitle: duplicateGroups(normalizedTitles).length,
    exactDescription: duplicateGroups(exactDescriptions).length,
    normalizedDescription: duplicateGroups(normalizedDescriptions).length,
    exactH1: duplicateGroups(renderedH1s).length,
    exactContentH1: duplicateGroups(exactH1s).length,
    normalizedH1: duplicateGroups(normalizedH1s).length,
  };
  const recordByKey = new Map(
    records.map((record) => [`${record.siteKey}:${record.path}`, record]),
  );
  const worstCrossSitePairs = [...crossSiteSimilarities]
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, 12)
    .map((pair) => compactPair(pair, recordByKey, normalize));
  const worstWithinSitePairs = [...withinSiteSimilarities]
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, 12)
    .map((pair) => compactPair(pair, recordByKey, normalize));
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
      collisionReport.exactRenderedHtml,
      collisionReport.exactPrimaryNarrative,
      collisionReport.exactTitle,
      collisionReport.exactDescription,
      collisionReport.exactH1,
      collisionReport.exactContentH1,
    ].some((count) => count !== 0)
  ) {
    failures.push("EXACT_COLLISION");
  }
  if (
    crossSiteSimilaritySummary.p95 >=
    thresholds.primaryContent.crossSite.percentileMaximum
  ) {
    failures.push("PRIMARY_CONTENT_P95_SIMILARITY");
  }
  if (
    crossSiteSimilaritySummary.maximum >=
    thresholds.primaryContent.crossSite.pairMaximum
  ) {
    failures.push("PRIMARY_CONTENT_MAX_SIMILARITY");
  }
  if (
    withinSiteSimilaritySummary.p95 >=
    thresholds.primaryContent.withinSite.percentileMaximum
  ) {
    failures.push("WITHIN_SITE_PRIMARY_CONTENT_P95_SIMILARITY");
  }
  if (
    withinSiteSimilaritySummary.maximum >=
    thresholds.primaryContent.withinSite.pairMaximum
  ) {
    failures.push("WITHIN_SITE_PRIMARY_CONTENT_MAX_SIMILARITY");
  }
  if (
    Object.values(crossSiteSimilarityByKind).some(
      (summary) =>
        summary.p95 >= thresholds.primaryContent.crossSite.percentileMaximum ||
        summary.maximum >= thresholds.primaryContent.crossSite.pairMaximum,
    )
  ) {
    failures.push("PRIMARY_CONTENT_KIND_SIMILARITY");
  }
  if (
    Object.values(withinSiteSimilarityByKind).some(
      (summary) =>
        summary.p95 >= thresholds.primaryContent.withinSite.percentileMaximum ||
        summary.maximum >= thresholds.primaryContent.withinSite.pairMaximum,
    )
  ) {
    failures.push("WITHIN_SITE_PRIMARY_CONTENT_KIND_SIMILARITY");
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
  if (contentScopeFailures.length > 0) {
    failures.push("CONTENT_AUDIT_SCOPE_CONTRACT");
  }
  if (emptyRegionPlaceholderFailures.length > 0) {
    failures.push("EMPTY_REGION_LINK_CLAIM_CONTRACT");
  }
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
  if (roadFactProvenanceFailures.length > 0) {
    failures.push("REGION_ROAD_FACT_PROVENANCE_CONTRACT");
  }
  if (facilityFactProvenanceFailures.length > 0) {
    failures.push("REGION_PUBLIC_FACILITY_PROVENANCE_CONTRACT");
  }
  if (eligibilitySelectionFailures.length > 0) {
    failures.push("INDEX_ELIGIBILITY_SELECTION_CONTRACT");
  }
  if (routeDiscoveryFailures.length > 0) {
    failures.push("ROUTE_DISCOVERY_CONTRACT");
  }
  if (sitemapCorpusFailures.length > 0) {
    failures.push("SITEMAP_CORPUS_CONTRACT");
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
    schemaVersion: 2,
    status: failures.length === 0 ? "PASS" : "FAIL",
    note:
      "All 455 regional source routes are evaluated with a synthetic public publication fixture. Independently, each actual project must satisfy its current publication tuple: public routes index/follow, or preview routes global noindex/nofollow until HTTPS publication is complete. Similarity thresholds are an internal release heuristic, not a published NAVER ranking threshold.",
    thresholds,
    thresholdPolicy: {
      classification: "INTERNAL_RELEASE_HEURISTIC",
      note:
        "The same strict p95 and pair limits apply to cross-site, within-site, and per-kind comparisons of authored local-substantive paragraphs across all 455 regional routes. Shared-service operating facts and the separately truth-gated directory are outside this similarity corpus. These limits are not NAVER documentation, a crawler classification boundary, or a ranking guarantee.",
      nonNegotiableHardGates:
        "Exact rendered/document/meta/H1 collisions, artificial or technical filler, full shared service blocks, missing directory links, and discovery metadata remain zero-tolerance.",
      copyRule:
        "Do not add invented facts, filler, or lexical rotation merely to lower a similarity score.",
      scopes: {
        sharedService:
          "Reusable truthful service copy: primary keyword headings, course/price, 24-hour phone booking, female therapist visit, hygiene, onsite post-payment, and service flow.",
        localSubstantive:
          "Verified city, administrative, public-facility, road-name, legal-area, and alias prose. This scope alone is measured by the p95/max and repeated-share hard gates.",
        directory:
          "Excluded from similarity and checked separately against actual rendered internal links.",
      },
    },
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
      sitemapSites: siteSitemapContracts.length,
      sitemapDocuments: siteSitemapContracts.reduce(
        (total, contract) => total + contract.documentCount,
        0,
      ),
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
      regionRoadFactProvenanceDocuments: records.filter(
        (record) => record.roadFactProvenance?.factCount > 0,
      ).length,
      regionRoadFactProvenanceSha256: digestText(
        records
          .filter((record) => record.roadFactProvenance?.factCount > 0)
          .map(
            (record) =>
              `${record.siteKey}:${record.path}:${record.roadFactProvenance.snapshotDate}:${record.roadFactProvenance.archiveSha256}:${record.roadFactProvenance.roadNameSnapshot}:${record.roadFactProvenance.roadNameArchiveSha256}:${record.roadFactProvenance.dataDigest}:${record.roadFactProvenance.displayedRoadNames.join("|")}`,
          )
          .sort()
          .join("\n"),
      ),
      regionPublicFacilityProvenanceDocuments: records.filter(
        (record) => record.facilityFactProvenance?.factCount > 0,
      ).length,
      regionPublicFacilityProvenanceSha256: digestText(
        records
          .filter((record) => record.facilityFactProvenance?.factCount > 0)
          .map((record) =>
            `${record.siteKey}:${record.path}:${record.facilityFactProvenance.snapshotDate}:${record.facilityFactProvenance.archiveSha256}:${record.facilityFactProvenance.dataDigest}:${record.facilityFactProvenance.displayedFacilities.map((fact) => `${fact.name}|${fact.roadName}|${fact.legalName}`).join(";")}`,
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
        byKind: crossSiteSimilarityByKind,
        worstPairs: worstCrossSitePairs,
      },
      withinSite: {
        ...Object.fromEntries(
          Object.entries(withinSiteSimilaritySummary).map(([key, value]) => [
            key,
            typeof value === "number" ? Number(value.toFixed(6)) : value,
          ]),
        ),
        byKind: withinSiteSimilarityByKind,
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
    contentScopeFailures: contentScopeFailures.slice(0, 30),
    emptyRegionPlaceholderFailures:
      emptyRegionPlaceholderFailures.slice(0, 30),
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
    roadFactProvenanceFailures: roadFactProvenanceFailures.slice(0, 30),
    facilityFactProvenanceFailures:
      facilityFactProvenanceFailures.slice(0, 30),
    eligibilitySelectionFailures: eligibilitySelectionFailures.slice(0, 30),
    routeDiscoveryFailures: routeDiscoveryFailures.slice(0, 30),
    sitemapCorpusFailures: sitemapCorpusFailures.slice(0, 30),
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
