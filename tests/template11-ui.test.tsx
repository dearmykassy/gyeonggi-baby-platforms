import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HeroCarousel } from "@/components/hero-carousel";
import {
  TEMPLATE11_LAYOUT_VARIANTS,
  Template11Home,
  VARIANT_SECTION_ORDERS,
  normalizeLayoutVariant,
} from "@/components/template11-home";
import { getSiteConfig } from "@/lib/site-config";

const root = process.cwd();

describe("Template11 composition contract", () => {
  it("defines six genuinely different section orders with directory last", () => {
    expect(TEMPLATE11_LAYOUT_VARIANTS).toHaveLength(6);
    const signatures = TEMPLATE11_LAYOUT_VARIANTS.map((variant) =>
      VARIANT_SECTION_ORDERS[variant].join("|"),
    );
    expect(new Set(signatures).size).toBe(6);
    for (const variant of TEMPLATE11_LAYOUT_VARIANTS) {
      expect(VARIANT_SECTION_ORDERS[variant].at(-1)).toBe("directory");
      expect(new Set(VARIANT_SECTION_ORDERS[variant]).size).toBe(8);
    }
    expect(normalizeLayoutVariant("v4")).toBe("v4-numbered-ledger");
    expect(normalizeLayoutVariant("magazine-panels")).toBe("v5-magazine-panels");
  });

  it("keeps exactly one H1 in the carousel component model", () => {
    const source = (name: string) => ({
      desktop: `/images/test/${name}/desktop.webp`,
      tablet: `/images/test/${name}/tablet.webp`,
      mobile: `/images/test/${name}/mobile.webp`,
    });
    const html = renderToStaticMarkup(
      <HeroCarousel
        slides={[
          { sources: source("one"), alt: "첫 이미지", kicker: "첫 안내", text: "첫 설명" },
          { sources: source("two"), alt: "둘째 이미지", kicker: "둘째 안내", text: "둘째 설명" },
        ]}
        title="수원 출장마사지"
      />,
    );
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(html).toContain("자동 전환 일시정지");
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('loading="lazy"');

    const homeHtml = renderToStaticMarkup(
      <Template11Home
        brandName="수원휴온"
        cityName="수원"
        content={{
          h1: "수원 출장마사지 안내",
          eyebrow: "수원휴온 · 확인",
          hooks: ["지역과 희망 시각을 확인합니다.", "코스와 이용 시간을 확인합니다."],
          faqIntro: "공통 질문은 이용 방법 페이지에서 확인합니다.",
          sections: [
            { id: "overview", heading: "수원 이용 개요", paragraphs: ["첫 문단", "둘째 문단"] },
            { id: "child-directory", heading: "수원 지역", paragraphs: ["지역을 고릅니다.", "상세 주소를 준비합니다."] },
          ],
          childDirectory: { heading: "수원 지역", intro: "받을 지역을 고르세요." },
          officialSources: [],
        }}
        designProfile={getSiteConfig("suwon").designProfile}
        directoryItems={[{ href: "/areas/권선구/", label: "권선구" }]}
        layoutVariant="v1"
      />,
    );
    expect(homeHtml.match(/<h1(?:\s|>)/g)).toHaveLength(1);
  });

  it("preserves Template11 measured frame while using flexible content heights", () => {
    const css = readFileSync(resolve(root, "src/app/globals.css"), "utf8");
    expect(css).toContain("--frame: 1280px");
    expect(css).toContain("--content: 1240px");
    expect(css).toContain("--header-height: 80px");
    expect(css).toContain("--dock-height: 79px");
    expect(css).toContain("aspect-ratio: 1920 / 970");
    expect(css).toContain("aspect-ratio: 3 / 2");
    expect(css).toContain("--dock-height: 65px");
    expect(css).not.toMatch(/overflow\s*:\s*clip/);
    for (const variant of TEMPLATE11_LAYOUT_VARIANTS) {
      expect(css).toContain(`[data-layout-variant="${variant}"]`);
    }
  });
});
