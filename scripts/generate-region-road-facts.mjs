import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ALL_BABY_SITES } from "../src/lib/site-config.ts";
import {
  getRegionNodesForSite,
  getRegionParentForSite,
} from "../src/lib/regions.ts";

const GENERATED_PATH = resolve("src/data/region-road-facts.generated.ts");
const SOURCE_MARKER_START = "// BABY_REGION_ROAD_SOURCE_JSON_START";
const SOURCE_MARKER_END = "// BABY_REGION_ROAD_SOURCE_JSON_END";
const DATA_MARKER_START = "// BABY_REGION_ROAD_DATA_JSON_START";
const DATA_MARKER_END = "// BABY_REGION_ROAD_DATA_JSON_END";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseMarkedJson(sourceText, start, end) {
  const startIndex = sourceText.indexOf(start);
  const endIndex = sourceText.indexOf(end);
  if (startIndex < 0 || endIndex <= startIndex) {
    throw new Error(`BABY_REGION_ROAD_MARKER:${start}`);
  }
  return JSON.parse(
    sourceText.slice(startIndex + start.length, endIndex).trim(),
  );
}

function validateGenerated(sourceContract, generatedFacts, exportedDigest) {
  if (
    sourceContract.agency !==
      "행정안전부 도로명주소 업무 시스템 / 한국지역정보개발원" ||
    sourceContract.snapshotDate !== "2026-07-31" ||
    sourceContract.archiveSha256 !==
      "da5c4007d696bf98f066b3832b53dc1f95d85b32fe1c479b7be79c42b3c6c1d9" ||
    sourceContract.roadNameArchiveSha256 !==
      "9234d8ed1c2fa8bd13e18e5a4a5f66e9b5dea409421845ec77dd01a33e3f365f" ||
    sourceContract.roadNameEntrySha256 !==
      "2dab7220a8602fbc5711123641c932a93e4a70578dd6c9bf1a1803943028e57c"
  ) {
    throw new Error("BABY_REGION_ROAD_GENERATED_SOURCE");
  }
  const computedDigest = `sha256:${sha256(JSON.stringify(generatedFacts))}`;
  if (
    exportedDigest !== computedDigest ||
    sourceContract.dataDigest !== computedDigest
  ) {
    throw new Error("BABY_REGION_ROAD_GENERATED_DIGEST");
  }
  const expected = new Map();
  for (const site of ALL_BABY_SITES) {
    for (const node of getRegionNodesForSite(site)) {
      if (node.kind !== "representative") continue;
      expected.set(`${site.key}:${node.path}`, {
        sourceCodes: new Set(
          node.records.flatMap((record) => record.sourceCodes),
        ),
        legalNames: new Set(
          node.records.flatMap((record) =>
            record.legalAreas.map((area) => area.name),
          ),
        ),
      });
    }
  }
  if (
    expected.size !== 404 ||
    Object.keys(generatedFacts).length !== expected.size
  ) {
    throw new Error("BABY_REGION_ROAD_GENERATED_ROUTE_COUNT");
  }
  for (const [route, contract] of expected) {
    const routeFacts = generatedFacts[route];
    if (!Array.isArray(routeFacts) || routeFacts.length === 0) {
      throw new Error(`BABY_REGION_ROAD_GENERATED_ROUTE:${route}`);
    }
    for (const fact of routeFacts) {
      if (
        !contract.sourceCodes.has(fact.adminCode) ||
        !contract.legalNames.has(fact.legalName) ||
        typeof fact.roadName !== "string" ||
        fact.roadName.length === 0 ||
        !Array.isArray(fact.roadNames) ||
        fact.roadNames.length !== 8 ||
        !Array.isArray(fact.roadLegalNames) ||
        fact.roadLegalNames.some((name) => !contract.legalNames.has(name))
      ) {
        throw new Error(`BABY_REGION_ROAD_GENERATED_FACT:${route}`);
      }
    }
  }
  return {
    routeCount: expected.size,
    dataDigest: computedDigest,
  };
}

if (process.argv.includes("--check")) {
  const generated = readFileSync(GENERATED_PATH, "utf8");
  const sourceContract = parseMarkedJson(
    generated,
    SOURCE_MARKER_START,
    SOURCE_MARKER_END,
  );
  const generatedFacts = parseMarkedJson(
    generated,
    DATA_MARKER_START,
    DATA_MARKER_END,
  );
  const digestMatch = generated.match(
    /REGION_ROAD_FACT_DATA_DIGEST = "([^"]+)"/u,
  );
  if (!digestMatch) throw new Error("BABY_REGION_ROAD_GENERATED_DIGEST_EXPORT");
  process.stdout.write(
    `${JSON.stringify(validateGenerated(sourceContract, generatedFacts, digestMatch[1]))}\n`,
  );
  process.exit(0);
}

const sourcePathArgument = process.argv[2];
const roadArchivePathArgument = process.argv[3];
if (!sourcePathArgument || !roadArchivePathArgument) {
  throw new Error(
    "Usage: node --import tsx scripts/generate-region-road-facts.mjs /absolute/path/to/address-samples.json /absolute/path/to/JUSUZR_DB_ALL_2607.zip",
  );
}

const sourcePath = resolve(sourcePathArgument);
const roadArchivePath = resolve(roadArchivePathArgument);
const source = JSON.parse(readFileSync(sourcePath, "utf8"));
if (
  source?.source?.agency !==
    "행정안전부 도로명주소 업무 시스템 / 한국지역정보개발원" ||
  source?.source?.snapshot_date !== "2026-07-31" ||
  source?.source?.archive_sha256 !==
    "da5c4007d696bf98f066b3832b53dc1f95d85b32fe1c479b7be79c42b3c6c1d9"
) {
  throw new Error("BABY_REGION_ROAD_FACT_SOURCE_MISMATCH");
}

const roadArchive = readFileSync(roadArchivePath);
const roadArchiveSha256 = createHash("sha256")
  .update(roadArchive)
  .digest("hex");
if (
  roadArchiveSha256 !==
  "9234d8ed1c2fa8bd13e18e5a4a5f66e9b5dea409421845ec77dd01a33e3f365f"
) {
  throw new Error("BABY_REGION_ROAD_NAME_ARCHIVE_MISMATCH");
}
const roadEntry = execFileSync(
  "unzip",
  ["-p", roadArchivePath, "TN_SPRD_RDNM.txt"],
  { maxBuffer: 100 * 1024 * 1024 },
);
const roadEntrySha256 = createHash("sha256").update(roadEntry).digest("hex");
if (
  roadEntrySha256 !==
  "2dab7220a8602fbc5711123641c932a93e4a70578dd6c9bf1a1803943028e57c"
) {
  throw new Error("BABY_REGION_ROAD_NAME_ENTRY_MISMATCH");
}
const roadText = execFileSync(
  "iconv",
  ["-f", "CP949", "-t", "UTF-8"],
  { input: roadEntry, maxBuffer: 100 * 1024 * 1024 },
).toString("utf8");
const roadNamesByArea = new Map();
for (const line of roadText.split(/\r?\n/u)) {
  if (!line) continue;
  const fields = line.split("|");
  const roadName = fields[3];
  const provinceName = fields[5];
  const districtName = fields[6];
  const legalName = fields[9];
  if (
    provinceName !== "경기도" ||
    !roadName ||
    !districtName ||
    !legalName
  ) {
    continue;
  }
  const key = `${districtName}:${legalName}`;
  const names = roadNamesByArea.get(key) ?? [];
  if (!names.includes(roadName)) names.push(roadName);
  roadNamesByArea.set(key, names);
}

const sampleByAdminCode = new Map(
  source.samples.map((sample) => [sample.admin_code, sample]),
);
const facts = {};

function selectDiverseRoadNames(values, limit) {
  const sorted = [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, "ko"),
  );
  const selected = [];
  const families = new Set();
  for (const roadName of sorted) {
    const family = roadName.replace(/[0-9]+/gu, "");
    if (families.has(family)) continue;
    selected.push(roadName);
    families.add(family);
    if (selected.length === limit) return selected;
  }
  for (const roadName of sorted) {
    if (selected.includes(roadName)) continue;
    selected.push(roadName);
    if (selected.length === limit) return selected;
  }
  return selected;
}

for (const site of ALL_BABY_SITES) {
  for (const node of getRegionNodesForSite(site)) {
    if (node.kind !== "representative") continue;
    const parent = getRegionParentForSite(site, node);
    const roadDistrictName = parent?.kind === "district"
      ? `${site.officialName} ${parent.displayName}`
      : site.officialName;
    const samples = node.records
      .flatMap((record) => record.sourceCodes)
      .map((sourceCode) => sampleByAdminCode.get(sourceCode))
      .filter(Boolean);
    if (samples.length === 0) {
      throw new Error(`BABY_REGION_ROAD_FACT_MISSING:${site.key}:${node.path}`);
    }
    const verified = samples.every(
      (sample) =>
        sample.verification?.admin_name_matches_kikcd_h === true &&
        sample.verification?.legal_code_exists_in_kikcd_b === true &&
        sample.verification?.legal_fields_match_kikcd_b === true &&
        sample.verification?.admin_legal_pair_exists_in_kikmix === true &&
        sample.verification?.active_road_code === true &&
        typeof sample.road_name === "string" &&
        sample.road_name.length > 0,
    );
    if (!verified) {
      throw new Error(`BABY_REGION_ROAD_FACT_UNVERIFIED:${site.key}:${node.path}`);
    }
    const nodeLegalNames = [
      ...new Set(
        node.records.flatMap((record) =>
          record.legalAreas.map((area) => area.name),
        ),
      ),
    ];
    const nodeRoadNames = selectDiverseRoadNames(
      nodeLegalNames.flatMap(
        (legalName) =>
          roadNamesByArea.get(`${roadDistrictName}:${legalName}`) ?? [],
      ),
      8,
    );
    if (nodeRoadNames.length < 8) {
      throw new Error(
        `BABY_REGION_ROAD_NAME_COVERAGE:${site.key}:${node.path}`,
      );
    }
    const uniqueRoads = [
      ...new Map(
        samples.map((sample) => [
          sample.road_name,
          {
            adminCode: sample.admin_code,
            adminName: sample.admin_name,
            legalName: sample.legal_ri ?? sample.legal_eupmyeondong,
            roadName: sample.road_name,
            roadNames: nodeRoadNames,
            roadDistrictName,
            roadLegalNames: nodeLegalNames,
            selectionTier: sample.selection.tier,
          },
        ]),
      ).values(),
    ];
    facts[`${site.key}:${node.path}`] = uniqueRoads;
  }
}

if (Object.keys(facts).length !== 404) {
  throw new Error(
    `BABY_REGION_ROAD_FACT_COUNT:${Object.keys(facts).length}:expected=404`,
  );
}

const dataDigest = `sha256:${sha256(JSON.stringify(facts))}`;

const output = `// Generated by scripts/generate-region-road-facts.mjs. Do not hand-edit.

export const REGION_ROAD_FACT_SOURCE = Object.freeze(
${SOURCE_MARKER_START}
${JSON.stringify(
  {
    agency: source.source.agency,
    dataset: source.source.dataset,
    snapshotDate: source.source.snapshot_date,
    archiveSha256: source.source.archive_sha256,
    downloadPageUrl: source.source.download_page_url,
    schemaUrl: source.source.schema_url,
    kikEffectiveDate: source.source.kik_snapshot.effective_date,
    kikArchiveSha256: source.source.kik_snapshot.archive_sha256,
    roadNameDataset: "도로명(월전체)",
    roadNameSnapshot: "2026-07",
    roadNameArchiveSha256: roadArchiveSha256,
    roadNameEntrySha256: roadEntrySha256,
    roadNameDownloadPageUrl:
      "https://business.juso.go.kr/jst/jstAddressDownload?menu=6",
    dataDigest,
  },
  null,
  2,
)}
${SOURCE_MARKER_END}
);

export const REGION_ROAD_FACT_DATA_DIGEST = "${dataDigest}" as const;

export type RegionRoadFact = Readonly<{
  adminCode: string;
  adminName: string;
  legalName: string;
  roadName: string;
  roadNames: readonly string[];
  roadDistrictName: string;
  roadLegalNames: readonly string[];
  selectionTier: "administrative_center" | "public_building" | "named_non_residential_building";
}>;

const REGION_ROAD_FACTS: Readonly<Record<string, readonly RegionRoadFact[]>> =
${DATA_MARKER_START}
${JSON.stringify(
  facts,
  null,
  2,
)}
${DATA_MARKER_END}
;

export function getRegionRoadFacts(
  siteKey: string,
  path: string,
): readonly RegionRoadFact[] {
  return REGION_ROAD_FACTS[\`\${siteKey}:\${path}\`] ?? [];
}
`;

writeFileSync(
  GENERATED_PATH,
  output,
  "utf8",
);
process.stdout.write(
  `${JSON.stringify({ routes: Object.keys(facts).length, source: sourcePath, dataDigest })}\n`,
);
