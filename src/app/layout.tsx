import type { CSSProperties, ReactNode } from "react";
import type { Metadata, Viewport } from "next";

import "./globals.css";

import { SiteChrome } from "@/components/site-chrome";
import { normalizeLayoutVariant } from "@/components/template11-home";
import { toSearchItems } from "@/components/view-model";
import { DEFAULT_BUSINESS_CONTACT_PHONE } from "@/data/business-settings";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { ACTIVE_REGION_NODES } from "@/lib/regions";
import { ACTIVE_SITE } from "@/lib/site-config";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: ACTIVE_SITE.theme.primary,
};

export function generateMetadata(): Metadata {
  return toNextMetadata(
    createRouteMetadataContract(
      "/",
      `${ACTIVE_SITE.searchName} 출장마사지 | ${ACTIVE_SITE.brandName}`,
      `${ACTIVE_SITE.searchName} 안의 실제 하위 지역, 코스별 가격, 이용 순서와 현장 후불 운영 기준을 확인합니다.`,
      [
        `${ACTIVE_SITE.searchName}출장마사지`,
        `${ACTIVE_SITE.searchName}출장안마`,
        `${ACTIVE_SITE.searchName}마사지`,
      ],
      ACTIVE_SITE,
      true,
    ),
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const themeStyle = {
    "--primary": ACTIVE_SITE.theme.primary,
    "--secondary": ACTIVE_SITE.theme.secondary,
    "--accent": ACTIVE_SITE.theme.accent,
    "--ink": ACTIVE_SITE.theme.ink,
    "--surface": ACTIVE_SITE.theme.surface,
    "--paper": ACTIVE_SITE.theme.paper,
  } as CSSProperties;
  const profile = ACTIVE_SITE.designProfile;

  return (
    <html
      data-baby-site={ACTIVE_SITE.key}
      data-card-border={profile.cardBorder}
      data-card-geometry={profile.cardGeometry}
      data-card-shadow={profile.cardShadow}
      data-cta-placement={profile.ctaPlacement}
      data-cta-shape={profile.ctaShape}
      data-design-profile={profile.id}
      data-header-treatment={profile.headerTreatment}
      data-hero-aspect={profile.heroAspect}
      data-hero-composition={profile.heroComposition}
      data-hero-crop={profile.heroCrop}
      data-layout-variant={normalizeLayoutVariant(ACTIVE_SITE.layoutVariant)}
      data-nav-treatment={profile.navTreatment}
      data-section-rhythm={profile.sectionRhythm}
      data-typography-scale={profile.typographyScale}
      lang="ko"
      style={themeStyle}
    >
      <body>
        <SiteChrome
          brandName={ACTIVE_SITE.brandName}
          cityName={ACTIVE_SITE.searchName}
          phoneDisplay={DEFAULT_BUSINESS_CONTACT_PHONE.display}
          phoneHref={DEFAULT_BUSINESS_CONTACT_PHONE.telHref}
          searchItems={toSearchItems(ACTIVE_REGION_NODES)}
          siteKey={ACTIVE_SITE.key}
        >
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
