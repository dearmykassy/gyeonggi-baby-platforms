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
    id: string;
    heading: string;
    intro: string;
    auditScope: "directory";
    factRefs: readonly string[];
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
  const narrative = content.sections.filter(
    (section) => section.auditScope !== "directory",
  );
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
        <figcaption>{regionName} 상세 주소, 코스와 희망 시각은 전화상담에서 확인합니다.</figcaption>
      </figure>
      <div className="region-page__content content-frame">
        <Narrative sections={firstHalf} />
        <PhotoSection
          alt={images.bodyAAlt}
          caption={`${regionName} 방문 전 도로명과 건물명, 코스와 희망 시각을 준비합니다.`}
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
          auditTrace={content.childDirectory}
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
  const regionLinkLabel = (label: string) =>
    label.endsWith("지역 안내") ? label : `${label} 지역 안내`;
  const parent = breadcrumbs.at(-2);
  const contextual = [
    { href: "/", label: "전체 서비스 지역", context: `${regionName} 외 방문 가능 지역 확인` },
    ...(parent ? [{ href: parent.href, label: regionLinkLabel(parent.label), context: "예약할 방문 지역 다시 확인" }] : []),
    ...related.slice(0, 2).map((item) => ({
      href: item.href,
      label: regionLinkLabel(item.label),
      context: item.context ?? "방문 장소를 바꿀 때 상세 주소 확인",
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
        <p>QUICK GUIDE</p>
        <h2>{regionName} 예약 전에 함께 볼 안내</h2>
        <p>코스·가격, 이용 방법과 다른 방문 지역을 한곳에서 확인하세요.</p>
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
