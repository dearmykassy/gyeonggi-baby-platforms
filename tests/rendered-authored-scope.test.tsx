import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  Narrative,
  RegionDirectory,
  type NarrativeSection,
} from "@/components/content-blocks";
import {
  canonicalAuthoredLocalParagraphEntries,
  extractRenderedAuthoredSections,
  hasPreciseAddressExposure,
} from "../scripts/lib/rendered-authored-scope";

describe("rendered authored-scope trace", () => {
  it("extracts exact scope, section, fact refs, and indexed paragraphs from nested SSR", () => {
    const sections: readonly NarrativeSection[] = [
      {
        id: "z-local",
        heading: "두 번째 지역 사실",
        paragraphs: ["둘째 문단", "첫째 문단"],
        auditScope: "local-substantive",
        factRefs: ["road:둘", "facility:하나"],
      },
      {
        id: "service-overview",
        heading: "서비스 안내",
        paragraphs: ["공통 서비스 문단"],
        auditScope: "shared-service",
        factRefs: [],
      },
    ];
    const html = renderToStaticMarkup(
      <section className="outer-wrapper">
        <Narrative sections={sections} />
        <RegionDirectory
          auditTrace={{
            id: "child-directory",
            auditScope: "directory",
            factRefs: [],
          }}
          heading="하위 지역"
          intro="하위 지역을 고릅니다."
          items={[]}
        />
      </section>,
    );
    const parsed = extractRenderedAuthoredSections(html);

    expect(parsed.failures).toEqual([]);
    expect(parsed.sections).toEqual([
      {
        sectionId: "z-local",
        auditScope: "local-substantive",
        factRefs: ["facility:하나", "road:둘"],
        paragraphs: ["둘째 문단", "첫째 문단"],
      },
      {
        sectionId: "service-overview",
        auditScope: "shared-service",
        factRefs: [],
        paragraphs: ["공통 서비스 문단"],
      },
      {
        sectionId: "child-directory",
        auditScope: "directory",
        factRefs: [],
        paragraphs: ["하위 지역을 고릅니다."],
      },
    ]);
    expect(canonicalAuthoredLocalParagraphEntries(parsed.sections.map((section) => ({
      id: section.sectionId,
      auditScope: section.auditScope,
      paragraphs: section.paragraphs,
    })))).toEqual([
      { sectionId: "z-local", paragraph: "둘째 문단" },
      { sectionId: "z-local", paragraph: "첫째 문단" },
    ]);
  });

  it("reports malformed traces instead of falling back to global visible text", () => {
    const parsed = extractRenderedAuthoredSections(
      '<section data-authored-section-id="local" data-authored-audit-scope="shared-service" data-authored-fact-refs="not-json"><p data-authored-paragraph-index="2">지역 사실</p></section>',
    );
    expect(parsed.failures).toEqual(
      expect.arrayContaining([
        "INVALID_FACT_REFS:local",
        "NON_CONTIGUOUS_PARAGRAPH_INDEX:local",
      ]),
    );
  });

  it("blocks lot-number, postal-code, and management-number exposure in local text", () => {
    for (const paragraph of [
      "별양동 1-35 공영주차장",
      "도로 12-7 건물",
      "우편번호 12345",
      "건물관리번호를 확인합니다.",
    ]) {
      expect(hasPreciseAddressExposure([paragraph])).toBe(true);
    }
    expect(
      hasPreciseAddressExposure(["‘초이로’ 도로명과 건물명을 확인합니다."]),
    ).toBe(false);
  });
});
