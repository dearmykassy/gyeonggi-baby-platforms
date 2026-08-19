import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { getBlogPosts } from "../src/data/blog-posts.ts";
import {
  CONSULTATION_ITEMS,
  COURSE_SELECTION_GUIDE,
  SERVICE_PROCESS_STEPS,
  SERVICE_STANDARDS,
  buildRegionServiceFaqs,
} from "../src/data/service-guide.ts";
import {
  PROVISIONAL_PRICING,
  PROVISIONAL_PRICING_SOURCE,
} from "../src/data/pricing.ts";
import { BUSINESS_CONTACT_PHONES } from "../src/data/business-settings.ts";
import { createRegionContent } from "../src/lib/content.ts";
import { getRegionNodesForSite } from "../src/lib/regions.ts";
import { ALL_BABY_SITES } from "../src/lib/site-config.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const TSX_BIN = path.join(ROOT, "node_modules/.bin/tsx");
const DOCUMENTS_ROOT = path.join(os.homedir(), "Documents");
const SUBSTANTIVE_HANGUL_MINIMUM = 12;

const AUTHORITATIVE_REPOSITORIES = [
  {
    id: "massagebom",
    root: path.join(DOCUMENTS_ROOT, "Services/msgbom"),
    mode: "massagebom-runtime",
    required: ["src/lib/region-customer-copy.ts", "src/lib/regions.ts"],
  },
  {
    id: "massage-love",
    root: path.join(DOCUMENTS_ROOT, "Services/massagelove"),
    mode: "snapshot",
    snapshot: "src/data/region-content.generated.json",
    required: ["src/data/region-content.generated.json"],
  },
  {
    id: "callme-todaki",
    root: path.join(DOCUMENTS_ROOT, "Codex/callme-todaki"),
    mode: "snapshot",
    snapshot: "src/data/region-content.generated.json",
    required: ["src/data/region-content.generated.json"],
  },
  {
    id: "rang-therapy",
    root: path.join(DOCUMENTS_ROOT, "Codex/rang-therapy-seo-release"),
    mode: "content-runtime",
    required: ["src/lib/content.ts", "src/lib/regions.ts"],
  },
  {
    id: "feeling-hometai",
    root: path.join(DOCUMENTS_ROOT, "Codex/feeling-hometai"),
    mode: "content-runtime",
    required: ["src/lib/content.ts", "src/lib/regions.ts"],
  },
  {
    id: "geonmae-banhada",
    root: path.join(DOCUMENTS_ROOT, "Codex/geonmae-banhada"),
    mode: "content-runtime",
    required: ["src/lib/content.ts", "src/lib/regions.ts"],
  },
  {
    id: "honhyeol-massage",
    root: path.join(DOCUMENTS_ROOT, "Codex/honhyeol-massage"),
    mode: "content-runtime",
    required: ["src/lib/content.ts", "src/lib/regions.ts"],
  },
  {
    id: "massage-day",
    root: path.join(DOCUMENTS_ROOT, "Codex/massage-day"),
    mode: "content-runtime",
    required: ["src/lib/content.ts", "src/lib/regions.ts"],
  },
];

for (const repository of AUTHORITATIVE_REPOSITORIES) {
  if (!path.isAbsolute(repository.root) || !existsSync(repository.root)) {
    throw new Error(`BABY_COPY_AUDIT_AUTHORITY_MISSING:${repository.root}`);
  }
  for (const relative of repository.required) {
    const file = path.join(repository.root, relative);
    if (!existsSync(file)) {
      throw new Error(`BABY_COPY_AUDIT_AUTHORITY_FILE_MISSING:${file}`);
    }
  }
}
if (!existsSync(TSX_BIN)) {
  throw new Error(`BABY_COPY_AUDIT_TSX_MISSING:${TSX_BIN}`);
}

function clean(value) {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function escapeRegExp(value) {
  return value.replace(/[-/\^$*+?.()|[\]{}]/gu, "\\$&");
}

function isSubstantive(value) {
  return (value.match(/[가-힣]/gu) ?? []).length >= SUBSTANTIVE_HANGUL_MINIMUM;
}

function collectStrings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, output);
  }
  return output;
}

const OLD_BRANDS = [
  "마사지봄",
  "마사지러브",
  "콜미토닥이",
  "랑테라피",
  "필링홈타이",
  "건마에반하다",
  "혼혈마사지",
  "마사지데이",
  "GEONMAE BANHADA",
  "HONHYEOL",
];
const ALL_BRANDS = [
  ...new Set([...OLD_BRANDS, ...ALL_BABY_SITES.map((site) => site.brandName)]),
].sort((left, right) => right.length - left.length);
const BRAND_PATTERN = new RegExp(
  ALL_BRANDS.map(escapeRegExp).join("|"),
  "giu",
);
const ALL_TARGET_LABELS = [
  ...new Set(
    ALL_BABY_SITES.flatMap((site) => [
      site.searchName,
      site.officialName,
      ...getRegionNodesForSite(site).flatMap((node) => [
        node.qualifiedName,
        node.displayName,
        node.officialName,
        ...node.sourceAliases,
      ]),
    ]),
  ),
]
  .filter((value) => value.length >= 2)
  .sort((left, right) => right.length - left.length);
const TARGET_LABEL_PATTERN = new RegExp(
  ALL_TARGET_LABELS.map(escapeRegExp).join("|"),
  "gu",
);

function normalizeSource(value) {
  return clean(value)
    .replace(BRAND_PATTERN, "{브랜드}")
    .replace(TARGET_LABEL_PATTERN, "{지역}");
}

function labelsFor(site, node) {
  return [
    site.brandName,
    site.searchName,
    site.officialName,
    node.qualifiedName,
    node.displayName,
    node.officialName,
    ...node.sourceAliases,
    ...getRegionNodesForSite(site).map((candidate) => candidate.displayName),
  ]
    .filter((value, index, all) => value.length >= 2 && all.indexOf(value) === index)
    .sort((left, right) => right.length - left.length);
}

function normalizeRegional(value, site, node) {
  return labelsFor(site, node)
    .reduce((copy, label) => copy.replaceAll(label, "{지역}"), clean(value))
    .replace(BRAND_PATTERN, "{브랜드}");
}

const OWNER_EXACT_ALLOWLIST = new Set(
  collectStrings([
    BUSINESS_CONTACT_PHONES,
    PROVISIONAL_PRICING_SOURCE,
    PROVISIONAL_PRICING,
    CONSULTATION_ITEMS,
    SERVICE_STANDARDS,
    COURSE_SELECTION_GUIDE,
    SERVICE_PROCESS_STEPS,
    buildRegionServiceFaqs("{지역}"),
  ]).map(clean),
);
const STRUCTURAL_ALLOWLIST = new Set(
  [
    "전화로 일정 확인",
    "코스·가격 보기",
    "관련 지역 찾기",
    "전화 전에 확인할 메모",
    "지역 안내",
    "코스·가격",
    "이용 방법",
    "공지사항",
    "안내 글",
    "<article><p>{값}</p>{값}<section><h2>전화 전에 확인할 메모</h2><ul>{값}</ul></section></article>",
  ].map(clean),
);

function allowedSharedValue(value) {
  const normalized = clean(value);
  return (
    OWNER_EXACT_ALLOWLIST.has(normalized) ||
    STRUCTURAL_ALLOWLIST.has(normalized)
  );
}

function addValue(map, value, normalizer = clean) {
  if (allowedSharedValue(value)) return;
  const normalized = normalizer(value);
  if (!isSubstantive(normalized)) return;
  map.set(digest(normalized), normalized);
}

function extractTypeScriptStrings(file) {
  const source = readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
  const values = [];
  function visit(node) {
    if (ts.isStringLiteralLike(node)) values.push(node.text);
    else if (ts.isTemplateExpression(node)) {
      values.push(
        node.head.text +
          node.templateSpans.map((span) => "{값}" + span.literal.text).join(""),
      );
    } else if (ts.isJsxText(node)) values.push(node.text);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return values;
}

function extractFileStrings(file) {
  if (file.endsWith(".json")) {
    return collectStrings(JSON.parse(readFileSync(file, "utf8")));
  }
  return extractTypeScriptStrings(file);
}

function listCustomerSourceFiles(root) {
  const sourceRoot = path.join(root, "src");
  if (!existsSync(sourceRoot) || !statSync(sourceRoot).isDirectory()) {
    throw new Error(`BABY_COPY_AUDIT_SOURCE_ROOT_MISSING:${sourceRoot}`);
  }
  const files = [];
  const queue = [sourceRoot];
  while (queue.length > 0) {
    const current = queue.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const resolved = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(resolved);
      else if (/\.(?:ts|tsx|json)$/u.test(entry.name)) files.push(resolved);
    }
  }
  return files.sort();
}

function genericRuntimeCode() {
  return [
    'import { createHash } from "node:crypto";',
    'import { createRegionContent } from "./src/lib/content.ts";',
    'import * as regionLibrary from "./src/lib/regions.ts";',
    'const { ACTIVE_REGION_NODES } = regionLibrary;',
    `const brands = /${ALL_BRANDS.map(escapeRegExp).join("|")}/giu;`,
    'const hash = (value) => createHash("sha256").update(value).digest("hex");',
    'const clean = (value) => value.replace(/\\s+/gu, " ").trim();',
    'const substantive = (value) => (value.match(/[가-힣]/gu) ?? []).length >= 12;',
    'function normalize(value, node) {',
    '  const labels = [node.qualifiedName, node.displayName, node.officialName,',
    '    typeof regionLibrary.getRegionHeadingLabel === "function" ? regionLibrary.getRegionHeadingLabel(node) : "",',
    '    typeof regionLibrary.getSearchRegionLabel === "function" ? regionLibrary.getSearchRegionLabel(node) : "",',
    '    typeof regionLibrary.getKeywordRegionLabel === "function" ? regionLibrary.getKeywordRegionLabel(node) : "",',
    '    ...(node.representative?.sourceNames ?? []), ...(node.sourceAliases ?? [])]',
    '    .filter((label, index, all) => label && label.length >= 2 && all.indexOf(label) === index)',
    '    .sort((left, right) => right.length - left.length);',
    '  return labels.reduce((copy, label) => copy.replaceAll(label, "{지역}"), clean(value)).replace(brands, "{브랜드}");',
    '}',
    'const exact = new Set(); const normalized = new Set();',
    'for (const node of ACTIVE_REGION_NODES) {',
    '  const content = createRegionContent(node);',
    '  const values = [content.title, content.description, content.h1, ...(content.hooks ?? []),',
    '    ...(content.sections ?? []).flatMap((item) => [item.heading, ...(item.paragraphs ?? [])])];',
    '  for (const value of values) {',
    '    const cleaned = clean(value); if (substantive(cleaned)) exact.add(hash(cleaned));',
    '    const regional = normalize(value, node); if (substantive(regional)) normalized.add(hash(regional));',
    '  }',
    '}',
    'process.stdout.write(JSON.stringify({ routeCount: ACTIVE_REGION_NODES.length, exact: [...exact], normalized: [...normalized] }));',
  ].join("\n");
}

function massageBomRuntimeCode() {
  return [
    'import { createHash } from "node:crypto";',
    'import { buildRegionCustomerCopy } from "./src/lib/region-customer-copy.ts";',
    'import { buildRegionEditorialCopy } from "./src/lib/region-editorial-copy.ts";',
    'import { buildRegionSeoCopy } from "./src/lib/region-seo-copy.ts";',
    'import { getAllRegionStaticParams, getRegionBreadcrumbs, resolveRegionNode } from "./src/lib/regions.ts";',
    `const brands = /${ALL_BRANDS.map(escapeRegExp).join("|")}/giu;`,
    'const hash = (value) => createHash("sha256").update(value).digest("hex");',
    'const clean = (value) => value.replace(/\\s+/gu, " ").trim();',
    'const substantive = (value) => (value.match(/[가-힣]/gu) ?? []).length >= 12;',
    'function strings(value, output = []) {',
    '  if (typeof value === "string") output.push(value);',
    '  else if (Array.isArray(value)) for (const item of value) strings(item, output);',
    '  else if (value && typeof value === "object") for (const item of Object.values(value)) strings(item, output);',
    '  return output;',
    '}',
    'const exact = new Set(); const normalized = new Set(); let routeCount = 0;',
    'for (const params of getAllRegionStaticParams()) {',
    '  const node = resolveRegionNode(params.segments); if (!node) continue; routeCount += 1;',
    '  const objects = [];',
    '  try { objects.push(buildRegionCustomerCopy(node, node.displayName)); } catch {}',
    '  try { objects.push(buildRegionEditorialCopy(node, node.displayName)); } catch {}',
    '  try { objects.push(buildRegionSeoCopy(node)); } catch {}',
    '  const labels = [...new Set([node.displayName, node.qualifiedName, ...getRegionBreadcrumbs(node).map((item) => item.name)])]',
    '    .filter(Boolean).sort((left, right) => right.length - left.length);',
    '  for (const value of strings(objects)) {',
    '    const cleaned = clean(value); if (substantive(cleaned)) exact.add(hash(cleaned));',
    '    const regional = labels.reduce((copy, label) => copy.replaceAll(label, "{지역}"), cleaned).replace(brands, "{브랜드}");',
    '    if (substantive(regional)) normalized.add(hash(regional));',
    '  }',
    '}',
    'process.stdout.write(JSON.stringify({ routeCount, exact: [...exact], normalized: [...normalized] }));',
  ].join("\n");
}

function runRuntime(repository) {
  const code =
    repository.mode === "massagebom-runtime"
      ? massageBomRuntimeCode()
      : genericRuntimeCode();
  const raw = execFileSync(TSX_BIN, ["-e", code], {
    cwd: repository.root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  const parsed = JSON.parse(raw);
  if (
    !Number.isInteger(parsed.routeCount) ||
    parsed.routeCount <= 0 ||
    !Array.isArray(parsed.exact) ||
    !Array.isArray(parsed.normalized)
  ) {
    throw new Error(`BABY_COPY_AUDIT_RUNTIME_INVALID:${repository.root}`);
  }
  return {
    routeCount: parsed.routeCount,
    exact: new Set(parsed.exact),
    normalized: new Set(parsed.normalized),
  };
}

function snapshotRuntime(repository) {
  const file = path.join(repository.root, repository.snapshot);
  const snapshot = JSON.parse(readFileSync(file, "utf8"));
  const records = snapshot.entries ?? snapshot.documents;
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`BABY_COPY_AUDIT_SNAPSHOT_INVALID:${file}`);
  }
  const exact = new Set();
  const normalized = new Set();
  for (const record of records) {
    const labels = [
      record.regionName,
      record.commercialName,
      record.localityLabel,
      ...(record.regionAliases ?? []),
      ...(record.keywordPrefixes ?? []),
    ]
      .filter(Boolean)
      .sort((left, right) => right.length - left.length);
    for (const value of collectStrings(record)) {
      const cleaned = clean(value);
      if (isSubstantive(cleaned)) exact.add(digest(cleaned));
      const regional = labels
        .reduce((copy, label) => copy.replaceAll(label, "{지역}"), cleaned)
        .replace(BRAND_PATTERN, "{브랜드}");
      if (isSubstantive(regional)) normalized.add(digest(regional));
    }
  }
  return { routeCount: records.length, exact, normalized };
}

function comparatorCorpus(repository) {
  const exact = new Set();
  const normalized = new Set();
  const sourceFiles = listCustomerSourceFiles(repository.root);
  for (const file of sourceFiles) {
    for (const value of extractFileStrings(file)) {
      const cleaned = clean(value);
      if (isSubstantive(cleaned)) exact.add(digest(cleaned));
      const sourceNormalized = normalizeSource(value);
      if (isSubstantive(sourceNormalized)) normalized.add(digest(sourceNormalized));
    }
  }
  const runtime =
    repository.mode === "snapshot"
      ? snapshotRuntime(repository)
      : runRuntime(repository);
  return {
    sourceFileCount: sourceFiles.length,
    runtimeRouteCount: runtime.routeCount,
    exact: new Set([...exact, ...runtime.exact]),
    normalized: new Set([...normalized, ...runtime.normalized]),
  };
}

function runtimeRegionValues(content) {
  return [
    content.title,
    content.description,
    content.h1,
    ...content.hooks,
    content.faqIntro,
    ...content.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
    ]),
  ];
}

function runtimeBlogValues(post) {
  return [
    post.title,
    post.description,
    post.intro,
    ...post.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
    ]),
    ...post.checklist,
  ];
}

const targetExact = new Map();
const targetNormalized = new Map();
const targetRegionRecords = [];
for (const site of ALL_BABY_SITES) {
  for (const node of getRegionNodesForSite(site)) {
    const content = createRegionContent(node, site);
    targetRegionRecords.push({ site, node, content });
    for (const value of runtimeRegionValues(content)) {
      addValue(targetExact, value);
      addValue(targetNormalized, value, (entry) =>
        normalizeRegional(entry, site, node),
      );
    }
  }
  const home = getRegionNodesForSite(site)[0];
  if (!home) throw new Error(`BABY_COPY_AUDIT_HOME_MISSING:${site.key}`);
  for (const post of getBlogPosts(site)) {
    for (const value of runtimeBlogValues(post)) {
      addValue(targetExact, value);
      addValue(targetNormalized, value, (entry) =>
        normalizeRegional(entry, site, home),
      );
    }
  }
}

const targetSourceFiles = listCustomerSourceFiles(ROOT);
for (const file of targetSourceFiles) {
  for (const value of extractFileStrings(file)) {
    addValue(targetExact, value);
    addValue(targetNormalized, value, normalizeSource);
  }
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].filter(([, count]) => count > 1);
}

const normalizedMetaTitles = targetRegionRecords.map(({ site, node, content }) =>
  normalizeRegional(content.title, site, node),
);
const normalizedDescriptions = targetRegionRecords.map(({ site, node, content }) =>
  normalizeRegional(content.description, site, node),
);
const normalizedH1s = targetRegionRecords.map(({ site, node, content }) =>
  normalizeRegional(content.h1, site, node),
);
const normalizedParagraphs = targetRegionRecords.flatMap(({ site, node, content }) =>
  [...content.hooks, ...content.sections.flatMap((section) => section.paragraphs)].map(
    (value) => normalizeRegional(value, site, node),
  ),
);
const normalizedSignatures = targetRegionRecords.map(({ site, node, content }) =>
  normalizeRegional(
    [
      content.description,
      ...content.hooks,
      ...content.sections.flatMap((section) => section.paragraphs),
    ].join("\u001f"),
    site,
    node,
  ),
);

const comparisons = {};
for (const repository of AUTHORITATIVE_REPOSITORIES) {
  const corpus = comparatorCorpus(repository);
  const exactCollisions = [...targetExact]
    .filter(([hash]) => corpus.exact.has(hash))
    .map(([, value]) => value)
    .sort();
  const normalizedCollisions = [...targetNormalized]
    .filter(([hash]) => corpus.normalized.has(hash))
    .map(([, value]) => value)
    .sort();
  comparisons[repository.id] = {
    absolutePath: repository.root,
    sourceFileCount: corpus.sourceFileCount,
    runtimeRouteCount: corpus.runtimeRouteCount,
    substantiveExactCollisions: {
      count: exactCollisions.length,
      examples: exactCollisions.slice(0, 8),
    },
    brandRegionNormalizedCollisions: {
      count: normalizedCollisions.length,
      examples: normalizedCollisions.slice(0, 8),
    },
  };
}

const officialSuffixLeaks = targetRegionRecords.flatMap(({ site, content, node }) => {
  if (site.searchName === site.officialName) return [];
  const fields = [
    content.title,
    content.description,
    content.h1,
    ...content.keywords,
    ...content.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
    ]),
  ];
  return fields
    .filter((value) => value.includes(site.officialName))
    .map((value) => ({ site: site.key, route: node.path, value }));
});

const report = {
  status: "PASS",
  authoritativeRepositoryCount: AUTHORITATIVE_REPOSITORIES.length,
  authoritativeRepositories: AUTHORITATIVE_REPOSITORIES.map((item) => item.root),
  targetSourceFileCount: targetSourceFiles.length,
  targetSiteCount: ALL_BABY_SITES.length,
  targetRegionalRouteCount: targetRegionRecords.length,
  targetBlogPostCount: ALL_BABY_SITES.reduce(
    (total, site) => total + getBlogPosts(site).length,
    0,
  ),
  normalizedMetaTitleCollisions: duplicateValues(normalizedMetaTitles).length,
  normalizedDescriptionCollisions: duplicateValues(normalizedDescriptions).length,
  normalizedH1Collisions: duplicateValues(normalizedH1s).length,
  normalizedParagraphCollisions: duplicateValues(normalizedParagraphs).length,
  normalizedSignatureCollisions: duplicateValues(normalizedSignatures).length,
  officialSuffixLeakCount: officialSuffixLeaks.length,
  officialSuffixLeakExamples: officialSuffixLeaks.slice(0, 8),
  allowlist: {
    ownerExactFactCount: OWNER_EXACT_ALLOWLIST.size,
    structuralLabelCount: STRUCTURAL_ALLOWLIST.size,
  },
  comparisons,
};

const internalPass =
  report.authoritativeRepositoryCount === 8 &&
  report.targetSiteCount === 27 &&
  report.targetRegionalRouteCount === 455 &&
  report.targetBlogPostCount === 54 &&
  report.normalizedMetaTitleCollisions === 0 &&
  report.normalizedDescriptionCollisions === 0 &&
  report.normalizedH1Collisions === 0 &&
  report.normalizedParagraphCollisions === 0 &&
  report.normalizedSignatureCollisions === 0 &&
  report.officialSuffixLeakCount === 0;
const externalPass = Object.values(comparisons).every(
  (comparison) =>
    comparison.substantiveExactCollisions.count === 0 &&
    comparison.brandRegionNormalizedCollisions.count === 0,
);
if (!internalPass || !externalPass) report.status = "FAIL";

console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
