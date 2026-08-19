export type PricingOption = {
  minutes: number;
  priceKrw: number;
};

export type PricingCourse = {
  id: "thai" | "aroma" | "healing" | "special" | "male-only";
  name: string;
  description: string;
  options: readonly PricingOption[];
};

export const PROVISIONAL_PRICING_SOURCE = {
  status: "OWNER_CONFIRMED_FINAL_TABLE",
  authorizedAt: "2026-08-13",
  note: "사장님이 최종 확정한 코스명, 시간, 금액을 표시한다.",
  imageSha256: [
    "1581c6c0d70bd395d3e0fe0658561cb382b87b77357cacf36621e660960a6594",
  ],
} as const;

export const PROVISIONAL_PRICING: readonly PricingCourse[] = [
  {
    id: "thai",
    name: "타이마사지",
    description:
      "오일을 사용하지 않고 스트레칭과 지압을 중심으로 진행합니다. 선호하는 압과 집중 부위는 시작 전에 상담으로 정합니다.",
    options: [
      { minutes: 60, priceKrw: 80_000 },
      { minutes: 90, priceKrw: 100_000 },
      { minutes: 120, priceKrw: 120_000 },
    ],
  },
  {
    id: "aroma",
    name: "아로마마사지",
    description:
      "오일을 사용해 어깨와 등 라인을 부드럽게 관리하는 코스입니다. 오일 사용 여부와 선호 압은 상담에서 확인합니다.",
    options: [
      { minutes: 60, priceKrw: 90_000 },
      { minutes: 90, priceKrw: 110_000 },
      { minutes: 120, priceKrw: 130_000 },
    ],
  },
  {
    id: "healing",
    name: "힐링마사지",
    description:
      "강한 압보다 부드러운 진행을 선호할 때 살펴볼 수 있는 코스입니다. 세부 방식과 강도는 시작 전에 확인합니다.",
    options: [
      { minutes: 60, priceKrw: 100_000 },
      { minutes: 90, priceKrw: 120_000 },
      { minutes: 120, priceKrw: 140_000 },
    ],
  },
  {
    id: "special",
    name: "스페셜마사지",
    description:
      "부위별로 방식을 바꿔가며 진행하는 코스입니다. 스트레칭 비중과 시간 배분을 시작 전에 함께 정합니다.",
    options: [
      { minutes: 60, priceKrw: 110_000 },
      { minutes: 90, priceKrw: 130_000 },
      { minutes: 120, priceKrw: 150_000 },
    ],
  },
  {
    id: "male-only",
    name: "남성전용",
    description:
      "체격과 근육량을 고려해 비교적 높은 압으로 진행하는 코스입니다. 원하는 압과 집중 부위는 시작 전에 확인합니다.",
    options: [
      { minutes: 60, priceKrw: 120_000 },
      { minutes: 90, priceKrw: 150_000 },
    ],
  },
] as const;

export function formatKrw(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}
