import type { Metadata } from "next";

import { BlogIndexContent } from "@/components/blog-pages";
import { getBlogPosts } from "@/data/blog-posts";
import { getRegionImageSet } from "@/lib/images";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { ACTIVE_SITE } from "@/lib/site-config";

const title = `${ACTIVE_SITE.searchName} 출장마사지 이용 안내 글 | ${ACTIVE_SITE.brandName}`;
const description = `${ACTIVE_SITE.searchName} 지역 선택과 전화 메모, 코스·가격표, 현장 후불 결제 기준을 실제 운영 정보로 정리합니다.`;

export function generateMetadata(): Metadata {
  return toNextMetadata(createRouteMetadataContract("/blog/", title, description, [
    `${ACTIVE_SITE.searchName}출장마사지 안내`,
    `${ACTIVE_SITE.searchName} 출장마사지 예약 준비`,
    `${ACTIVE_SITE.searchName} 현장후불`,
  ]));
}

export default function BlogPage() {
  const images = getRegionImageSet("/");
  return (
    <BlogIndexContent
      brandName={ACTIVE_SITE.brandName}
      cityName={ACTIVE_SITE.searchName}
      images={[images.bodyA, images.bodyB]}
      posts={getBlogPosts()}
    />
  );
}
