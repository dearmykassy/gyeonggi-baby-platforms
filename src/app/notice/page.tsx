import type { Metadata } from "next";

import { FixedPageShell, NoticePageContent } from "@/components/fixed-pages";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { ACTIVE_SITE } from "@/lib/site-config";

const title = `${ACTIVE_SITE.searchName} 출장마사지 공지사항 | ${ACTIVE_SITE.brandName}`;
const description = `${ACTIVE_SITE.searchName} 출장마사지 예약 전에 방문 가능 여부, 주소·시각 변경, 코스 확인과 현장 후불 결제 기준을 확인합니다.`;

export function generateMetadata(): Metadata {
  return toNextMetadata(createRouteMetadataContract("/notice/", title, description, [
    `${ACTIVE_SITE.searchName}출장마사지 공지`,
    `${ACTIVE_SITE.searchName}출장안마 확인사항`,
    `${ACTIVE_SITE.searchName} 현장후불 안내`,
  ]));
}

export default function NoticePage() {
  return (
    <FixedPageShell
      description={description}
      eyebrow={`${ACTIVE_SITE.brandName} · NOTICE`}
      title={`${ACTIVE_SITE.searchName} 공지사항`}
    >
      <NoticePageContent cityName={ACTIVE_SITE.searchName} />
    </FixedPageShell>
  );
}
