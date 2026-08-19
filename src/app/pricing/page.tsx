import type { Metadata } from "next";

import { FixedPageShell, PricingPageContent } from "@/components/fixed-pages";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { ACTIVE_SITE } from "@/lib/site-config";

const title = `${ACTIVE_SITE.searchName} 출장마사지 코스·가격 | ${ACTIVE_SITE.brandName}`;
const description = `${ACTIVE_SITE.searchName} 출장마사지의 타이·아로마·힐링·스페셜·남성전용 코스와 60·90·120분 현장 후불 가격을 확인합니다.`;

export function generateMetadata(): Metadata {
  return toNextMetadata(createRouteMetadataContract("/pricing/", title, description, [
    `${ACTIVE_SITE.searchName}출장마사지 가격`,
    `${ACTIVE_SITE.searchName}출장안마 코스`,
    `${ACTIVE_SITE.searchName} 현장후불 마사지`,
  ]));
}

export default function PricingPage() {
  return (
    <FixedPageShell
      description={description}
      eyebrow={`${ACTIVE_SITE.brandName} · PRICE`}
      title={`${ACTIVE_SITE.searchName} 코스·가격`}
    >
      <PricingPageContent cityName={ACTIVE_SITE.searchName} />
    </FixedPageShell>
  );
}
