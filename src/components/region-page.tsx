import {
  FaqSection,
  InteriorHero,
  Narrative,
  PhotoSection,
  PricingPreview,
  ProcessSection,
  RegionDirectory,
  StandardsSection,
  type BreadcrumbItem,
  type DirectoryItem,
  type NarrativeSection,
} from "@/components/content-blocks";
import { ResponsivePicture } from "@/components/responsive-picture";
import { buildRegionServiceFaqs } from "@/data/service-guide";
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
        <ProcessSection heading={`${regionName} 이용 순서`} />
        <PricingPreview heading={`${regionName} 코스·가격 확인`} />
        <PhotoSection
          alt={images.bodyAAlt}
          caption="코스명과 이용 시간을 가격표와 대조한 뒤 현장 후불로 결제합니다."
          reverse={regionPath.length % 2 === 0}
          sources={images.bodyA}
        />
        {secondHalf.length ? <Narrative className="narrative--second" sections={secondHalf} /> : null}
        {content.detailMode !== "leaf" ? <StandardsSection heading={`${regionName} 운영 안내`} /> : null}
        <div className="faq-intro"><p>{content.faqIntro}</p></div>
        <FaqSection faqs={buildRegionServiceFaqs(regionName)} heading={`${regionName} 예약 전 질문`} />
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
