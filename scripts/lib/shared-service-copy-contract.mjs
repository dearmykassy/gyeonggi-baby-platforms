function cleanText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim();
}

export const SHARED_SERVICE_SECTION_IDS = Object.freeze([
  "service-overview",
  "course-price",
  "phone-reservation",
  "arrival-hygiene",
  "onsite-payment",
  "service-flow",
]);

const SHARED_SERVICE_SECTION_ID_SET = new Set(SHARED_SERVICE_SECTION_IDS);

/**
 * This is deliberately independent of createRegionContent(). The copy audit
 * may allow only these fixed service statements; authored output cannot add
 * itself to its own allowlist.
 */
export function expectedSharedServiceSections(primaryKeyword) {
  const keyword = cleanText(primaryKeyword);
  if (!keyword) {
    throw new Error("BABY_SHARED_SERVICE_PRIMARY_KEYWORD_MISSING");
  }
  return [
    {
      id: "service-overview",
      heading: `${keyword} 서비스 안내`,
      paragraphs: [
        `${keyword}는 고객이 지정한 숙소나 거주지로 여성 마사지사가 찾아가는 방문 관리입니다. 24시간 전화로 상세 주소와 희망 시각을 확인한 뒤 일정을 정합니다.`,
      ],
    },
    {
      id: "course-price",
      heading: `${keyword} 코스별 가격`,
      paragraphs: [
        "타이·아로마·힐링·스페셜·남성전용 코스의 시간과 금액은 코스·가격 페이지에서 비교할 수 있습니다. 원하는 압과 집중 부위, 오일 사용 여부도 상담에서 확인합니다.",
      ],
    },
    {
      id: "phone-reservation",
      heading: "24시간 전화 예약",
      paragraphs: [
        "희망 날짜와 시각, 1인 또는 커플·부부 2인 이용 여부를 알려 주세요. 방문 가능 여부와 예상 일정은 상세 주소를 받은 뒤 확인합니다.",
      ],
    },
    {
      id: "arrival-hygiene",
      heading: "여성 마사지사 방문과 위생 준비",
      paragraphs: [
        "도착 뒤 예약한 코스와 이용 시간을 다시 확인하고, 관리 전후 소독과 일회용 비품 사용 원칙에 따라 준비합니다.",
      ],
    },
    {
      id: "onsite-payment",
      heading: "관리 후 100% 현장 후불",
      paragraphs: [
        "관리가 끝난 뒤 현금 또는 무선 카드 단말기로 결제합니다. 예약 단계에서 선입금을 요구하지 않으며 선택 코스와 추가 여부를 결제 전에 확인합니다.",
      ],
    },
    {
      id: "service-flow",
      heading: "예약부터 결제까지 이용 흐름",
      paragraphs: [
        "상세 주소와 일정 확인, 코스 선택, 여성 마사지사 방문 관리, 현장 결제 순서로 이용합니다. 장소가 바뀌면 새 주소와 희망 시각을 다시 알려 주세요.",
      ],
    },
  ];
}

export function sharedServiceContractFailures(content) {
  const sections = Array.isArray(content?.sections) ? content.sections : [];
  const expected = expectedSharedServiceSections(content?.primaryKeyword);
  const expectedById = new Map(expected.map((section) => [section.id, section]));
  const failures = [];

  for (const id of SHARED_SERVICE_SECTION_IDS) {
    const matches = sections.filter((section) => cleanText(section?.id) === id);
    if (matches.length !== 1) {
      failures.push(`SERVICE_SECTION_CARDINALITY:${id}:${matches.length}`);
      continue;
    }
    const actual = matches[0];
    const contract = expectedById.get(id);
    if (actual.auditScope !== "shared-service") {
      failures.push(`SERVICE_SECTION_SCOPE:${id}`);
    }
    if ((actual.factRefs ?? []).some((reference) => cleanText(reference))) {
      failures.push(`SERVICE_SECTION_FACT_REFS:${id}`);
    }
    if (cleanText(actual.heading) !== cleanText(contract.heading)) {
      failures.push(`SERVICE_SECTION_HEADING:${id}`);
    }
    const actualParagraphs = (actual.paragraphs ?? []).map(cleanText);
    const expectedParagraphs = contract.paragraphs.map(cleanText);
    if (JSON.stringify(actualParagraphs) !== JSON.stringify(expectedParagraphs)) {
      failures.push(`SERVICE_SECTION_PARAGRAPHS:${id}`);
    }
  }

  for (const section of sections) {
    if (
      section?.auditScope === "shared-service" &&
      !SHARED_SERVICE_SECTION_ID_SET.has(cleanText(section.id))
    ) {
      failures.push(`UNEXPECTED_SHARED_SERVICE_SECTION_ID:${cleanText(section.id)}`);
    }
  }

  return [...new Set(failures)].sort();
}
