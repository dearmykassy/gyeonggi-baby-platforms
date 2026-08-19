import {
  ACTIVE_SITE,
  ALL_BABY_SITES,
  type BabySiteConfig,
} from "@/lib/site-config";
import {
  getRegionNodesForSite,
  type BabyRegionNode,
} from "@/lib/regions";

export const REGION_KEYWORD_SUFFIXES = [
  "출장마사지",
  "출장안마",
  "타이마사지",
  "아로마마사지",
  "2인마사지",
  "현장후불",
  "24시간전화상담",
] as const;

export const ROOT_AND_DISTRICT_SECTION_IDS = [
  "address-boundary",
  "branch-overview",
  "destination-note",
  "schedule-check",
  "course-choice",
  "price-ledger",
  "party-count",
  "onsite-payment",
  "supplies-hygiene",
  "call-recap",
  "child-directory",
] as const;

export const LEAF_SECTION_IDS = [
  "address-level",
  "source-aliases",
  "destination-detail",
  "schedule-note",
  "course-time",
  "party-count",
  "onsite-payment",
  "supplies-hygiene",
  "change-recap",
  "related-region-directory",
] as const;

export type ContentSection = {
  id: string;
  heading: string;
  paragraphs: [string, string];
};

export type ChildDirectoryContent = {
  heading: string;
  intro: string;
};

export type RegionContent = {
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
  detailMode: "root" | "district" | "leaf";
  layoutSemantic:
    | "address-ledger"
    | "call-sequence"
    | "course-crosscheck"
    | "schedule-board"
    | "branch-map"
    | "settlement-checklist";
};

type VoiceProfile = {
  lead: string;
  method: string;
  recap: string;
};

/**
 * One editorial voice per city. These are deliberately semantic differences,
 * not brand-name substitution: each voice changes how the same verified owner
 * facts are explained and checked.
 */
export const CITY_VOICE_PROFILES = [
  { lead: "주소표처럼 간결하게 읽습니다", method: "칸을 나눠 대조합니다", recap: "빠진 칸만 다시 확인합니다" },
  { lead: "통화 순서를 중심으로 정리합니다", method: "말할 차례대로 적습니다", recap: "바뀐 항목을 끝에 되짚습니다" },
  { lead: "경로의 위아래 관계부터 살핍니다", method: "상위와 하위를 연결합니다", recap: "최종 경로를 한 번 더 읽습니다" },
  { lead: "짧은 예약 메모 형식으로 안내합니다", method: "한 줄에 한 항목만 둡니다", recap: "메모와 통화 내용을 맞춥니다" },
  { lead: "코스 선택 전에 주소를 고정합니다", method: "주소와 가격표를 분리합니다", recap: "두 목록의 선택값을 확인합니다" },
  { lead: "일정표를 작성하듯 차분히 봅니다", method: "날짜와 시간을 따로 적습니다", recap: "확정한 순서를 보존합니다" },
  { lead: "처음 문의하는 사람 기준으로 풉니다", method: "낯선 용어를 순서로 바꿉니다", recap: "첫 통화에 필요한 값만 남깁니다" },
  { lead: "주소 탐색과 전화 준비를 함께 엮습니다", method: "지역 카드와 메모를 맞춥니다", recap: "선택한 경로를 통화에서 확인합니다" },
  { lead: "현장 결제까지 역순으로 점검합니다", method: "마지막 단계에서 거꾸로 봅니다", recap: "처음 주소까지 되돌아갑니다" },
  { lead: "두 사람 이용 상황을 기준으로 나눕니다", method: "사람별 선택을 두 줄로 둡니다", recap: "공통 주소와 개별 코스를 구분합니다" },
  { lead: "가격표 행을 기준 삼아 설명합니다", method: "코스와 시간을 같은 행에서 봅니다", recap: "선택한 금액 행을 다시 찾습니다" },
  { lead: "상담 전에 필요한 사실만 남깁니다", method: "추정 없이 확인값을 적습니다", recap: "확인되지 않은 내용은 전화로 넘깁니다" },
  { lead: "주소의 가지 수를 먼저 보여줍니다", method: "직계 경로부터 좁혀갑니다", recap: "마지막 주소 단계에서 멈춥니다" },
  { lead: "선택과 확인을 두 단계로 구분합니다", method: "화면 선택 뒤 전화 확인을 둡니다", recap: "두 단계가 같은지 대조합니다" },
  { lead: "이용 전 체크리스트 흐름으로 적습니다", method: "완료한 항목을 하나씩 지웁니다", recap: "남은 확인사항만 통화로 묻습니다" },
  { lead: "상세 주소 보호를 우선해 안내합니다", method: "공개 경로와 전화 정보를 나눕니다", recap: "민감한 주소는 통화에만 남깁니다" },
  { lead: "코스보다 이용 조건을 먼저 맞춥니다", method: "인원과 일정을 앞에 둡니다", recap: "코스는 조건 뒤에서 선택합니다" },
  { lead: "변경 가능성을 고려해 메모합니다", method: "기존 값과 새 값을 나란히 둡니다", recap: "새 값만 마지막에 다시 읽습니다" },
  { lead: "상위 지역에서 현재 위치까지 내려옵니다", method: "한 단계씩 경로를 좁힙니다", recap: "현재 단계와 상세 주소를 구분합니다" },
  { lead: "현금과 카드 선택까지 한 흐름으로 봅니다", method: "결제 항목을 예약 메모에 붙입니다", recap: "현장 후불 여부를 끝에 확인합니다" },
  { lead: "시간과 금액을 섞지 않게 구성합니다", method: "시각과 이용 시간을 따로 둡니다", recap: "가격표의 시간 행만 다시 봅니다" },
  { lead: "전화에서 읽기 쉬운 문장으로 줄입니다", method: "긴 주소를 단계별로 끊습니다", recap: "통화 끝에 짧게 요약합니다" },
  { lead: "현재 지역과 같은 단계도 함께 봅니다", method: "형제 경로를 나란히 비교합니다", recap: "선택한 지역만 최종 메모에 둡니다" },
  { lead: "준비와 확인의 경계를 분명히 합니다", method: "미리 정할 것과 물을 것을 나눕니다", recap: "전화 답변을 준비 메모에 반영합니다" },
  { lead: "비품과 결제 기준까지 빠짐없이 봅니다", method: "운영 기준을 별도 묶음으로 둡니다", recap: "주소·코스 뒤 운영 기준을 확인합니다" },
  { lead: "짧은 질문 여러 개로 순서를 만듭니다", method: "한 질문에 한 사실만 묻습니다", recap: "답을 받은 질문만 체크합니다" },
  { lead: "지역 목록의 끝에서 전화 준비로 잇습니다", method: "디렉터리를 마지막에 배치합니다", recap: "고른 주소를 상담 항목에 옮깁니다" },
] as const satisfies readonly VoiceProfile[];

const LAYOUT_SEMANTICS = [
  "address-ledger",
  "call-sequence",
  "course-crosscheck",
  "schedule-board",
  "branch-map",
  "settlement-checklist",
] as const satisfies readonly RegionContent["layoutSemantic"][];

const TITLE_LEFT = [
  "주소 준비", "지역 경로", "전화 순서", "일정 메모", "코스 확인", "가격표 대조",
  "이용 인원", "현장 후불", "카드 결제", "2인 문의", "상세 주소", "예약 항목",
  "시간 선택", "변경 확인", "비품 기준", "소독 원칙", "첫 문의", "주소 단계",
  "코스 시간", "상담 준비", "도로명 확인", "건물명 메모", "이용 절차", "지역 선택",
] as const;

const TITLE_RIGHT = [
  "통화 안내", "확인 기록", "선택 가이드", "준비 목록", "현장 기준",
  "순서 정리", "주소 안내", "가격 안내", "결제 안내", "문의 가이드",
  "경로 안내", "메모 방법", "이용 안내", "항목 점검", "전화 메모",
  "예약 확인", "코스 안내", "일정 확인", "주소 대조", "마지막 점검",
] as const;

const EDITORIAL_OPENERS = [
  "첫 항목을 확인한 뒤", "현재 화면의 값을 읽고", "앞 단계와 연결해 보고",
  "준비 메모의 한 줄을 비워 두고", "선택한 이름을 소리 내어 읽고", "두 값을 서로 다른 칸에 두고",
  "한 번에 한 항목만 살피고", "표시된 순서를 그대로 따라가고", "같은 줄의 값을 대조하고",
  "마지막 확인 칸을 남겨 두고", "기존 값과 새 값을 구분하고", "전화에서 읽을 차례를 정하고",
  "바로 아래 단계부터 살피고", "같은 높이의 항목을 나란히 보고", "공개 정보와 통화 정보를 나누고",
  "서로 다른 선택을 두 줄에 두고", "상담에서 물을 부분을 표시하고", "확인된 답만 기록으로 옮기고",
  "운영 기준을 별도 묶음으로 보고", "전후 단계를 각각 확인하고", "선택 가능한 방법을 구분하고",
  "사람별 항목을 나누어 적고", "변경 여부를 먼저 표시하고", "본문 확인을 모두 마친 뒤",
] as const;

const EDITORIAL_CLOSERS = [
  "확인한 결과는 전화 메모와 맞춥니다.", "다음 항목으로 넘어가기 전에 한 줄을 대조합니다.",
  "확인되지 않은 내용은 추정하지 않습니다.", "화면 선택과 통화 확인의 역할을 구분합니다.",
  "현재 값은 변경 전 메모와 섞지 않습니다.", "선택한 한 항목만 마지막 기록에 남깁니다.",
  "사람별 선택이 섞이지 않았는지 살핍니다.", "완료한 항목에는 다시 확인 표시를 남깁니다.",
  "새 값이 생기면 기존 값 옆에 따로 적습니다.", "첫 문의에 필요한 사실만 순서대로 전달합니다.",
  "주소 단계와 상세 위치를 서로 다른 줄로 둡니다.", "공개되지 않은 조합은 임의로 만들지 않습니다.",
  "통화에서 받은 답을 준비 메모에 반영합니다.", "운영 기준은 주소 정보와 별도 묶음으로 봅니다.",
  "지역 목록은 실제 주소를 고르는 데만 사용합니다.", "전화 전 기록과 상담 답변을 서로 대조합니다.",
  "숫자의 뜻이 서로 다른지 한 번 더 살핍니다.", "상위와 현재 단계의 순서를 바꾸지 않습니다.",
  "마무리에서는 확인된 항목만 짧게 읽습니다.", "마지막 목록 뒤에서 상세 정보를 준비합니다.",
] as const;

function siteIndex(site: BabySiteConfig): number {
  const index = ALL_BABY_SITES.findIndex((candidate) => candidate.key === site.key);
  if (index < 0) throw new Error(`BABY_CONTENT_UNKNOWN_SITE:${site.key}`);
  return index;
}

function siteNodes(site: BabySiteConfig): readonly BabyRegionNode[] {
  return getRegionNodesForSite(site.key);
}

function globalRouteIndex(site: BabySiteConfig, node: BabyRegionNode): number {
  let offset = 0;
  for (const candidate of ALL_BABY_SITES) {
    const nodes = siteNodes(candidate);
    if (candidate.key === site.key) {
      const local = nodes.findIndex((entry) => entry.path === node.path);
      if (local < 0) {
        throw new Error(`BABY_CONTENT_NODE_OUTSIDE_SITE:${site.key}:${node.path}`);
      }
      return offset + local;
    }
    offset += nodes.length;
  }
  throw new Error(`BABY_CONTENT_UNKNOWN_SITE:${site.key}`);
}

function directChildren(
  node: BabyRegionNode,
  site: BabySiteConfig,
): readonly BabyRegionNode[] {
  const expectedLength = node.segments.length + 1;
  return siteNodes(site).filter(
    (candidate) =>
      candidate.segments.length === expectedLength &&
      node.segments.every((segment, index) => candidate.segments[index] === segment),
  );
}

function parentNode(
  node: BabyRegionNode,
  site: BabySiteConfig,
): BabyRegionNode | null {
  if (node.segments.length === 0) return null;
  const expected = node.segments.slice(0, -1);
  return (
    siteNodes(site).find(
      (candidate) =>
        candidate.segments.length === expected.length &&
        expected.every((segment, index) => candidate.segments[index] === segment),
    ) ?? null
  );
}

function sourceAliases(node: BabyRegionNode): string[] {
  const structural = node as BabyRegionNode & {
    records?: readonly { sourceNames?: readonly string[]; name?: string }[];
    representative?: { sourceNames?: readonly string[] };
  };
  const aliases = [
    ...(structural.representative?.sourceNames ?? []),
    ...(structural.records ?? []).flatMap((record) => [
      ...(record.sourceNames ?? []),
      ...(record.name ? [record.name] : []),
    ]),
  ];
  return [...new Set(aliases)].filter((name) => name !== node.displayName);
}

function qualifiedDisplayName(node: BabyRegionNode, site: BabySiteConfig): string {
  if (node.kind === "home") return site.searchName;
  const parent = parentNode(node, site);
  if (node.kind === "district") return `${site.searchName} ${node.displayName}`;
  if (parent?.kind === "district") {
    return `${site.searchName} ${parent.displayName} ${node.displayName}`;
  }
  return `${site.searchName} ${node.displayName}`;
}

function voiceFor(site: BabySiteConfig): VoiceProfile {
  const voice = CITY_VOICE_PROFILES[siteIndex(site)];
  if (!voice) throw new Error(`BABY_CONTENT_VOICE_MISSING:${site.key}`);
  return voice;
}

function layoutFor(site: BabySiteConfig): RegionContent["layoutSemantic"] {
  const layout = LAYOUT_SEMANTICS[siteIndex(site) % LAYOUT_SEMANTICS.length];
  if (!layout) throw new Error(`BABY_CONTENT_LAYOUT_MISSING:${site.key}`);
  return layout;
}

function cue(routeIndex: number, slot: number): { opener: string; closer: string } {
  const opener = EDITORIAL_OPENERS[(routeIndex + slot * 7) % EDITORIAL_OPENERS.length];
  const block = Math.floor(routeIndex / EDITORIAL_OPENERS.length);
  const closer = EDITORIAL_CLOSERS[(block + slot * 11) % EDITORIAL_CLOSERS.length];
  if (!opener || !closer) throw new Error("BABY_CONTENT_CUE_MISSING");
  return { opener, closer };
}

function routeContext(node: BabyRegionNode, site: BabySiteConfig): string {
  const label = qualifiedDisplayName(node, site);
  const children = directChildren(node, site);
  const parent = parentNode(node, site);
  if (node.kind === "home") {
    const sample = children.slice(0, 4).map((child) => child.displayName).join("·");
    return `${label} 홈은 직계 지역 ${children.length}개${sample ? `(${sample}${children.length > 4 ? " 외" : ""})` : ""}로 이어집니다.`;
  }
  if (children.length > 0) {
    const sample = children.slice(0, 4).map((child) => child.displayName).join("·");
    return `${label} 아래에는 대표 주소 경로 ${children.length}개인 ${sample}${children.length > 4 ? " 외 항목" : ""}이 연결됩니다.`;
  }
  const siblings = parent ? directChildren(parent, site) : [];
  return `${label}은 ${qualifiedDisplayName(parent ?? node, site)} 아래 대표 주소 경로이며 같은 단계의 경로는 모두 ${siblings.length}개입니다.`;
}

function paragraph(
  node: BabyRegionNode,
  site: BabySiteConfig,
  routeIndex: number,
  slot: number,
  fact: string,
): string {
  const voice = voiceFor(site);
  const editorial = cue(routeIndex, slot);
  const voiceSentence = [voice.lead, voice.method, voice.recap][slot % 3];
  return `${voiceSentence}. ${editorial.opener}, ${fact} ${editorial.closer}`;
}

function section(
  node: BabyRegionNode,
  site: BabySiteConfig,
  routeIndex: number,
  slot: number,
  id: string,
  heading: string,
  first: string,
  second: string,
): ContentSection {
  const label = qualifiedDisplayName(node, site);
  return {
    id,
    heading: `${label} ${heading}`,
    paragraphs: [
      paragraph(node, site, routeIndex, slot * 2, first),
      paragraph(node, site, routeIndex, slot * 2 + 1, second),
    ],
  };
}

type SectionSeed = {
  id: string;
  heading: string;
  first: (node: BabyRegionNode, site: BabySiteConfig) => string;
  second: (node: BabyRegionNode, site: BabySiteConfig) => string;
};

const SHARED_SECTION_SEEDS: Record<string, SectionSeed> = {
  "destination-note": {
    id: "destination-note",
    heading: "받을 주소 메모",
    first: () => "도로명, 건물 번호, 건물명을 행정 지역명과 별도 줄에 적습니다.",
    second: () => "동·호수와 출입에 필요한 상세 내용은 공개 검색창이 아니라 전화상담에서 전달합니다.",
  },
  "schedule-check": {
    id: "schedule-check",
    heading: "날짜·시각 확인",
    first: () => "희망 날짜와 시작 시각은 일정 항목이고 60·90·120분은 코스의 이용 시간 항목입니다.",
    second: () => "실제 가능 여부는 상세 주소와 함께 24시간 전화상담에서 확인합니다.",
  },
  "course-choice": {
    id: "course-choice",
    heading: "코스 선택 기준",
    first: () => "타이·아로마·힐링·스페셜·남성전용 가운데 원하는 코스명을 먼저 고릅니다.",
    second: () => "오일 사용, 압, 스트레칭 비중과 집중 부위는 선택한 코스와 함께 상담에서 확인합니다.",
  },
  "price-ledger": {
    id: "price-ledger",
    heading: "시간별 가격표",
    first: () => "일반 네 코스는 60·90·120분, 남성전용은 60·90분으로 가격표가 모두 14개 행입니다.",
    second: () => "코스명과 이용 시간이 교차하는 한 행을 찾아 표시 금액을 확인합니다.",
  },
  "party-count": {
    id: "party-count",
    heading: "인원과 2인 프로그램",
    first: () => "1인 이용인지 커플·부부 2인 동시 관리인지 전화 첫 부분에서 알립니다.",
    second: () => "두 사람이 다른 코스나 시간을 고르면 사람별 선택을 두 줄로 나누어 확인합니다.",
  },
  "onsite-payment": {
    id: "onsite-payment",
    heading: "현장 후불 결제",
    first: () => "사전 예약금이나 선입금 없이 관리를 마친 뒤 현장에서 결제합니다.",
    second: () => "현금과 무선 카드 단말기 가운데 사용할 결제 방법을 전화에서 확인합니다.",
  },
  "supplies-hygiene": {
    id: "supplies-hygiene",
    heading: "비품·소독 기준",
    first: () => "이용 비품은 일회용 항목을 사용한다는 운영 기준을 확인합니다.",
    second: () => "관리 전과 관리 후에는 각각 소독 절차를 적용한다는 항목을 함께 봅니다.",
  },
  "call-recap": {
    id: "call-recap",
    heading: "전화 확인과 변경",
    first: () => "주소, 날짜·시각, 인원, 코스·시간, 결제 방법 순서로 준비한 내용을 전달합니다.",
    second: () => "주소나 일정, 인원, 코스가 바뀌면 기존 값과 새 값을 구분해 다시 확인합니다.",
  },
};

const LAYOUT_SECTION_ORDERS: readonly (readonly string[])[] = [
  ["address-boundary", "branch-overview", "destination-note", "schedule-check", "course-choice", "price-ledger", "party-count", "onsite-payment", "supplies-hygiene", "call-recap"],
  ["address-boundary", "destination-note", "call-recap", "schedule-check", "party-count", "course-choice", "price-ledger", "supplies-hygiene", "onsite-payment", "branch-overview"],
  ["course-choice", "price-ledger", "address-boundary", "branch-overview", "destination-note", "party-count", "schedule-check", "call-recap", "onsite-payment", "supplies-hygiene"],
  ["schedule-check", "destination-note", "address-boundary", "branch-overview", "call-recap", "course-choice", "price-ledger", "party-count", "supplies-hygiene", "onsite-payment"],
  ["branch-overview", "address-boundary", "destination-note", "course-choice", "schedule-check", "party-count", "price-ledger", "call-recap", "supplies-hygiene", "onsite-payment"],
  ["onsite-payment", "supplies-hygiene", "party-count", "course-choice", "price-ledger", "schedule-check", "address-boundary", "branch-overview", "destination-note", "call-recap"],
] as const;

function rootOrDistrictSections(
  node: BabyRegionNode,
  site: BabySiteConfig,
  routeIndex: number,
): ContentSection[] {
  const children = directChildren(node, site);
  const childNames = children.slice(0, 5).map((child) => child.displayName).join("·");
  const dynamic: Record<string, SectionSeed> = {
    "address-boundary": {
      id: "address-boundary",
      heading: "주소 경계 읽기",
      first: () => `이 페이지의 직계 하위 지역 수는 ${children.length}개이며 화면 경로는 그 실제 계층만 포함합니다.`,
      second: () => `${childNames}${children.length > 5 ? " 외 지역" : ""} 가운데 받을 곳과 같은 주소 단계를 고릅니다.`,
    },
    "branch-overview": {
      id: "branch-overview",
      heading: "직계 지역 갈래",
      first: () => `직계 카드 ${children.length}개는 다른 시·군을 섞지 않고 ${site.searchName} 아래 경로로만 구성됩니다.`,
      second: () => "카드를 연 뒤에도 상위 지역과 현재 지역이 맞는지 breadcrumb 순서로 대조합니다.",
    },
    ...SHARED_SECTION_SEEDS,
  };
  const order = LAYOUT_SECTION_ORDERS[siteIndex(site) % LAYOUT_SECTION_ORDERS.length];
  if (!order) throw new Error(`BABY_CONTENT_SECTION_ORDER_MISSING:${site.key}`);
  const sections = order.map((id, slot) => {
    const seed = dynamic[id];
    if (!seed) throw new Error(`BABY_CONTENT_SECTION_SEED_MISSING:${id}`);
    return section(
      node,
      site,
      routeIndex,
      slot,
      seed.id,
      seed.heading,
      seed.first(node, site),
      seed.second(node, site),
    );
  });
  sections.push(
    section(
      node,
      site,
      routeIndex,
      sections.length,
      "child-directory",
      "하위 주소 디렉터리",
      `마지막 목록에는 이 페이지에서 바로 이어지는 지역 ${children.length}개만 표시합니다.`,
      "선택한 지역 뒤의 도로명과 건물명은 전화상담에서 이어서 전달합니다.",
    ),
  );
  return sections;
}

function leafSections(
  node: BabyRegionNode,
  site: BabySiteConfig,
  routeIndex: number,
): ContentSection[] {
  const parent = parentNode(node, site);
  const siblings = parent ? directChildren(parent, site) : [];
  const aliases = sourceAliases(node);
  const previous = siblings[(Math.max(0, siblings.findIndex((item) => item.path === node.path)) - 1 + siblings.length) % Math.max(1, siblings.length)];
  const next = siblings[(Math.max(0, siblings.findIndex((item) => item.path === node.path)) + 1) % Math.max(1, siblings.length)];
  const seeds: SectionSeed[] = [
    {
      id: "address-level",
      heading: "현재 주소 단계",
      first: () => `${node.displayName} 경로의 바로 위 단계는 ${parent ? qualifiedDisplayName(parent, site) : site.searchName}입니다.`,
      second: () => `같은 상위 단계에는 현재 경로를 포함해 대표 주소 ${siblings.length}개가 놓입니다.`,
    },
    {
      id: "source-aliases",
      heading: "주소 명칭 확인",
      first: () => aliases.length > 0
        ? `행정 자료에서 함께 묶인 주소 명칭은 ${aliases.slice(0, 5).join("·")}${aliases.length > 5 ? " 외 항목" : ""}입니다.`
        : `${node.displayName} 경로는 별도 병합 명칭 없이 현재 표시 이름으로 확인합니다.`,
      second: () => "같은 이름의 지역을 혼동하지 않도록 상위 지역과 현재 이름을 함께 읽습니다.",
    },
    {
      id: "destination-detail",
      heading: "상세 도착지 메모",
      first: () => "도로명, 건물 번호, 건물명과 출입에 필요한 내용을 서로 다른 항목으로 적습니다.",
      second: () => "동·호수처럼 공개할 필요가 없는 상세 위치는 전화상담에서만 전달합니다.",
    },
    {
      id: "schedule-note",
      heading: "희망 일정 구분",
      first: () => "날짜와 희망 시작 시각은 일정으로, 60·90·120분은 코스 이용 시간으로 구분합니다.",
      second: () => "가능한 일정은 주소와 인원을 알린 뒤 24시간 전화상담에서 확인합니다.",
    },
    {
      id: "course-time",
      heading: "코스·이용 시간",
      first: () => "타이·아로마·힐링·스페셜·남성전용 중 코스명을 고르고 해당 시간 행을 찾습니다.",
      second: () => "일반 네 코스의 60·90·120분과 남성전용의 60·90분을 합친 14개 가격 행만 사용합니다.",
    },
    SHARED_SECTION_SEEDS["party-count"]!,
    SHARED_SECTION_SEEDS["onsite-payment"]!,
    SHARED_SECTION_SEEDS["supplies-hygiene"]!,
    {
      id: "change-recap",
      heading: "통화 마무리",
      first: () => "주소, 일정, 인원, 코스·시간, 결제 방법 순서로 상담 내용을 다시 읽습니다.",
      second: () => "한 항목이 바뀌면 이전 값과 새 값을 구분하고 변경된 부분을 다시 확인합니다.",
    },
  ];
  const sections = seeds.map((seed, slot) =>
    section(
      node,
      site,
      routeIndex,
      slot,
      seed.id,
      seed.heading,
      seed.first(node, site),
      seed.second(node, site),
    ),
  );
  const related = [previous, next]
    .filter((candidate): candidate is BabyRegionNode => Boolean(candidate) && candidate?.path !== node.path)
    .filter((candidate, index, all) => all.findIndex((item) => item.path === candidate.path) === index);
  sections.push(
    section(
      node,
      site,
      routeIndex,
      sections.length,
      "related-region-directory",
      "같은 단계 지역 디렉터리",
      related.length > 0
        ? `같은 상위 주소에서 앞뒤로 확인할 수 있는 경로는 ${related.map((item) => item.displayName).join("·")}입니다.`
        : "같은 상위 주소에 별도 대표 경로가 없으므로 현재 지역 다음에는 상세 주소를 준비합니다.",
      "관련 지역 목록은 본문 확인을 마친 뒤 주소를 다시 고를 때 사용합니다.",
    ),
  );
  return sections;
}

export function isBroadDetailRegion(node: BabyRegionNode): boolean {
  return node.kind !== "representative";
}

export function createRegionContent(
  node: BabyRegionNode,
  site: BabySiteConfig = ACTIVE_SITE,
): RegionContent {
  const index = globalRouteIndex(site, node);
  const label = qualifiedDisplayName(node, site);
  const left = TITLE_LEFT[index % TITLE_LEFT.length];
  const right = TITLE_RIGHT[Math.floor(index / TITLE_LEFT.length) % TITLE_RIGHT.length];
  if (!left || !right) throw new Error(`BABY_CONTENT_META_PATTERN_MISSING:${index}`);
  const voice = voiceFor(site);
  const detailMode: RegionContent["detailMode"] =
    node.kind === "home" ? "root" : node.kind === "district" ? "district" : "leaf";
  const sections = isBroadDetailRegion(node)
    ? rootOrDistrictSections(node, site, index)
    : leafSections(node, site, index);
  const directory = sections.at(-1);
  if (!directory || !/directory/u.test(directory.id)) {
    throw new Error(`BABY_CONTENT_DIRECTORY_NOT_LAST:${site.key}:${node.path}`);
  }
  const hookOne = paragraph(
    node,
    site,
    index,
    40,
    `${routeContext(node, site)} 화면에서는 행정 지역을 고르고 상세 위치는 전화에서 이어서 확인합니다.`,
  );
  const hookTwo = paragraph(
    node,
    site,
    index,
    41,
    `${routeContext(node, site)} 코스·시간과 현장 후불 결제까지 같은 메모에서 대조합니다.`,
  );

  return {
    title: `${label} 출장마사지 | ${left}·${right} - ${site.brandName}`,
    description: `${label} 출장마사지에서 ${left}와 ${right}을 확인합니다. 5개 코스·14개 가격 행, 24시간 전화상담, 2인 프로그램과 현장 후불 기준을 순서대로 안내합니다.`,
    keywords: [
      `${label} 출장마사지`,
      `${label} 출장안마`,
      `${label} ${left}`,
      `${site.brandName} ${right}`,
      `${label} 현장후불`,
    ],
    h1: `${label} 출장마사지 ${left}·${right}`,
    eyebrow: `${site.brandName} · ${voice.method}`,
    hooks: [hookOne, hookTwo],
    sections,
    faqIntro: `${label} 이용 전에 자주 확인하는 질문을 ${voice.lead}는 방식으로 모았습니다. 답변은 공개된 운영 기준을 설명하며, 현재 일정과 방문 가능 여부는 전화에서 확인합니다.`,
    childDirectory: {
      heading: directory.heading,
      intro: directory.paragraphs[0],
    },
    ctaLabels: ["전화로 일정 확인", "코스·가격 보기", "관련 지역 찾기"],
    detailMode,
    layoutSemantic: layoutFor(site),
  };
}
