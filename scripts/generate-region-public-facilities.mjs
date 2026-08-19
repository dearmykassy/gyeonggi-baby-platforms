import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const INVENTORY_PATH = resolve(ROOT, "src/data/city-regions.generated.json");
const OUTPUT_PATH = resolve(
  ROOT,
  "src/data/region-public-facilities.generated.ts",
);
const PROTOTYPE_SHA256 =
  "416d59929bf242462470537253002309f9dfc45e5815ee85bd6b73ddbe4cbada";
const ARCHIVE_SHA256 =
  "da5c4007d696bf98f066b3832b53dc1f95d85b32fe1c479b7be79c42b3c6c1d9";
const ENTRY_CONTRACT = Object.freeze({
  auxiliary: Object.freeze({
    name: "부가정보_경기도.txt",
    bytes: 61_233_163,
    sha256: "80100767469d36f8464b5b1980bf1ca5e0579d037ae4ab3d5c7bbfc38decb7e7",
  }),
  address: Object.freeze({
    name: "주소_경기도.txt",
    bytes: 63_540_625,
    sha256: "c18fd7e2c0b4077d8bfa17c196d748674f2325568a4a87883430b3d785991684",
  }),
  roadCode: Object.freeze({
    name: "개선_도로명코드_전체분.txt",
    bytes: 41_544_497,
    sha256: "2b0295cdbf0accac1a31ea4112d6b04ef380228810ea89ed7e274daca7ab5896",
  }),
  jibun: Object.freeze({
    name: "지번_경기도.txt",
    bytes: 102_576_380,
    sha256: "793a13c95d16d262399201a7ef351900709ef57d91b648534b34f5aa06a114d3",
  }),
});

const SOURCE_MARKER_START = "/* REGION_PUBLIC_FACILITY_SOURCE_JSON_START */";
const SOURCE_MARKER_END = "/* REGION_PUBLIC_FACILITY_SOURCE_JSON_END */";
const DATA_MARKER_START = "/* REGION_PUBLIC_FACILITY_DATA_JSON_START */";
const DATA_MARKER_END = "/* REGION_PUBLIC_FACILITY_DATA_JSON_END */";
const LOW_ROUTE =
  "hanam:/areas/%EC%B4%88%EC%9D%B4%EB%8F%99/";
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const FACT_FIELDS = Object.freeze([
  "name",
  "category",
  "adminCode",
  "adminName",
  "roadName",
  "legalName",
  "sourceField",
  "auxRowSha256",
  "addressRowSha256",
  "roadCodeRowSha256",
  "jibunRowSha256",
]);
const CATEGORIES = new Set([
  "admin_center",
  "public_safety",
  "public_government",
  "education",
  "public_institution",
  "postal",
  "public_health",
  "public_welfare",
  "public_culture",
  "public_sports",
  "public_infrastructure",
  "public_parking",
]);
const CATEGORY_ORDER = [...CATEGORIES];

const PRIMARY_VERIFICATION = Object.freeze({
  "MTV 환경문화센터": Object.freeze({
    agency: "한국수자원공사(K-water)",
    url: "https://www.kwater.or.kr/website/tlight/BBSMSTR_000000000028/1587/view.do",
  }),
  해양생태과학관: Object.freeze({
    agency: "시흥시",
    url: "https://share.siheung.go.kr/hmpg/shmg/shap/shapDetail.do?shang_resces_mng_no=9B06DA3CCA9511F09EF8FA163E4CDE4B",
  }),
});

const RELIGIOUS =
  /교회|성당|사찰|암자|선교|성전|기도원|수도원|불교|원불교|천주교|침례|장로|감리|순복음|성결|성분도|신학|기독|교구|가톨릭|카톨릭|SGI|IYF/iu;
const RESIDENTIAL =
  /아파트|\bAPT\b|빌라|연립|다세대|오피스텔|원룸|고시원|기숙사|생활관|숙소|사택|관사|맨션|캐슬|팰리스|타운하우스|도시형생활|레지던스|펜션|행복주택/iu;
const MEDICAL =
  /병원|의원|약국|한의원|치과|클리닉|산후조리|요양원|요양병원|안마원/u;
const CHILDCARE = /어린이집|보육원|유치원/u;
const COMPANY =
  /주식회사|㈜|\(주\)|주\)|유한회사|영농조합|협동조합|공장|창고|물류센터|산업단지|무역|용역|교역|팩토리|테크노|건축사|택시/u;
const RETAIL =
  /상가|마트|슈퍼|백화점|쇼핑몰|아울렛|편의점|호텔|모텔|리조트|카페|식당|음식점|골프|헬스|웨딩|장례|프라자|플라자|빌딩|타워|스퀘어|오피스|시장(?=\s|제\d|공영|$)/u;
const PII =
  /(?:0\d{1,2}[- ]?)?\d{3,4}[- ]\d{4}|\d{8,}|소유자|대표자|외\s*\d+\s*(?:명|인)|개인|제[12]종근린생활시설\s*\([^)]{2,}\)/u;
const AUXILIARY = /자율방범|모범운전자|의용소방|직장어린이집|동아리실/u;
const ADDRESS_LIKE_NAME = /\d+\s*-\s*\d+/u;
const TRANSIT_STOP_NAME = /(?:정거장|역)$/u;
const COMPOSITE_OR_RESIDENTIAL_NAME = /[,/]|및|입주자|집회소/u;
const KNOWN_AGENCIES = Object.freeze([
  "국민건강보험공단",
  "국민연금공단",
  "근로복지공단",
  "신용보증기금",
  "한국농어촌공사",
  "한국도로교통공단",
  "한국수자원공사",
  "한국전력공사",
  "한국토지주택공사",
  "한국산업인력공단",
  "한국가스안전공사",
  "한국전기안전공사",
  "한국국토정보공사",
  "한국도로공사",
  "한국국제협력단",
]);
const SOURCE_FIELDS = Object.freeze({
  7: "sigungu_building_name",
  6: "building_registry_name",
  5: "bulk_delivery_name",
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256File(path) {
  const digest = createHash("sha256");
  for await (const block of createReadStream(path)) digest.update(block);
  return digest.digest("hex");
}

function normalizeAdminName(value) {
  return value.normalize("NFKC").replace(/[\s·ㆍ.,/()\-]+/gu, "");
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function forEachRawLine(buffer, callback) {
  let start = 0;
  for (let index = 0; index <= buffer.length; index += 1) {
    if (index !== buffer.length && buffer[index] !== 0x0a) continue;
    let end = index;
    if (end > start && buffer[end - 1] === 0x0d) end -= 1;
    if (end > start) callback(buffer.subarray(start, end));
    start = index + 1;
  }
}

function extractEntryBySize(archivePath, expected) {
  const python = String.raw`
import sys, zipfile
archive_path = sys.argv[1]
expected_size = int(sys.argv[2])
with zipfile.ZipFile(archive_path) as archive:
    matches = [item for item in archive.infolist() if item.file_size == expected_size]
    if len(matches) != 1:
        raise SystemExit(f"ENTRY_SIZE_MATCH:{expected_size}:{len(matches)}")
    sys.stdout.buffer.write(archive.read(matches[0]))
`;
  const value = execFileSync(
    "python3",
    ["-c", python, archivePath, String(expected.bytes)],
    { maxBuffer: 256 * 1024 * 1024 },
  );
  const actual = sha256(value);
  if (actual !== expected.sha256) {
    throw new Error(
      `BABY_PUBLIC_FACILITY_ENTRY_SHA:${expected.name}:${actual}`,
    );
  }
  return value;
}

function classifyFacility(name, leaf) {
  if (
    !name ||
    name.length > 100 ||
    name.startsWith("구 ") ||
    PII.test(name) ||
    RESIDENTIAL.test(name) ||
    RELIGIOUS.test(name) ||
    MEDICAL.test(name) ||
    CHILDCARE.test(name) ||
    AUXILIARY.test(name) ||
    ADDRESS_LIKE_NAME.test(name) ||
    TRANSIT_STOP_NAME.test(name) ||
    COMPOSITE_OR_RESIDENTIAL_NAME.test(name)
  ) {
    return null;
  }
  if (Object.hasOwn(PRIMARY_VERIFICATION, name)) return "public_culture";
  if (
    /(?:초등학교|중학교|고등학교|특수학교|대학교)(?:$|[,/ ])/u.test(
      name,
    ) &&
    !/학원|학교법인/u.test(name)
  ) {
    return "education";
  }
  if (name.includes("공영주차장")) return "public_parking";
  if (COMPANY.test(name) || RETAIL.test(name)) return null;
  if (
    /행정복지센터|주민자치센터|주민센터|읍사무소|면사무소|동사무소/u.test(
      name,
    ) &&
    !name.includes("이주민")
  ) {
    const compact = name.replace(/[\s,./()]+/gu, "");
    if (
      new Set([
        "주민센터",
        "주민자치센터",
        "행정복지센터",
        "읍사무소",
        "면사무소",
        "동사무소",
      ]).has(compact)
    ) {
      return null;
    }
    return "admin_center";
  }
  if (/(?:시청|군청|구청)(?:$|[,/ ])/u.test(name)) {
    return "public_government";
  }
  if (
    /세무서|등기소|선거관리위원회|지방법원|가정법원|검찰청|교육지원청|교육청|국토관리사무소|국립농산물품질관리원/u.test(
      name,
    )
  ) {
    return "public_government";
  }
  if (/보건소|보건지소|보건진료소/u.test(name)) {
    if (new Set(["보건소", "보건지소", "보건진료소"]).has(name.replace(/[\s,./()]+/gu, ""))) {
      return null;
    }
    return "public_health";
  }
  if (
    /경찰서|소방서|파출소|지구대|치안센터|119(?:안전센터|지역대|구조대|파견소)/u.test(
      name,
    )
  ) {
    if (
      new Set([
        "경찰서",
        "소방서",
        "파출소",
        "지구대",
        "치안센터",
        "119안전센터",
        "119지역대",
        "119구조대",
      ]).has(name.replace(/[\s,./()]+/gu, ""))
    ) {
      return null;
    }
    return "public_safety";
  }
  if (/우체국$/u.test(name)) return "postal";
  if (KNOWN_AGENCIES.some((agency) => name.includes(agency))) {
    return "public_institution";
  }
  if (
    /(?:배수지|정수장|공공하수처리장|하수처리장|자원회수시설|배수펌프장|우수펌프장|공영차고지|도시환경사업소|농업기술센터)(?:$|[,/ ])/u.test(
      name,
    ) &&
    !name.includes("관리사")
  ) {
    return "public_infrastructure";
  }
  if (/[A-Za-z]{2,}/u.test(name)) return null;
  if (
    /경로당|노인정|노인회관|마을회관|복지회관|노인복지관|장애인복지관|종합사회복지관|노동복지회관|다목적복지회관|보훈회관/u.test(
      name,
    )
  ) {
    if (
      new Set([
        "경로당",
        "노인정",
        "노인회관",
        "마을회관",
        "복지회관",
        "노인복지관",
        "장애인복지관",
        "종합사회복지관",
        "보훈회관",
      ]).has(name.replace(/[\s,./()]+/gu, "")) ||
      /재가|주간보호|지원센터|협회/u.test(name)
    ) {
      return null;
    }
    return "public_welfare";
  }
  if (
    /국민체육센터|시립테니스장|공설운동장|종합운동장|학생체육관|시민체육관|반다비.*체육센터|공원관리사무소/u.test(
      name,
    )
  ) {
    return "public_sports";
  }
  const localNames = new Set([
    leaf.site.searchName,
    leaf.site.officialName,
    ...(leaf.site.districtNames ?? []),
    leaf.region.district,
  ]);
  if (
    /국립.*(?:박물관|미술관|기념관|전시관|도서관)|(?:시립|도립|군립|구립|공공|교육)도서관/u.test(
      name,
    )
  ) {
    return "public_culture";
  }
  if (
    [...localNames].some((value) => value && name.includes(value)) &&
    /도서관|박물관|미술관|청소년수련관|문화예술회관|아트센터|전시관|평생교육센터|평생학습관/u.test(
      name,
    )
  ) {
    return "public_culture";
  }
  if (/문화유산해설사안내소$/u.test(name)) return "public_culture";
  return null;
}

function createInventoryContract(inventory) {
  const leaves = [];
  const byCode = new Map();
  for (const site of inventory.sites) {
    for (const region of site.regions) {
      const route = `${site.key}:${region.path}`;
      const leaf = {
        route,
        site,
        region,
        sourceNameNorms: new Set(
          region.sourceNames.map((name) => normalizeAdminName(name)),
        ),
      };
      leaves.push(leaf);
      for (const code of region.sourceCodes) {
        const values = byCode.get(code) ?? [];
        values.push(leaf);
        byCode.set(code, values);
      }
    }
  }
  return { leaves, byCode };
}

function selectDiverse(candidates, limit = 6) {
  const byCategory = new Map();
  for (const candidate of candidates.values()) {
    const values = byCategory.get(candidate.category) ?? [];
    values.push(candidate);
    byCategory.set(candidate.category, values);
  }
  for (const values of byCategory.values()) {
    values.sort((left, right) =>
      compareText(left.name, right.name) ||
      compareText(left.managementNumber, right.managementNumber),
    );
  }
  const selected = [];
  while (selected.length < limit) {
    let progressed = false;
    for (const category of CATEGORY_ORDER) {
      const values = byCategory.get(category);
      if (values?.length && selected.length < limit) {
        selected.push(values.shift());
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return selected;
}

function stripInternalFact(value) {
  return {
    name: value.name,
    category: value.category,
    adminCode: value.adminCode,
    adminName: value.adminName,
    roadName: value.roadName,
    legalName: value.legalName,
    sourceField: value.sourceField,
    auxRowSha256: value.auxRowSha256,
    addressRowSha256: value.addressRowSha256,
    roadCodeRowSha256: value.roadCodeRowSha256,
    jibunRowSha256: value.jibunRowSha256,
  };
}

function parseMarkedJson(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error(`BABY_PUBLIC_FACILITY_MARKER:${start}`);
  }
  return JSON.parse(source.slice(startIndex + start.length, endIndex).trim());
}

function validateFacts(inventory, source, facts, expectedDigest) {
  const expectedRoutes = new Map();
  for (const site of inventory.sites) {
    for (const region of site.regions) {
      expectedRoutes.set(`${site.key}:${region.path}`, region);
    }
  }
  const actualRoutes = Object.keys(facts);
  if (actualRoutes.length !== 404 || expectedRoutes.size !== 404) {
    throw new Error(
      `BABY_PUBLIC_FACILITY_ROUTE_COUNT:${actualRoutes.length}:${expectedRoutes.size}`,
    );
  }
  if (
    actualRoutes.some((route) => !expectedRoutes.has(route)) ||
    [...expectedRoutes.keys()].some((route) => !(route in facts))
  ) {
    throw new Error("BABY_PUBLIC_FACILITY_ROUTE_SET");
  }
  let facilityCount = 0;
  for (const [route, region] of expectedRoutes) {
    const values = facts[route];
    const expectedMinimum = route === LOW_ROUTE ? 2 : 3;
    if (values.length < expectedMinimum || values.length > 6) {
      throw new Error(
        `BABY_PUBLIC_FACILITY_ROUTE_COVERAGE:${route}:${values.length}`,
      );
    }
    if (new Set(values.map((value) => value.name)).size !== values.length) {
      throw new Error(`BABY_PUBLIC_FACILITY_DUPLICATE:${route}`);
    }
    const sourceCodes = new Set(region.sourceCodes);
    const sourceNames = new Set(
      region.sourceNames.map((name) => normalizeAdminName(name)),
    );
    const legalNames = new Set(region.legalAreas.map((area) => area.name));
    for (const value of values) {
      facilityCount += 1;
      if (
        JSON.stringify(Object.keys(value).sort()) !==
        JSON.stringify([...FACT_FIELDS].sort())
      ) {
        throw new Error(`BABY_PUBLIC_FACILITY_FIELDS:${route}:${value.name}`);
      }
      if (
        !CATEGORIES.has(value.category) ||
        !sourceCodes.has(value.adminCode) ||
        !sourceNames.has(normalizeAdminName(value.adminName)) ||
        !legalNames.has(value.legalName)
      ) {
        throw new Error(`BABY_PUBLIC_FACILITY_JOIN:${route}:${value.name}`);
      }
      for (const field of FACT_FIELDS.slice(7)) {
        if (!SHA256_PATTERN.test(value[field])) {
          throw new Error(
            `BABY_PUBLIC_FACILITY_ROW_SHA:${route}:${value.name}:${field}`,
          );
        }
      }
      const hardUnsafe =
        RELIGIOUS.test(value.name) ||
        RESIDENTIAL.test(value.name) ||
        MEDICAL.test(value.name) ||
        CHILDCARE.test(value.name) ||
        PII.test(value.name) ||
        AUXILIARY.test(value.name) ||
        (COMPANY.test(value.name) && value.category !== "education") ||
        (RETAIL.test(value.name) && value.category !== "public_parking");
      if (hardUnsafe) {
        throw new Error(`BABY_PUBLIC_FACILITY_UNSAFE:${route}:${value.name}`);
      }
    }
  }
  const actualDigest = `sha256:${sha256(JSON.stringify(facts))}`;
  if (actualDigest !== expectedDigest || source.dataDigest !== actualDigest) {
    throw new Error(
      `BABY_PUBLIC_FACILITY_DIGEST:${actualDigest}:${expectedDigest}`,
    );
  }
  if (
    source.snapshotDate !== "2026-07-31" ||
    source.archiveSha256 !== ARCHIVE_SHA256 ||
    source.v3PrototypeSha256 !== PROTOTYPE_SHA256 ||
    source.routeCount !== 404 ||
    source.facilityCount !== facilityCount
  ) {
    throw new Error("BABY_PUBLIC_FACILITY_SOURCE_CONTRACT");
  }
  const serialized = JSON.stringify({ source, facts });
  if (/managementNumber|\/Users\/|\/private\/tmp\//u.test(serialized)) {
    throw new Error("BABY_PUBLIC_FACILITY_PRIVATE_PROVENANCE");
  }
  return { routeCount: actualRoutes.length, facilityCount, dataDigest: actualDigest };
}

function renderSource(source, facts, digest) {
  const sourceJson = JSON.stringify(source, null, 2);
  const factsJson = JSON.stringify(facts, null, 2);
  return `// Generated by scripts/generate-region-public-facilities.mjs. Do not hand-edit.

export const REGION_PUBLIC_FACILITY_SOURCE = Object.freeze(
${SOURCE_MARKER_START}
${sourceJson}
${SOURCE_MARKER_END}
);

export const REGION_PUBLIC_FACILITY_DATA_DIGEST = ${JSON.stringify(digest)} as const;

export type RegionPublicFacilityFact = Readonly<{
  name: string;
  category: ${[...CATEGORIES].map((value) => JSON.stringify(value)).join(" | ")};
  adminCode: string;
  adminName: string;
  roadName: string;
  legalName: string;
  sourceField: "sigungu_building_name" | "building_registry_name" | "bulk_delivery_name";
  auxRowSha256: string;
  addressRowSha256: string;
  roadCodeRowSha256: string;
  jibunRowSha256: string;
}>;

const REGION_PUBLIC_FACILITY_FACTS: Readonly<Record<string, readonly RegionPublicFacilityFact[]>> =
${DATA_MARKER_START}
${factsJson}
${DATA_MARKER_END};

export function getRegionPublicFacilityFacts(
  siteKey: string,
  path: string,
): readonly RegionPublicFacilityFact[] {
  return REGION_PUBLIC_FACILITY_FACTS[\`\${siteKey}:\${path}\`] ?? [];
}
`;
}

async function generate(archivePath, inventory) {
  const actualArchiveHash = await sha256File(archivePath);
  if (actualArchiveHash !== ARCHIVE_SHA256) {
    throw new Error(`BABY_PUBLIC_FACILITY_ARCHIVE_SHA:${actualArchiveHash}`);
  }
  const { leaves, byCode } = createInventoryContract(inventory);
  const decoder = new TextDecoder("euc-kr");
  const candidatesByRoute = new Map(
    leaves.map((leaf) => [leaf.route, new Map()]),
  );
  let eligibleExactAdminRows = 0;
  const auxiliary = extractEntryBySize(archivePath, ENTRY_CONTRACT.auxiliary);
  forEachRawLine(auxiliary, (rawLine) => {
    const fields = decoder.decode(rawLine).split("|");
    if (fields.length !== 9) return;
    const [managementNumber, adminCode, adminName] = fields;
    for (const leaf of byCode.get(adminCode) ?? []) {
      if (!leaf.sourceNameNorms.has(normalizeAdminName(adminName))) continue;
      eligibleExactAdminRows += 1;
      if (fields[8] !== "0") continue;
      const sourceIndex = [7, 6, 5].find((index) => fields[index].trim());
      if (sourceIndex === undefined) continue;
      const name = fields[sourceIndex].trim();
      const category = classifyFacility(name, leaf);
      if (!category) continue;
      const routeCandidates = candidatesByRoute.get(leaf.route);
      const value = {
        name,
        category,
        adminCode,
        adminName,
        managementNumber,
        sourceField: SOURCE_FIELDS[sourceIndex],
        auxRowSha256: sha256(rawLine),
      };
      // Keep every official row until its representative legal-area relation
      // has been checked. The lexically-first row for a shared facility name
      // can occasionally belong to a different legal unit.
      routeCandidates.set(`${name}\u0000${managementNumber}`, value);
    }
  });
  if (eligibleExactAdminRows !== 871_898) {
    throw new Error(
      `BABY_PUBLIC_FACILITY_ADMIN_ROWS:${eligibleExactAdminRows}`,
    );
  }
  const managementNumbers = new Set(
    [...candidatesByRoute.values()]
      .flatMap((values) => [...values.values()])
      .map((value) => value.managementNumber),
  );

  const addressByManagement = new Map();
  const address = extractEntryBySize(archivePath, ENTRY_CONTRACT.address);
  forEachRawLine(address, (rawLine) => {
    const fields = decoder.decode(rawLine).split("|");
    if (!managementNumbers.has(fields[0])) return;
    addressByManagement.set(fields[0], {
      roadCode: fields[1],
      emdSerial: fields[2],
      addressRowSha256: sha256(rawLine),
    });
  });
  const roadKeys = new Set(
    [...addressByManagement.values()].map(
      (value) => `${value.roadCode}:${value.emdSerial}`,
    ),
  );
  const roadByKey = new Map();
  const roadCode = extractEntryBySize(archivePath, ENTRY_CONTRACT.roadCode);
  forEachRawLine(roadCode, (rawLine) => {
    const fields = decoder.decode(rawLine).split("|");
    const key = `${fields[0]}:${fields[3]}`;
    if (fields.length < 17 || !roadKeys.has(key)) return;
    roadByKey.set(key, {
      roadName: fields[1],
      roadCodeRowSha256: sha256(rawLine),
    });
  });
  const legalByManagement = new Map();
  const jibun = extractEntryBySize(archivePath, ENTRY_CONTRACT.jibun);
  forEachRawLine(jibun, (rawLine) => {
    const fields = decoder.decode(rawLine).split("|");
    if (
      fields.length !== 11 ||
      !managementNumbers.has(fields[0]) ||
      fields[10] !== "1"
    ) {
      return;
    }
    legalByManagement.set(fields[0], {
      // The region inventory keeps the most-specific legal unit: ri when
      // present, otherwise eup/myeon/dong.
      legalName: fields[6] || fields[5],
      jibunRowSha256: sha256(rawLine),
    });
  });
  const facts = Object.fromEntries(
    leaves.map((leaf) => {
      const legalNames = new Set(leaf.region.legalAreas.map((area) => area.name));
      const eligibleByName = new Map();
      for (const value of candidatesByRoute.get(leaf.route).values()) {
        const addressValue = addressByManagement.get(value.managementNumber);
        const roadValue = addressValue
          ? roadByKey.get(`${addressValue.roadCode}:${addressValue.emdSerial}`)
          : null;
        const legalValue = legalByManagement.get(value.managementNumber);
        if (
          !addressValue ||
          !roadValue ||
          !legalValue ||
          !legalNames.has(legalValue.legalName)
        ) {
          continue;
        }
        const enriched = {
          ...value,
          ...addressValue,
          ...roadValue,
          ...legalValue,
        };
        const previous = eligibleByName.get(value.name);
        if (
          !previous ||
          compareText(value.managementNumber, previous.managementNumber) < 0
        ) {
          eligibleByName.set(value.name, enriched);
        }
      }
      return [
        leaf.route,
        selectDiverse(eligibleByName).map((value) => stripInternalFact(value)),
      ];
    }),
  );
  const dataDigest = `sha256:${sha256(JSON.stringify(facts))}`;
  const facilityCount = Object.values(facts).flat().length;
  const source = {
    agency: "행정안전부 도로명주소 업무 시스템 / 한국지역정보개발원",
    dataset: "주소DB 전국 전체분",
    snapshotDate: "2026-07-31",
    downloadPageUrl:
      "https://business.juso.go.kr/jst/jstAddressDetailsSearch",
    schemaUrl: "https://business.juso.go.kr/jst/jstAddressDownload",
    joinReferenceUrl:
      "https://business.juso.go.kr/addrlink/qna/qnaDetail.do?bulletinRefSn=137160&currentPage=11&keyword=&noticeMgtSn=137160&noticeType=QNA&noticeTypeTmp=QNA&page=&searchType=",
    archiveSha256: actualArchiveHash,
    entries: ENTRY_CONTRACT,
    joinContract: [
      "leaf.sourceCodes includes auxiliary.admin_code",
      "leaf.sourceNames equals auxiliary.admin_name after NFKC punctuation-only normalization",
      "auxiliary.common_housing_flag equals 0",
      "auxiliary.management_number equals address.management_number",
      "address road_code plus emd_serial equals road-code row key",
      "auxiliary.management_number equals representative-jibun management_number",
    ],
    buildingNumberIncluded: false,
    v3PrototypeSha256: PROTOTYPE_SHA256,
    dataDigest,
    routeCount: Object.keys(facts).length,
    facilityCount,
    lowCoverageRoute: LOW_ROUTE,
    primaryOfficialExactNameChecks: PRIMARY_VERIFICATION,
  };
  validateFacts(inventory, source, facts, dataDigest);
  writeFileSync(OUTPUT_PATH, renderSource(source, facts, dataDigest), "utf8");
  return { routeCount: Object.keys(facts).length, facilityCount, dataDigest };
}

function check(inventory) {
  const generated = readFileSync(OUTPUT_PATH, "utf8");
  const source = parseMarkedJson(
    generated,
    SOURCE_MARKER_START,
    SOURCE_MARKER_END,
  );
  const facts = parseMarkedJson(
    generated,
    DATA_MARKER_START,
    DATA_MARKER_END,
  );
  const digestMatch = generated.match(
    /REGION_PUBLIC_FACILITY_DATA_DIGEST = "([^"]+)"/u,
  );
  if (!digestMatch) throw new Error("BABY_PUBLIC_FACILITY_DIGEST_EXPORT");
  return validateFacts(inventory, source, facts, digestMatch[1]);
}

const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8"));
if (process.argv.includes("--check")) {
  process.stdout.write(`${JSON.stringify(check(inventory))}\n`);
} else {
  const archiveIndex = process.argv.indexOf("--archive");
  const archiveArgument = archiveIndex >= 0 ? process.argv[archiveIndex + 1] : null;
  if (!archiveArgument) {
    throw new Error(
      "Usage: node scripts/generate-region-public-facilities.mjs --archive /absolute/path/to/202607ALLMTCHG00.zip | --check",
    );
  }
  const result = await generate(resolve(archiveArgument), inventory);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
