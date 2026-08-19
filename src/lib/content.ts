import {
  getCityFactProfile,
  type CityOfficialSource,
} from "@/data/city-fact-profiles";
import {
  getRegionPublicFacilityFacts,
  type RegionPublicFacilityFact,
} from "@/data/region-public-facilities.generated";
import {
  getRegionRoadFacts,
  type RegionRoadFact,
} from "@/data/region-road-facts.generated";
import {
  ACTIVE_SITE,
  ALL_BABY_SITES,
  type BabySiteConfig,
} from "@/lib/site-config";
import {
  getRegionChildrenForSite,
  getRegionNodesForSite,
  getRegionParentForSite,
  type BabyRegionNode,
} from "@/lib/regions";

export type ContentAuditScope =
  | "shared-service"
  | "local-substantive"
  | "directory";

export type ContentSection = {
  id: string;
  heading: string;
  paragraphs: [string, ...string[]];
  auditScope: ContentAuditScope;
  factRefs: readonly string[];
};

export type ChildDirectoryContent = {
  id: string;
  heading: string;
  intro: string;
  auditScope: "directory";
  factRefs: readonly string[];
};

export type RegionContent = {
  primaryKeyword: string;
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  eyebrow: string;
  hooks: [string, string];
  sections: ContentSection[];
  faqIntro: string;
  childDirectory: ChildDirectoryContent;
  ctaLabels: [string, string, string];
  officialSources: readonly CityOfficialSource[];
  detailMode: "root" | "district" | "leaf";
  layoutSemantic:
    | "address-ledger"
    | "call-sequence"
    | "course-crosscheck"
    | "schedule-board"
    | "branch-map"
    | "settlement-checklist";
  indexEligible: boolean;
  indexEligibilityReason:
    | "city-home"
    | "regional-district"
    | "regional-leaf";
  indexEligibilityTargetPath: string | null;
};

type GraphFacts = {
  node: BabyRegionNode;
  site: BabySiteConfig;
  label: string;
  children: readonly BabyRegionNode[];
  parent: BabyRegionNode | null;
  siblings: readonly BabyRegionNode[];
  aliases: readonly string[];
  legalNames: readonly string[];
  roadFacts: readonly RegionRoadFact[];
  facilityFacts: readonly RegionPublicFacilityFact[];
};

type DistrictFacilityFact = RegionPublicFacilityFact & {
  childName: string;
};

const LAYOUT_SEMANTICS = [
  "address-ledger",
  "call-sequence",
  "course-crosscheck",
  "schedule-board",
  "branch-map",
  "settlement-checklist",
] as const satisfies readonly RegionContent["layoutSemantic"][];

function siteIndex(site: BabySiteConfig): number {
  const index = ALL_BABY_SITES.findIndex((candidate) => candidate.key === site.key);
  if (index < 0) throw new Error(`BABY_CONTENT_UNKNOWN_SITE:${site.key}`);
  return index;
}

function siteNodes(site: BabySiteConfig): readonly BabyRegionNode[] {
  return getRegionNodesForSite(site);
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function hasFinalConsonant(value: string): boolean {
  const character = [...value.normalize("NFC")]
    .reverse()
    .find((candidate) => /[가-힣]/u.test(candidate));
  if (!character) return false;
  const code = character.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

function withTopicParticle(value: string): string {
  return `${value}${hasFinalConsonant(value) ? "은" : "는"}`;
}

function withSubjectParticle(value: string): string {
  return `${value}${hasFinalConsonant(value) ? "이" : "가"}`;
}

function withAndParticle(value: string): string {
  return `${value}${hasFinalConsonant(value) ? "과" : "와"}`;
}

function compactNames(values: readonly string[], limit = 6): string {
  const unique = uniqueStrings(values);
  const visible = unique.slice(0, limit).join("·");
  return unique.length > limit
    ? `${visible} 외 ${unique.length - limit}개 지역`
    : visible;
}

function sourceAliases(node: BabyRegionNode): readonly string[] {
  return uniqueStrings(
    node.records.flatMap((record) => [...record.sourceNames, record.name]),
  ).filter((name) => name !== node.displayName);
}

function legalAreaNames(node: BabyRegionNode): readonly string[] {
  return uniqueStrings(
    node.records.flatMap((record) => record.legalAreas.map((area) => area.name)),
  );
}

function routeTypeLabel(node: BabyRegionNode): string {
  if (node.kind === "home") return "지역 안내";
  if (node.kind === "district") return "구 지역 안내";
  if (node.displayName.endsWith("읍")) return "읍 지역 안내";
  if (node.displayName.endsWith("면")) return "면 지역 안내";
  return "동 지역 안내";
}

function qualifiedName(node: BabyRegionNode, site: BabySiteConfig): string {
  return node.kind === "home"
    ? site.searchName
    : [site.searchName, ...node.segments].join(" ");
}

function buildFacts(node: BabyRegionNode, site: BabySiteConfig): GraphFacts {
  const children = getRegionChildrenForSite(site, node);
  const parent = getRegionParentForSite(site, node);
  return {
    node,
    site,
    label: qualifiedName(node, site),
    children,
    parent,
    siblings: parent ? getRegionChildrenForSite(site, parent) : [],
    aliases: sourceAliases(node),
    legalNames: legalAreaNames(node),
    roadFacts:
      node.kind === "representative"
        ? getRegionRoadFacts(site.key, node.path)
        : [],
    facilityFacts:
      node.kind === "representative"
        ? getRegionPublicFacilityFacts(site.key, node.path)
        : [],
  };
}

function primaryRegionKeyword(facts: GraphFacts): string {
  return `${facts.label} 출장마사지`;
}

function sharedSection(
  id: string,
  heading: string,
  ...paragraphs: [string, ...string[]]
): ContentSection {
  return {
    id,
    heading,
    paragraphs,
    auditScope: "shared-service",
    factRefs: [],
  };
}

function localSection(
  id: string,
  heading: string,
  factRefs: readonly string[],
  ...paragraphs: string[]
): ContentSection {
  if (factRefs.length === 0 || paragraphs.length === 0) {
    throw new Error(`BABY_CONTENT_LOCAL_FACT_REFS:${id}`);
  }
  return {
    id,
    heading,
    paragraphs: paragraphs as [string, ...string[]],
    auditScope: "local-substantive",
    factRefs,
  };
}

function directorySection(
  id: string,
  heading: string,
  ...paragraphs: [string, ...string[]]
): ContentSection {
  return {
    id,
    heading,
    paragraphs,
    auditScope: "directory",
    factRefs: [],
  };
}

function serviceLead(facts: GraphFacts): {
  description: string;
  hooks: [string, string];
  faqIntro: string;
} {
  const keyword = primaryRegionKeyword(facts);
  return {
    description: `${keyword}는 고객이 지정한 숙소나 거주지로 여성 마사지사가 방문하는 관리 서비스입니다. 코스·가격과 희망 시각을 24시간 전화로 확인하고 관리 뒤 현장 후불로 결제합니다.`,
    hooks: [
      "도로명과 건물명, 희망 날짜·시각, 이용 인원을 24시간 전화로 알려 주면 방문 가능 여부와 선택 코스를 확인합니다.",
      "여성 마사지사가 고객 지정 장소로 방문하며 관리가 끝난 뒤 현금 또는 무선 카드 단말기로 현장에서 결제합니다.",
    ],
    faqIntro: `${keyword} 전화 예약은 주소 확인, 코스·시간 선택, 여성 마사지사 방문 관리, 100% 현장 후불 순서로 진행합니다.`,
  };
}

function sharedServiceSections(facts: GraphFacts): ContentSection[] {
  const keyword = primaryRegionKeyword(facts);
  return [
    sharedSection(
      "service-overview",
      `${keyword} 서비스 안내`,
      `${keyword}는 고객이 지정한 숙소나 거주지로 여성 마사지사가 찾아가는 방문 관리입니다. 24시간 전화로 상세 주소와 희망 시각을 확인한 뒤 일정을 정합니다.`,
    ),
    sharedSection(
      "course-price",
      `${keyword} 코스별 가격`,
      "타이·아로마·힐링·스페셜·남성전용 코스의 시간과 금액은 코스·가격 페이지에서 비교할 수 있습니다. 원하는 압과 집중 부위, 오일 사용 여부도 상담에서 확인합니다.",
    ),
    sharedSection(
      "phone-reservation",
      "24시간 전화 예약",
      "희망 날짜와 시각, 1인 또는 커플·부부 2인 이용 여부를 알려 주세요. 방문 가능 여부와 예상 일정은 상세 주소를 받은 뒤 확인합니다.",
    ),
    sharedSection(
      "arrival-hygiene",
      "여성 마사지사 방문과 위생 준비",
      "도착 뒤 예약한 코스와 이용 시간을 다시 확인하고, 관리 전후 소독과 일회용 비품 사용 원칙에 따라 준비합니다.",
    ),
    sharedSection(
      "onsite-payment",
      "관리 후 100% 현장 후불",
      "관리가 끝난 뒤 현금 또는 무선 카드 단말기로 결제합니다. 예약 단계에서 선입금을 요구하지 않으며 선택 코스와 추가 여부를 결제 전에 확인합니다.",
    ),
    sharedSection(
      "service-flow",
      "예약부터 결제까지 이용 흐름",
      "상세 주소와 일정 확인, 코스 선택, 여성 마사지사 방문 관리, 현장 결제 순서로 이용합니다. 장소가 바뀌면 새 주소와 희망 시각을 다시 알려 주세요.",
    ),
  ];
}

function relationRef(fact: RegionPublicFacilityFact): string {
  return `facility:${fact.name}|road:${fact.roadName}|legal:${fact.legalName}`;
}

function facilityRelationParagraph(
  fact: RegionPublicFacilityFact,
  roadName: string,
): string {
  switch (fact.category) {
    case "admin_center":
      return `행정시설 ${withTopicParticle(`‘${fact.name}’`)} 공개 주소 자료에서 ‘${fact.adminName}’ 행정동에 연결됩니다. 방문지는 도로명 ${withAndParticle(`‘${roadName}’`)} 실제 건물명으로 확인합니다.`;
    case "public_safety":
      return `${withTopicParticle(`‘${fact.name}’`)} ‘${fact.adminName}’에 연결된 안전시설 명칭입니다. 예약 장소를 뜻하지 않으며 주소는 ‘${roadName}’ 같은 도로명으로 확인합니다.`;
    case "education":
      return `교육시설 ${withSubjectParticle(`‘${fact.name}’`)} 공개 주소 자료의 ‘${fact.adminName}’ 항목에서 확인됩니다. 이 이름은 지역 참고용이고 방문 주소는 ${withAndParticle(`‘${roadName}’`)} 건물명으로 받습니다.`;
    case "postal":
      return `우편·교통시설 ${withTopicParticle(`‘${fact.name}’`)} 공개 자료에서 ${withAndParticle(`‘${fact.adminName}’`)} 연결됩니다. 예약 주소는 시설명이 아니라 ‘${roadName}’ 도로명과 건물명으로 확인합니다.`;
    case "public_welfare":
      return `${withTopicParticle(`‘${fact.name}’`)} ‘${fact.adminName}’에 등록된 복지시설 이름입니다. 위치 참고에만 쓰고 방문지는 ‘${roadName}’ 도로명과 건물명을 따로 확인합니다.`;
    case "public_health":
      return `보건시설 ${withTopicParticle(`‘${fact.name}’`)} 공개 주소 자료의 ‘${fact.adminName}’ 항목에서 확인됩니다. 시설은 방문 장소가 아니며 실제 주소는 ‘${roadName}’ 도로명과 건물명으로 확인합니다.`;
    case "public_culture":
      return `문화시설명 ${withTopicParticle(`‘${fact.name}’`)} ‘${fact.adminName}’ 주소권역을 확인할 때 참고할 수 있습니다. 서비스 장소는 아니며 실제 주소에는 ‘${roadName}’ 도로명을 확인합니다.`;
    case "public_sports":
      return `체육·공원시설 ${withSubjectParticle(`‘${fact.name}’`)} ‘${fact.adminName}’ 공개 주소 자료에 올라 있습니다. 시설 자체가 아닌 ‘${roadName}’ 도로명과 건물명으로 방문지를 정합니다.`;
    case "public_infrastructure":
    case "public_parking":
      return `공공 기반시설 ${withSubjectParticle(`‘${fact.name}’`)} ‘${fact.adminName}’ 주소 자료에서 확인됩니다. 이 명칭은 참고만 하고 실제 방문지는 ${withAndParticle(`‘${roadName}’`)} 건물명을 받습니다.`;
    case "public_institution":
    case "public_government":
    default:
      return `공공기관 ${withTopicParticle(`‘${fact.name}’`)} ‘${fact.adminName}’ 공개 주소 항목에 연결됩니다. 시설은 서비스 장소가 아니며 방문 주소에는 ‘${roadName}’ 도로명과 건물명을 사용합니다.`;
  }
}

function rareVerifiedRoadNames(
  facts: GraphFacts,
  excluded: ReadonlySet<string>,
): readonly string[] {
  const frequencies = new Map<string, number>();
  for (const candidate of siteNodes(facts.site)) {
    if (candidate.kind !== "representative") continue;
    const names = uniqueStrings(
      getRegionRoadFacts(facts.site.key, candidate.path).flatMap((fact) => [
        fact.roadName,
        ...fact.roadNames,
      ]),
    );
    for (const name of names) {
      frequencies.set(name, (frequencies.get(name) ?? 0) + 1);
    }
  }
  return uniqueStrings(
    facts.roadFacts.flatMap((fact) => [fact.roadName, ...fact.roadNames]),
  )
    .filter((roadName) => !excluded.has(roadName))
    .toSorted(
      (left, right) =>
        (frequencies.get(left) ?? 0) - (frequencies.get(right) ?? 0) ||
        left.localeCompare(right, "ko"),
    );
}

function leafLocalSections(facts: GraphFacts): ContentSection[] {
  const relations = facts.facilityFacts.slice(0, 6);
  if (relations.length < 2) {
    throw new Error(`BABY_CONTENT_LEAF_FACILITY_FACTS:${facts.site.key}:${facts.node.path}`);
  }
  const verifiedRoads = uniqueStrings([
    ...relations.map((fact) => fact.roadName),
    ...rareVerifiedRoadNames(facts, new Set()),
  ]);
  if (verifiedRoads.length === 0) {
    throw new Error(`BABY_CONTENT_LEAF_ROAD_FACTS:${facts.site.key}:${facts.node.path}`);
  }
  const relationParagraphs = relations.map((fact) => ({
    fact,
    roadName: fact.roadName,
    text: facilityRelationParagraph(
      fact,
      fact.roadName,
    ),
  }));
  const groupSizes = relations.length <= 3
    ? [1, 1, Math.max(0, relations.length - 2)]
    : relations.length === 4
      ? [2, 1, 1]
      : relations.length === 5
        ? [2, 2, 1]
        : [2, 2, 2];
  const relationGroups: typeof relationParagraphs[] = [];
  let relationOffset = 0;
  for (const size of groupSizes) {
    relationGroups.push(relationParagraphs.slice(relationOffset, relationOffset + size));
    relationOffset += size;
  }
  const legalNames = uniqueStrings([
    ...facts.legalNames,
    ...relations.map((fact) => fact.legalName),
  ]);
  const aliases = facts.aliases.filter((name) => name !== facts.node.displayName);
  const localNames = uniqueStrings([...legalNames, ...aliases]);
  const nameText = localNames.length > 0
    ? compactNames(localNames, 6)
    : facts.node.displayName;
  const summaryRoads = verifiedRoads.slice(0, 3);
  const summaryParagraph = `이 지역의 공개 주소 자료에는 ${localNames.slice(0, 4).map((name) => `‘${name}’`).join("·")} 명칭이 함께 나타납니다. ${summaryRoads.map((roadName) => `‘${roadName}’`).join("·")} 도로명 가운데 실제 주소에 해당하는 이름과 건물명을 확인합니다.${relations.length === 2 ? " 공동현관이 있는 건물은 호출 방법과 출입구 위치도 전화로 알려 주세요." : ""}`;
  const refsFor = (group: typeof relationParagraphs) =>
    group.flatMap(({ fact, roadName }) => [relationRef(fact), `road:${roadName}`]);
  const textsFor = (group: typeof relationParagraphs) =>
    group.map(({ text }) => text);

  return [
    localSection(
      "local-address-reference",
      `${facts.node.displayName} 주소 기준점 확인`,
      refsFor(relationGroups[0]),
      ...textsFor(relationGroups[0]),
    ),
    localSection(
      "local-legal-names",
      `${facts.node.displayName} 도로명과 지역명 확인`,
      [
        ...refsFor(relationGroups[1]),
        ...localNames.map((name) => `local-name:${name}`),
      ],
      ...textsFor(relationGroups[1]),
      ...(relationGroups[1].length === 0
        ? [`현재 지역 안내에서 확인되는 주소 이름은 ${nameText}입니다. 예약 메모에는 실제 도로명과 건물명을 함께 남깁니다.`]
        : []),
    ),
    localSection(
      "local-building-preparation",
      `${facts.node.displayName} 건물명·출입 방법 준비`,
      [
        ...refsFor(relationGroups[2]),
        ...summaryRoads.map((roadName) => `road:${roadName}`),
        ...legalNames.map((name) => `legal:${name}`),
      ],
      ...textsFor(relationGroups[2]),
      summaryParagraph,
    ),
  ];
}

function districtFacilityFacts(facts: GraphFacts, limit = 6): readonly DistrictFacilityFact[] {
  const children = [...facts.children].sort((left, right) =>
    left.displayName.localeCompare(right.displayName, "ko"),
  );
  const byChild = children.map((child) => ({
    child,
    facilities: getRegionPublicFacilityFacts(facts.site.key, child.path),
  }));
  const selected: DistrictFacilityFact[] = [];
  const names = new Set<string>();
  for (let depth = 0; selected.length < limit; depth += 1) {
    let added = false;
    for (const entry of byChild) {
      const candidate = entry.facilities[depth];
      if (!candidate || names.has(candidate.name)) continue;
      selected.push({ ...candidate, childName: entry.child.displayName });
      names.add(candidate.name);
      added = true;
      if (selected.length === limit) break;
    }
    if (!added) break;
  }
  return selected;
}

function districtLocalSections(facts: GraphFacts): ContentSection[] {
  const relations = districtFacilityFacts(facts, 6);
  if (relations.length < 3) {
    throw new Error(`BABY_CONTENT_DISTRICT_FACILITY_FACTS:${facts.site.key}:${facts.node.path}`);
  }
  const first = relations.slice(0, 2);
  const second = relations.slice(2, 4);
  const third = relations.slice(4, 6);
  const children = facts.children.map((child) => child.displayName);
  const childText = compactNames(children, 4);
  const format = (items: readonly DistrictFacilityFact[]) =>
    items
      .map(
        (item) =>
          `${withTopicParticle(item.childName)} ${item.roadName}의 ${withAndParticle(`‘${item.name}’`)} 법정 주소명 ‘${item.legalName}’으로 확인`,
      )
      .join(", ");
  const childRoadPairs = relations.map((item) => `${item.childName}:${item.roadName}`);

  return [
    localSection(
      "district-address-scope",
      `${facts.node.displayName} 세부 방문 주소`,
      [
        ...children.map((name) => `child:${name}`),
        ...first.map(relationRef),
      ],
      `${withTopicParticle(childText)} ${facts.node.displayName} 아래의 세부 지역 안내입니다. 공개 주소 자료에서는 ${format(first)}됩니다. 실제 방문지는 고객이 지정한 도로명과 건물명으로 확정합니다.`,
    ),
    localSection(
      "district-public-reference",
      `${facts.node.displayName} 주소 기준점과 도로명`,
      second.map(relationRef),
      `${format(second)}됩니다. 같은 구 안에서도 시설명과 도로명이 다르므로 상담에서는 어느 세부 지역의 주소인지 확인한 뒤 건물명과 출입 방법을 받습니다.`,
    ),
    localSection(
      "district-building-preparation",
      `${facts.node.displayName} 건물명·출입 방법 준비`,
      [
        ...third.map(relationRef),
        ...childRoadPairs.map((value) => `child-road:${value}`),
      ],
      `${format(third.length > 0 ? third : first)}됩니다. 예약 메모에는 실제 건물명과 공동현관 호출 방법, 희망 시각을 남기고 주소가 바뀌면 새 지역 안내에서 다시 확인합니다.`,
    ),
  ];
}

function homeLocalSections(facts: GraphFacts): ContentSection[] {
  const profile = getCityFactProfile(facts.site.key);
  const children = facts.children.map((child) => child.displayName);
  const childText = compactNames(children, 5);
  return [
    localSection(
      "city-address-context",
      profile.heading,
      [
        ...children.map((name) => `child:${name}`),
        ...profile.sources.map((source) => `source:${source.url}`),
      ],
      `${withTopicParticle(childText)} ${facts.site.searchName} 안에서 선택할 수 있는 방문 지역입니다. 실제 지역을 먼저 고른 뒤 도로명과 건물명을 알려 주세요.`,
      ...profile.paragraphs,
    ),
    ...profile.sections.map((section) =>
      localSection(
        `city-fact-${section.id}`,
        section.heading,
        profile.sources.map((source) => `source:${source.url}`),
        ...section.paragraphs,
      ),
    ),
  ];
}

function appendDirectory(
  sections: readonly ContentSection[],
  facts: GraphFacts,
  leaf: boolean,
): ContentSection[] {
  const related = leaf
    ? facts.siblings.filter((item) => item.path !== facts.node.path)
    : facts.children;
  if (leaf && related.length === 0) {
    const parentLabel = facts.parent
      ? qualifiedName(facts.parent, facts.site)
      : facts.site.searchName;
    return [
      ...sections,
      directorySection(
        "related-region-directory",
        `${facts.node.displayName} 예약 지역 다시 확인`,
        `${facts.node.displayName} 방문 문의는 ${parentLabel} 안의 정확한 도로명과 건물명을 기준으로 확인합니다.`,
        "다른 지역으로 예약 장소를 바꾸면 새 주소와 희망 시각을 전화로 다시 알려 주세요.",
      ),
    ];
  }
  const visible = related.map((item) => item.displayName);
  return [
    ...sections,
    directorySection(
      leaf ? "related-region-directory" : "child-directory",
      leaf
        ? `${withAndParticle(facts.node.displayName)} 같은 상위 지역의 다른 안내`
        : `${facts.node.displayName} 세부 방문 지역`,
      leaf
        ? `${withTopicParticle(compactNames(visible, 6))} 같은 상위 행정구역의 지역 페이지입니다. 실제 방문 주소가 달라지면 해당 지역 안내에서 도로명과 건물명을 다시 확인하세요.`
        : `${withTopicParticle(compactNames(visible, 6))} 선택할 수 있는 세부 지역입니다. 실제 방문 주소에 해당하는 지역을 고르면 상세 안내를 볼 수 있습니다.`,
      leaf
        ? "예약 지역을 바꿀 때는 희망 날짜·시각, 코스와 이용 인원도 전화로 다시 확인해 주세요."
        : "지역을 선택한 뒤 코스·가격과 희망 시각을 24시간 전화로 확인해 주세요.",
    ),
  ];
}

function createSections(facts: GraphFacts): ContentSection[] {
  const shared = sharedServiceSections(facts);
  const local = facts.node.kind === "home"
    ? homeLocalSections(facts)
    : facts.node.kind === "district"
      ? districtLocalSections(facts)
      : leafLocalSections(facts);
  return appendDirectory([...shared, ...local], facts, facts.node.kind === "representative");
}

function indexEligibility(
  node: BabyRegionNode,
): Pick<
  RegionContent,
  "indexEligible" | "indexEligibilityReason" | "indexEligibilityTargetPath"
> {
  if (node.kind === "home") {
    return {
      indexEligible: true,
      indexEligibilityReason: "city-home",
      indexEligibilityTargetPath: null,
    };
  }
  if (node.kind === "district") {
    return {
      indexEligible: true,
      indexEligibilityReason: "regional-district",
      indexEligibilityTargetPath: null,
    };
  }
  return {
    indexEligible: true,
    indexEligibilityReason: "regional-leaf",
    indexEligibilityTargetPath: null,
  };
}

export function isRegionIndexEligible(
  node: BabyRegionNode,
  site: BabySiteConfig = ACTIVE_SITE,
): boolean {
  return node.siteKey === site.key && indexEligibility(node).indexEligible;
}

export function getIndexEligibleRegionNodes(
  site: BabySiteConfig = ACTIVE_SITE,
): readonly BabyRegionNode[] {
  return siteNodes(site).filter((node) => isRegionIndexEligible(node, site));
}

export function createRegionContent(
  node: BabyRegionNode,
  site: BabySiteConfig = ACTIVE_SITE,
): RegionContent {
  const facts = buildFacts(node, site);
  const sections = createSections(facts);
  const directory = sections.at(-1);
  if (!directory || directory.auditScope !== "directory") {
    throw new Error(`BABY_CONTENT_DIRECTORY_NOT_LAST:${site.key}:${node.path}`);
  }
  if (sections.length < 10 || sections.length > 12) {
    throw new Error(`BABY_CONTENT_PATTERN_MISSING:${site.key}:${node.path}`);
  }
  const primaryKeyword = primaryRegionKeyword(facts);
  const lead = serviceLead(facts);
  const cityProfile = getCityFactProfile(site.key);
  const detailMode: RegionContent["detailMode"] =
    node.kind === "home" ? "root" : node.kind === "district" ? "district" : "leaf";

  return {
    primaryKeyword,
    title: `${primaryKeyword} | ${routeTypeLabel(node)} - ${site.brandName}`,
    description: lead.description,
    keywords: [
      `${facts.label} 출장마사지`,
      `${facts.label} 출장안마`,
      `${facts.label} 지역 안내`,
      `${site.brandName} ${routeTypeLabel(node)}`,
      `${facts.label} 현장후불`,
    ],
    h1: `${primaryKeyword} ${routeTypeLabel(node)}`,
    eyebrow: `${site.brandName} · ${facts.parent?.displayName ?? site.searchName} · ${routeTypeLabel(node)}`,
    hooks: lead.hooks,
    sections,
    faqIntro: lead.faqIntro,
    childDirectory: {
      id: directory.id,
      heading: directory.heading,
      intro: directory.paragraphs[0],
      auditScope: directory.auditScope,
      factRefs: directory.factRefs,
    },
    ctaLabels: ["전화로 일정 확인", "코스·가격 보기", "관련 지역 찾기"],
    officialSources: node.kind === "home" ? cityProfile.sources : [],
    detailMode,
    layoutSemantic:
      LAYOUT_SEMANTICS[siteIndex(site) % LAYOUT_SEMANTICS.length] ??
      "address-ledger",
    ...indexEligibility(node),
  };
}
