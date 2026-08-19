import {
  InteriorHero,
  Narrative,
  PhotoSection,
  RegionDirectory,
  type BreadcrumbItem,
  type DirectoryItem,
  type NarrativeSection,
} from "@/components/content-blocks";
import { ResponsivePicture } from "@/components/responsive-picture";
import { SiteLink } from "@/components/site-link";
import { getRegionImageSet } from "@/lib/images";
import { normalizeLayoutVariant } from "@/components/template11-home";

export type RegionPageContent = {
  h1: string;
  eyebrow: string;
  description: string;
  hooks: readonly [string, string];
  sections: readonly NarrativeSection[];
  faqIntro: string;
  childDirectory: {
    heading: string;
    intro: string;
  };
  detailMode: "root" | "district" | "leaf";
};

export function RegionPage({
  regionPath,
  layoutVariant,
  regionName,
  breadcrumbs,
  content,
  directoryItems,
}: {
  regionPath: string;
  layoutVariant: string;
  regionName: string;
  breadcrumbs: readonly BreadcrumbItem[];
  content: RegionPageContent;
  directoryItems: readonly DirectoryItem[];
}) {
  const images = getRegionImageSet(regionPath);
  const narrative = content.sections.filter((section) => !section.id.includes("directory"));
  const firstHalf = narrative.slice(0, Math.ceil(narrative.length / 2));
  const secondHalf = narrative.slice(firstHalf.length);

  return (
    <article className="region-page" data-detail-mode={content.detailMode} data-layout-variant={normalizeLayoutVariant(layoutVariant)}>
      <InteriorHero
        breadcrumbs={breadcrumbs}
        description={content.description}
        eyebrow={content.eyebrow}
        title={content.h1}
      />
      <figure className="region-banner content-frame">
        <ResponsivePicture
          alt={images.heroAlt}
          className="region-banner__picture"
          eager
          intrinsicHeight={970}
          intrinsicWidth={1920}
          sizes="(max-width: 1279px) 100vw, 1240px"
          sources={images.hero}
        />
        <figcaption>{regionName} 세부 주소와 희망 시각은 전화상담에서 확인합니다.</figcaption>
      </figure>
      <div className="region-page__content content-frame">
        <Narrative sections={firstHalf} />
        <PhotoSection
          alt={images.bodyAAlt}
          caption={`${regionName} 경로의 상위·직계·인접 지역을 확인한 뒤 상세 주소를 준비합니다.`}
          reverse={regionPath.length % 2 === 0}
          sources={images.bodyA}
        />
        {secondHalf.length ? <Narrative className="narrative--second" sections={secondHalf} /> : null}
        <RegionalRouteLinks
          breadcrumbs={breadcrumbs}
          detailMode={content.detailMode}
          regionName={regionName}
          related={directoryItems}
        />
        {/* The directory is deliberately the final general-content section. */}
        <RegionDirectory
          heading={content.childDirectory.heading}
          intro={content.childDirectory.intro}
          items={directoryItems}
        />
      </div>
    </article>
  );
}

function RegionalRouteLinks({
  breadcrumbs,
  detailMode,
  regionName,
  related,
}: {
  breadcrumbs: readonly BreadcrumbItem[];
  detailMode: RegionPageContent["detailMode"];
  regionName: string;
  related: readonly DirectoryItem[];
}) {
  const parent = breadcrumbs.at(-2);
  const contextual = [
    { href: "/", label: "서비스 지역 홈", context: `${regionName}의 상위 지역 안내로 이동` },
    ...(parent ? [{ href: parent.href, label: `${parent.label} 상위 경로`, context: "한 단계 위의 지역 목록 확인" }] : []),
    ...related.slice(0, 2).map((item) => ({
      href: item.href,
      label: `${item.label} 인접 경로`,
      context: item.context ?? "같은 단계의 지역 경로 확인",
    })),
    { href: "/pricing/", label: "코스·가격표", context: "공통 코스와 시간별 금액 확인" },
    { href: "/guide/", label: "이용 방법", context: "전화 전에 준비할 항목 확인" },
  ];
  const links = contextual.filter(
    (item, index, all) =>
      all.findIndex((candidate) => candidate.href === item.href) === index,
  );

  return (
    <section
      className="route-link-summary"
      data-leaf-link-summary={detailMode === "leaf" ? "" : undefined}
      data-regional-link-summary
    >
      <div className="section-heading">
        <p>NEXT PATH</p>
        <h2>{regionName}에서 이어서 볼 페이지</h2>
        <p>지역 사실은 이 문서에서, 공통 가격과 이용 절차는 고정 안내에서 나누어 확인합니다.</p>
      </div>
      <div className="route-link-summary__grid">
        {links.map((item, index) => (
          <SiteLink href={item.href} key={item.href}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.label}</strong>
            <small>{item.context}</small>
          </SiteLink>
        ))}
      </div>
    </section>
  );
}
