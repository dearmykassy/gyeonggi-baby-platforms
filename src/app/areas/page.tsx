import type { Metadata } from "next";

import { InteriorHero, RegionDirectory } from "@/components/content-blocks";
import { JsonLd } from "@/components/json-ld";
import { SiteSearch } from "@/components/site-search";
import { toDirectoryItems, toSearchItems } from "@/components/view-model";
import { createRouteMetadataContract, getSiteOrigin, toNextMetadata } from "@/lib/metadata";
import { ACTIVE_REGION_NODES, getNodeBySegments, getRegionChildren } from "@/lib/regions";
import { ACTIVE_SITE } from "@/lib/site-config";

const title = `${ACTIVE_SITE.searchName} 출장마사지 지역 안내 | ${ACTIVE_SITE.brandName}`;
const description = `${ACTIVE_SITE.searchName} 안에서 운영하는 구·동·읍·면 지역 경로를 검색하고 상위·하위 순서로 확인합니다.`;

export function generateMetadata(): Metadata {
  return toNextMetadata(
    createRouteMetadataContract("/areas/", title, description, [
      `${ACTIVE_SITE.searchName}출장마사지 지역`,
      `${ACTIVE_SITE.searchName}출장안마 지역`,
      `${ACTIVE_SITE.searchName} 동별 마사지`,
    ]),
  );
}

export default function AreasPage() {
  const root = getNodeBySegments([]);
  if (!root) throw new Error(`BABY_AREAS_ROOT_MISSING:${ACTIVE_SITE.key}`);
  const children = getRegionChildren(root);
  const website = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: new URL("/areas/", getSiteOrigin()).href,
  };
  return (
    <article className="fixed-page areas-page">
      <JsonLd data={website} />
      <InteriorHero
        description={description}
        eyebrow={`${ACTIVE_SITE.brandName} · AREA`}
        title={`${ACTIVE_SITE.searchName} 지역 안내`}
      />
      <div className="fixed-page__body content-frame">
        <section className="area-search-panel">
          <div className="section-heading">
            <p>LOCAL SEARCH</p>
            <h2>{ACTIVE_SITE.searchName} 하위 지역 검색</h2>
            <p>이 사이트에 포함된 지역만 검색 결과에 표시합니다.</p>
          </div>
          <SiteSearch cityName={ACTIVE_SITE.searchName} items={toSearchItems(ACTIVE_REGION_NODES)} />
        </section>
        <section className="fixed-intro">
          <h2>지역 경로 확인 방법</h2>
          <p>구가 있는 곳은 구 지역 안내에서 동을 선택하고, 구가 없는 곳은 아래 읍·면·동 지역에서 바로 상세 안내를 엽니다. 다른 시·군 경로는 포함하지 않습니다.</p>
        </section>
        {/* Directory remains the last general-content section. */}
        <RegionDirectory
          heading={`${ACTIVE_SITE.searchName} 직계 지역`}
          intro={`${children.length}개 직계 경로에서 받을 지역을 먼저 선택하세요.`}
          items={toDirectoryItems(children)}
        />
      </div>
    </article>
  );
}
