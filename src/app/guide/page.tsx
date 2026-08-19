import type { Metadata } from "next";

import { FixedPageShell, GuidePageContent } from "@/components/fixed-pages";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { ACTIVE_SITE } from "@/lib/site-config";

const title = `${ACTIVE_SITE.searchName} 출장마사지 이용 방법 | ${ACTIVE_SITE.brandName}`;
const description = `${ACTIVE_SITE.searchName} 방문 지역, 희망 시각, 코스·시간, 인원을 준비하고 전화상담부터 현장 후불 결제까지 진행하는 순서를 안내합니다.`;

export function generateMetadata(): Metadata {
  return toNextMetadata(createRouteMetadataContract("/guide/", title, description, [
    `${ACTIVE_SITE.searchName}출장마사지 이용방법`,
    `${ACTIVE_SITE.searchName}출장안마 예약`,
    `${ACTIVE_SITE.searchName} 24시간 마사지 상담`,
  ]));
}

export default function GuidePage() {
  return (
    <FixedPageShell
      description={description}
      eyebrow={`${ACTIVE_SITE.brandName} · GUIDE`}
      title={`${ACTIVE_SITE.searchName} 이용 방법`}
    >
      <GuidePageContent cityName={ACTIVE_SITE.searchName} />
    </FixedPageShell>
  );
}
