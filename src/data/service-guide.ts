export type ConsultationItem = {
  index: string;
  title: string;
  description: string;
};

export type ServiceStandard = {
  label: string;
  title: string;
  description: string;
};

export type CourseSelectionGuide = {
  courseId: "thai" | "aroma" | "healing" | "special" | "male-only";
  courseName: string;
  title: string;
  description: string;
};

export type ServiceProcessStep = {
  title: string;
  description: string;
};

export type RegionServiceFaq = {
  question: string;
  answer: string;
};

/**
 * Customer-facing facts explicitly supplied by the owner on 2026-08-13.
 * Phone numbers, detailed service keywords, arrival-time promises, and
 * cancellation rules stay outside this module until they are confirmed.
 */
export const CONSULTATION_ITEMS: readonly ConsultationItem[] = [
  {
    index: "01",
    title: "방문 지역",
    description: "시·군·구 또는 동 이름처럼 확인 가능한 지역명을 알려주세요.",
  },
  {
    index: "02",
    title: "희망 시각",
    description: "이용을 원하는 날짜와 대략적인 시작 시각을 함께 알려주세요.",
  },
  {
    index: "03",
    title: "코스와 시간",
    description: "가격표에서 원하는 코스와 이용 시간을 골라 알려주세요.",
  },
  {
    index: "04",
    title: "이용 인원",
    description: "1인 이용인지, 커플·부부 2인 동시 관리인지 알려주세요.",
  },
] as const;

export const SERVICE_STANDARDS: readonly ServiceStandard[] = [
  {
    label: "PAYMENT 01",
    title: "100% 현장 후불",
    description: "사전 예약금 없이 관리가 끝난 뒤 현장에서 결제합니다.",
  },
  {
    label: "PAYMENT 02",
    title: "현장 카드 결제",
    description: "무선 단말기를 이용한 현장 카드 결제가 가능합니다.",
  },
  {
    label: "HOURS",
    title: "365일 24시간",
    description: "새벽 시간을 포함해 연중무휴로 상담과 운영을 이어갑니다.",
  },
  {
    label: "PROGRAM",
    title: "2인 동시 관리",
    description: "커플·부부를 위한 2인 동시 관리 프로그램을 운영합니다.",
  },
  {
    label: "HYGIENE",
    title: "일회용 비품·소독",
    description: "일회용 비품 사용과 관리 전후 소독 원칙을 준수합니다.",
  },
  {
    label: "CONFIRMATION",
    title: "상담 내용 확인",
    description: "방문 가능 여부와 선택 코스, 이용 시간은 전화상담에서 안내합니다.",
  },
] as const;

/**
 * Selection copy only describes the owner-approved course format: oil use,
 * pressure, stretching, and how time is divided. It deliberately makes no
 * medical or outcome claim.
 */
export const COURSE_SELECTION_GUIDE: readonly CourseSelectionGuide[] = [
  {
    courseId: "thai",
    courseName: "타이마사지",
    title: "오일 없이 스트레칭과 지압을 원할 때",
    description:
      "타이마사지의 시간별 가격을 확인하세요. 원하는 압과 집중 부위는 전화상담에서 함께 정합니다.",
  },
  {
    courseId: "aroma",
    courseName: "아로마마사지",
    title: "오일을 사용한 부드러운 관리를 원할 때",
    description:
      "아로마마사지의 시간별 가격을 확인하세요. 오일 사용과 선호 압은 시작 전에 다시 확인합니다.",
  },
  {
    courseId: "healing",
    courseName: "힐링마사지",
    title: "강한 압보다 편안한 진행을 선호할 때",
    description:
      "힐링마사지의 시간별 가격을 확인하세요. 세부 방식과 강도는 상담 내용에 맞춰 정합니다.",
  },
  {
    courseId: "special",
    courseName: "스페셜마사지",
    title: "부위별 방식과 시간 배분을 조정하고 싶을 때",
    description:
      "스페셜마사지의 시간별 가격을 확인하세요. 스트레칭 비중과 집중 부위는 시작 전에 정합니다.",
  },
  {
    courseId: "male-only",
    courseName: "남성전용",
    title: "체격을 고려한 높은 압을 선호할 때",
    description:
      "남성전용 코스의 시간별 가격을 확인하세요. 원하는 압과 집중 부위는 상담에서 확인합니다.",
  },
] as const;

export const SERVICE_PROCESS_STEPS: readonly ServiceProcessStep[] = [
  {
    title: "전화상담",
    description: "방문 지역과 희망 날짜·시각, 이용 인원을 알려주세요.",
  },
  {
    title: "코스·시간 선택",
    description: "운영 가격표에서 원하는 코스와 이용 시간을 선택합니다.",
  },
  {
    title: "예약 내용 확인",
    description: "방문 가능 여부와 선택 코스, 이용 시간을 확인합니다.",
  },
  {
    title: "관리 진행",
    description: "예약에서 확인한 코스와 이용 시간에 맞춰 진행합니다.",
  },
  {
    title: "현장 결제",
    description: "관리가 끝난 뒤 현장에서 현금 또는 카드로 결제합니다.",
  },
] as const;

export function buildRegionServiceFaqs(
  regionName: string,
): readonly RegionServiceFaq[] {
  return [
    {
      question: "질문 1. 선입금이 정말로 전혀 없나요?",
      answer:
        "답변. 네, 어떠한 사전 예약금도 없는 100% 현장 후불제입니다.",
    },
    {
      question: `질문 2. ${regionName} 방문이 가능한가요?`,
      answer:
        "답변. 방문 가능 여부는 희망 날짜와 시각을 함께 알려주시면 예약 확정 전에 확인해 드립니다.",
    },
    {
      question: "질문 3. 도착까지 얼마나 걸리나요?",
      answer:
        "답변. 예상 도착 시각은 방문 지역과 희망 시각을 확인한 뒤 전화상담에서 안내합니다.",
    },
    {
      question: "질문 4. 현장 카드 결제가 가능한가요?",
      answer:
        "답변. 네, 무선 단말기를 소지하여 현장에서 즉시 결제 가능합니다.",
    },
    {
      question: "질문 5. 커플/부부 관리도 되나요?",
      answer: "답변. 네, 2인 동시 관리 프로그램이 완비되어 있습니다.",
    },
    {
      question: "질문 6. 새벽 시간에도 이용 가능하나요?",
      answer: "답변. 네, 365일 24시간 연중무휴로 운영됩니다.",
    },
    {
      question: "질문 7. 위생 관리는 철저한가요?",
      answer: "답변. 네, 일회용 비품 사용 및 철저한 소독을 준수합니다.",
    },
  ];
}

export const SERVICE_GUIDE_VERIFIED_AT = "2026-08-13" as const;
