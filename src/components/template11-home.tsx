import type { ReactNode } from "react";

import {
  FaqSection,
  Narrative,
  PhotoSection,
  PricingPreview,
  ProcessSection,
  RegionDirectory,
  StandardsSection,
  type DirectoryItem,
  type NarrativeSection,
} from "@/components/content-blocks";
import { HeroCarousel } from "@/components/hero-carousel";
import { ResponsivePicture } from "@/components/responsive-picture";
import { SiteLink } from "@/components/site-link";
import { buildRegionServiceFaqs } from "@/data/service-guide";
import { getRegionImageSet } from "@/lib/images";

export const TEMPLATE11_LAYOUT_VARIANTS = [
  "v1-center-chronicle",
  "v2-editorial-rail",
  "v3-alternating-spread",
  "v4-numbered-ledger",
  "v5-magazine-panels",
  "v6-compact-bands",
] as const;

export type Template11LayoutVariant = (typeof TEMPLATE11_LAYOUT_VARIANTS)[number];

type HomeSectionKey =
  | "introduction"
  | "visual-one"
  | "pricing"
  | "process"
  | "visual-two"
  | "standards"
  | "faq"
  | "directory";

export const VARIANT_SECTION_ORDERS: Readonly<
  Record<Template11LayoutVariant, readonly HomeSectionKey[]>
> = {
  "v1-center-chronicle": [
    "introduction", "visual-one", "pricing", "process", "visual-two", "standards", "faq", "directory",
  ],
  "v2-editorial-rail": [
    "introduction", "standards", "visual-one", "process", "pricing", "visual-two", "faq", "directory",
  ],
  "v3-alternating-spread": [
    "visual-one", "introduction", "process", "visual-two", "pricing", "standards", "faq", "directory",
  ],
  "v4-numbered-ledger": [
    "process", "introduction", "pricing", "standards", "visual-one", "faq", "visual-two", "directory",
  ],
  "v5-magazine-panels": [
    "introduction", "visual-one", "standards", "pricing", "visual-two", "process", "faq", "directory",
  ],
  "v6-compact-bands": [
    "standards", "introduction", "process", "pricing", "visual-one", "visual-two", "faq", "directory",
  ],
};

export function normalizeLayoutVariant(value: string): Template11LayoutVariant {
  const normalized = value.toLocaleLowerCase("en-US").replaceAll("_", "-");
  return TEMPLATE11_LAYOUT_VARIANTS.find((variant) => {
    const [, ...nameParts] = variant.split("-");
    return normalized === variant || normalized.includes(nameParts.join("-")) || normalized.startsWith(variant.slice(0, 2));
  }) ?? "v1-center-chronicle";
}

export type TemplateHomeContent = {
  h1: string;
  eyebrow: string;
  hooks: readonly [string, string];
  sections: readonly NarrativeSection[];
  childDirectory: {
    heading: string;
    intro: string;
  };
};

export function Template11Home({
  cityName,
  brandName,
  layoutVariant,
  content,
  directoryItems,
}: {
  cityName: string;
  brandName: string;
  layoutVariant: string;
  content: TemplateHomeContent;
  directoryItems: readonly DirectoryItem[];
}) {
  const variant = normalizeLayoutVariant(layoutVariant);
  const images = getRegionImageSet("/");
  const narrative = content.sections.filter((section) => !section.id.includes("directory"));
  const introSections = narrative.slice(0, Math.max(2, Math.ceil(narrative.length / 2)));
  const additionalSections = narrative.slice(introSections.length);
  const sectionNodes: Record<HomeSectionKey, ReactNode> = {
    introduction: (
      <section className="home-narrative content-frame">
        <div className="section-heading">
          <p>{content.eyebrow}</p>
          <h2>{cityName}에서 먼저 확인할 이용 정보</h2>
        </div>
        <Narrative sections={introSections} />
        {additionalSections.length ? <Narrative className="narrative--additional" sections={additionalSections} /> : null}
      </section>
    ),
    "visual-one": (
      <PhotoSection
        alt={images.bodyAAlt}
        caption={`${cityName} 안에서 세부 지역과 이용 시각을 먼저 확인합니다.`}
        sources={images.bodyA}
      />
    ),
    pricing: <PricingPreview heading={`${cityName} 코스별 시간과 가격`} />,
    process: <ProcessSection heading={`${cityName} 예약 진행 순서`} />,
    "visual-two": (
      <PhotoSection
        alt={images.bodyBAlt}
        caption="코스와 시간, 선호 압은 관리 시작 전에 다시 확인합니다."
        reverse
        sources={images.bodyB}
      />
    ),
    standards: <StandardsSection heading={`${brandName} 운영 기준`} />,
    faq: <FaqSection faqs={buildRegionServiceFaqs(cityName)} />,
    directory: (
      <RegionDirectory
        heading={content.childDirectory.heading}
        intro={content.childDirectory.intro}
        items={directoryItems}
      />
    ),
  };

  return (
    <div className="template11-home" data-layout-variant={variant}>
      <HeroCarousel
        slides={[
          {
            sources: images.hero,
            alt: images.heroAlt,
            kicker: brandName,
            text: `${cityName} 세부 지역과 희망 시각을 전화로 확인합니다.`,
          },
          {
            sources: images.hero2,
            alt: images.hero2Alt,
            kicker: `${cityName} 지역 안내`,
            text: "코스와 이용 시간을 고른 뒤 현장에서 결제합니다.",
          },
        ]}
        title={content.h1}
      />
      <section className="signal-strip signal-primary">
        <p>{cityName} 전 지역 24시간 전화상담</p>
      </section>
      <section className="signal-strip signal-secondary">
        <p>코스·시간 확인 후 100% 현장 후불</p>
        <SiteLink href="/guide/">이용 순서 확인</SiteLink>
      </section>
      <div className="variant-sections">
        {VARIANT_SECTION_ORDERS[variant].map((sectionKey) => (
          <div className={`variant-slot variant-slot--${sectionKey}`} key={sectionKey}>
            {sectionNodes[sectionKey]}
          </div>
        ))}
      </div>
      <section className="closing-visual">
        <ResponsiveClosing images={images} cityName={cityName} brandName={brandName} />
      </section>
    </div>
  );
}

function ResponsiveClosing({
  images,
  cityName,
  brandName,
}: {
  images: ReturnType<typeof getRegionImageSet>;
  cityName: string;
  brandName: string;
}) {
  // Kept separate so the closing visual remains a stable fifth Template11 slot.
  return (
    <>
      <ResponsivePicture
        alt={images.closingAlt}
        className="closing-visual__picture"
        intrinsicHeight={480}
        intrinsicWidth={1920}
        sizes="100vw"
        sources={images.closing}
      />
      <div className="closing-visual__shade" />
      <div className="closing-copy content-frame">
        <p>CONTACT</p>
        <h2>{brandName}</h2>
        <strong>{cityName} 지역과 희망 시각을 전화로 알려주세요.</strong>
        <SiteLink href="/guide/">예약 전 확인사항</SiteLink>
      </div>
    </>
  );
}
