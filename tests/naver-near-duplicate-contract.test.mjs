import { describe, expect, it } from "vitest";

import {
  ARTIFICIAL_EDITORIAL_FILLER_PATTERNS,
  CUSTOMER_FACING_TECHNICAL_FILLER_PATTERNS,
  NAVER_NEAR_DUPLICATE_THRESHOLDS,
  canonicalRegionalUniqueParagraphEntries,
  cityHomeProvenanceFailures,
  contentAuditScopeFailures,
  createRegionalNormalizer,
  evaluateCrossPlatformCopyAuditBoundary,
  evaluateFactDerivedSelectionSource,
  evaluateFixedPageDuplication,
  evaluateStagedIndexingSource,
  evaluateStagedRouteContract,
  eligibilitySelectionContractFailures,
  factProfileSelectionFailures,
  indexEligibilityContractFailures,
  jaccardSimilarity,
  leafCommonBlockSignatures,
  normalizeRegionalRecordText,
  primaryNarrativeBlocks,
  primaryNarrativeRepeatedCharacterShares,
  primaryContentText,
  regionalUniqueContentText,
  regionalUniqueNarrativeBlocks,
  renderedHeadingQualityFailures,
  roadFactProvenanceContractFailures,
  withinSiteSameKindSimilarities,
  wordTrigrams,
} from "../scripts/lib/naver-near-duplicate-contract.mjs";
import {
  expectedSharedServiceSections,
} from "../scripts/lib/shared-service-copy-contract.mjs";

describe("NAVER near-duplicate contract primitives", () => {
  it("keeps the permanent strict cross-site and within-site limits", () => {
    expect(NAVER_NEAR_DUPLICATE_THRESHOLDS.primaryContent).toMatchObject({
      crossSite: { percentileMaximum: 0.45, pairMaximum: 0.55 },
      withinSite: { percentileMaximum: 0.45, pairMaximum: 0.55 },
    });
  });

  it("normalizes brand, region, and numeric substitutions deterministically", () => {
    const normalize = createRegionalNormalizer({
      brands: ["수원휴온"],
      labels: ["수원", "팔달구", "인계동"],
    });
    expect(normalize("수원휴온 수원 팔달구 인계동 120분 110,000원")).toBe(
      "{브랜드} {지역} {지역} {지역} {수}분 {수}원",
    );
    expect(normalize("다섯 개 경로와 한 자릿수 목록, 열두 단계")).toBe(
      "{수} 개 경로와 {수} 자릿수 목록, {수} 단계",
    );
  });

  it("neutralizes only the current route identity and preserves contextual place facts", () => {
    const normalize = createRegionalNormalizer({
      brands: ["수원휴온"],
      labels: [],
    });
    const record = {
      normalizationLabels: ["수원", "인계동"],
    };
    expect(
      normalizeRegionalRecordText(
        record,
        "수원휴온 인계동은 팔달문과 수원천을 주소 기준으로 함께 확인합니다.",
        normalize,
      ),
    ).toBe(
      "{브랜드} {지역}은 팔달문과 수원천을 주소 기준으로 함께 확인합니다.",
    );
  });

  it("uses word-trigram Jaccard rather than raw substring overlap", () => {
    const left = wordTrigrams("상위 지역과 현재 지역의 경로를 확인합니다");
    const same = wordTrigrams("상위 지역과 현재 지역의 경로를 확인합니다");
    const different = wordTrigrams("전화 전에 코스와 시간을 준비합니다");
    expect(jaccardSimilarity(left, same)).toBe(1);
    expect(jaccardSimilarity(left, different)).toBe(0);
  });

  it("measures within-site same-kind pairs independently", () => {
    const content = (value) => ({
      title: value,
      description: value,
      h1: value,
      eyebrow: value,
      hooks: [value, value],
      faqIntro: value,
      sections: [],
    });
    const records = [
      { siteKey: "one", path: "/a/", kind: "representative", content: content("하나 둘 셋 넷") },
      { siteKey: "one", path: "/b/", kind: "representative", content: content("하나 둘 셋 다섯") },
      { siteKey: "two", path: "/c/", kind: "representative", content: content("하나 둘 셋 여섯") },
    ];
    const pairs = withinSiteSameKindSimilarities(records, (value) => value);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({
      left: "one:/a/",
      right: "one:/b/",
      kind: "representative",
    });
  });

  it("measures repeated primary blocks by character share", () => {
    const shared = "반복되는 공통 설명 블록입니다";
    const content = (unique) => ({
      title: unique,
      description: unique,
      h1: unique,
      eyebrow: unique,
      hooks: [shared, unique],
      faqIntro: unique,
      sections: [
        {
          id: "local-facts",
          heading: unique,
          paragraphs: [shared, unique],
          auditScope: "local-substantive",
          factRefs: [`fact:${unique}`],
        },
      ],
    });
    const shares = primaryNarrativeRepeatedCharacterShares(
      [
        { siteKey: "one", path: "/", kind: "home", content: content("하나") },
        { siteKey: "two", path: "/", kind: "home", content: content("둘") },
      ],
      (value) => value,
    );
    expect(shares).toHaveLength(2);
    expect(shares.every((record) => record.exact > 0)).toBe(true);
  });

  it("never uses hidden content fields to lower rendered-page similarity", () => {
    const record = {
      content: {
        title: "숨은 메타 제목",
        description: "숨은 설명",
        h1: "화면 제목",
        eyebrow: "화면 표식",
        hooks: ["렌더되지 않는 훅 하나", "렌더되지 않는 훅 둘"],
        faqIntro: "렌더되지 않는 질문 소개",
        sections: [],
      },
      renderedPrimaryBlocks: ["화면 제목", "화면에 실제 보이는 지역 사실"],
    };
    expect(primaryContentText(record)).toContain("화면에 실제 보이는 지역 사실");
    expect(primaryContentText(record)).not.toContain("렌더되지 않는 훅");
    expect(primaryContentText(record)).not.toContain("숨은 메타 제목");
  });

  it("excludes the separately hard-gated directory block from primary copy", () => {
    const blocks = primaryNarrativeBlocks({
      title: "제목",
      description: "설명",
      h1: "화면 제목",
      eyebrow: "표식",
      sections: [
        {
          id: "regional-facts",
          heading: "지역 사실",
          paragraphs: ["지역 본문"],
          auditScope: "local-substantive",
          factRefs: ["fixture:regional-facts"],
        },
        {
          id: "regional-directory",
          heading: "주변 지역",
          paragraphs: ["반복될 수 있는 링크 안내"],
          auditScope: "directory",
          factRefs: [],
        },
      ],
    });
    expect(blocks).toContain("지역 사실");
    expect(blocks).toContain("지역 본문");
    expect(blocks).not.toContain("주변 지역");
    expect(blocks).not.toContain("반복될 수 있는 링크 안내");
  });

  it("canonicalizes local sections and paragraphs before trigram measurement", () => {
    const localSection = (id, paragraphs) => ({
      id,
      heading: id,
      paragraphs,
      auditScope: "local-substantive",
      factRefs: [`fixture:${id}`],
    });
    const first = {
      sections: [
        localSection("z-local", ["여섯 일곱 여덟", "하나 둘 셋"]),
        localSection("a-local", ["열 하나 열둘", "넷 다섯 여섯"]),
      ],
    };
    const reordered = {
      sections: [
        localSection("a-local", ["넷 다섯 여섯", "열 하나 열둘"]),
        localSection("z-local", ["하나 둘 셋", "여섯 일곱 여덟"]),
      ],
    };
    expect(regionalUniqueNarrativeBlocks(first)).toEqual(
      regionalUniqueNarrativeBlocks(reordered),
    );
    expect(canonicalRegionalUniqueParagraphEntries(first.sections)).toEqual(
      canonicalRegionalUniqueParagraphEntries(reordered.sections),
    );
    expect(wordTrigrams(regionalUniqueContentText(first))).toEqual(
      wordTrigrams(regionalUniqueContentText(reordered)),
    );
    expect(
      withinSiteSameKindSimilarities(
        [
          {
            siteKey: "fixture",
            path: "/first/",
            kind: "representative",
            content: first,
          },
          {
            siteKey: "fixture",
            path: "/reordered/",
            kind: "representative",
            content: reordered,
          },
        ],
        (value) => value,
      )[0].similarity,
    ).toBe(1);
  });

  it("fails closed when local facts are relabeled or escape into fixed shared copy", () => {
    const primaryKeyword = "테스트 출장마사지";
    const shared = expectedSharedServiceSections(primaryKeyword).map(
      (section) => ({
        ...section,
        auditScope: "shared-service",
        factRefs: [],
      }),
    );
    const local = ["a-local", "b-local", "c-local"].map((id, index) => ({
      id,
      heading: `${id} 지역 사실`,
      paragraphs: [
        `${id} 검증된 지역 사실과 도로명 관계를 설명하는 문단입니다. `.repeat(5),
      ],
      auditScope: "local-substantive",
      factRefs: [`fact:${index}`],
    }));
    const sections = [
      ...shared,
      ...local,
      {
        id: "child-directory",
        heading: "하위 지역",
        paragraphs: ["하위 지역 링크를 고릅니다."],
        auditScope: "directory",
        factRefs: [],
      },
    ];
    const renderedEntries = canonicalRegionalUniqueParagraphEntries(sections);
    const validRecord = {
      siteKey: "fixture",
      path: "/",
      kind: "home",
      content: { primaryKeyword, sections },
      renderedRegionalUniqueParagraphs: renderedEntries,
      renderedRegionalUniqueBlocks: renderedEntries.map(
        (entry) => entry.paragraph,
      ),
      renderedAuthoredScopePass: true,
      renderedAuthoredScopeFailures: [],
      regionalUniqueBlocksVerified: true,
      localFactEscapedSharedScope: false,
    };
    expect(contentAuditScopeFailures([validRecord])).toEqual([]);

    for (const escapedScope of ["shared-service", "directory"]) {
      const escaped = structuredClone(validRecord);
      escaped.content.sections.find((section) => section.id === "a-local")
        .auditScope = escapedScope;
      const failure = contentAuditScopeFailures([escaped])[0];
      expect(failure.reasons).toContain("SECTION_SEMANTIC_SCOPE_MISMATCH");
      expect(failure.reasons).toContain("RENDERED_LOCAL_SCOPE_CORPUS_MISMATCH");
    }

    const copiedIntoShared = structuredClone(validRecord);
    copiedIntoShared.content.sections.find(
      (section) => section.id === "service-overview",
    ).paragraphs = [local[0].paragraphs[0]];
    expect(
      contentAuditScopeFailures([copiedIntoShared])[0].reasons,
    ).toContain("SHARED_SERVICE_COPY_CONTRACT");

    const copiedIntoDirectory = structuredClone(validRecord);
    copiedIntoDirectory.content.sections.find(
      (section) => section.id === "child-directory",
    ).paragraphs = [local[0].paragraphs[0]];
    expect(
      contentAuditScopeFailures([copiedIntoDirectory])[0].reasons,
    ).toContain("LOCAL_PARAGRAPH_ESCAPED_NONLOCAL_SCOPE");

    const missingDomScope = structuredClone(validRecord);
    delete missingDomScope.renderedRegionalUniqueParagraphs;
    missingDomScope.renderedAuthoredScopePass = false;
    missingDomScope.renderedAuthoredScopeFailures = ["MISSING_RENDERED_SECTION"];
    expect(contentAuditScopeFailures([missingDomScope])[0].reasons).toEqual(
      expect.arrayContaining([
        "RENDERED_AUTHORED_SCOPE_CONTRACT",
        "RENDERED_LOCAL_SCOPE_CORPUS_MISSING",
      ]),
    );
  });

  it("hard-gates the pinned road digest and rendered local road-ref contract", () => {
    const valid = {
      siteKey: "hanam",
      path: "/areas/%EC%B4%88%EC%9D%B4%EB%8F%99/",
      kind: "representative",
      roadFactProvenance: {
        sourceAgency: "행정안전부 도로명주소 업무 시스템 / 한국지역정보개발원",
        snapshotDate: "2026-07-31",
        archiveSha256:
          "da5c4007d696bf98f066b3832b53dc1f95d85b32fe1c479b7be79c42b3c6c1d9",
        roadNameSnapshot: "2026-07",
        roadNameArchiveSha256:
          "9234d8ed1c2fa8bd13e18e5a4a5f66e9b5dea409421845ec77dd01a33e3f365f",
        roadNameEntrySha256:
          "2dab7220a8602fbc5711123641c932a93e4a70578dd6c9bf1a1803943028e57c",
        dataDigest:
          "sha256:acf74bc883028b4570deef4a8d87248ba17ec35150e506e3836937d180402438",
        factCount: 1,
        sourceCodeJoinPass: true,
        safeSelectionPass: true,
        roadNameAreaJoinPass: true,
        serviceContextSectionsPass: true,
        preciseAddressExposurePass: true,
      },
    };
    expect(roadFactProvenanceContractFailures([valid])).toEqual([]);
    const escaped = structuredClone(valid);
    escaped.roadFactProvenance.dataDigest = "sha256:untrusted";
    escaped.roadFactProvenance.serviceContextSectionsPass = false;
    escaped.roadFactProvenance.preciseAddressExposurePass = false;
    expect(roadFactProvenanceContractFailures([escaped])[0].reasons).toEqual(
      expect.arrayContaining([
        "ROAD_FACT_SOURCE_PROVENANCE",
        "ROAD_FACT_LOCAL_REF_RENDER_CONTRACT",
        "ROAD_FACT_PRECISE_ADDRESS_EXPOSURE",
      ]),
    );
  });

  it("rejects route identity, hash, and randomness as SEO copy selectors", () => {
    const safe = evaluateFactDerivedSelectionSource(`
      const sections = candidates.sort((left, right) =>
        right.factPriority - left.factPriority || left.id.localeCompare(right.id)
      );
      const layout = siteIndex(site) % layouts.length;
    `);
    expect(safe.status).toBe("PASS");

    const unsafe = evaluateFactDerivedSelectionSource(`
      function globalRouteIndex(site, node) { return site.key + node.path; }
      const score = stableScore(site.key + node.path);
      const routeIdentity = globalRouteIndex(site, node);
      const title = titles[node.routeOrdinal % titles.length];
    `);
    expect(unsafe.status).toBe("FAIL");
    expect(unsafe.violations.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "GLOBAL_ROUTE_IDENTITY_COPY_VARIATION",
        "ROUTE_IDENTITY_COPY_VARIATION",
        "ROUTE_ORDINAL_COPY_VARIATION",
        "HASH_SCORE_COPY_VARIATION",
      ]),
    );
  });

  it("does not allow equal graph-fact profiles to receive arbitrary SEO patterns", () => {
    const content = (title, sectionId) => ({
      title,
      description: `${title} 설명`,
      h1: title,
      sections: [{ id: sectionId, heading: title, paragraphs: [title] }],
    });
    const records = [
      {
        siteKey: "one",
        path: "/areas/a/",
        kind: "representative",
        indexEligible: true,
        factProfile: '{"kind":"representative","sourceUnitCount":1}',
        content: content("지역 하나 범위 안내", "source-units"),
      },
      {
        siteKey: "two",
        path: "/areas/b/",
        kind: "representative",
        indexEligible: true,
        factProfile: '{"kind":"representative","sourceUnitCount":1}',
        content: content("지역 둘 경로 확인", "route-type"),
      },
    ];
    expect(factProfileSelectionFailures(records, (value) => value)).toHaveLength(1);
    expect(
      factProfileSelectionFailures(
        [{ ...records[0], indexEligible: false }, records[1]],
        (value) => value,
      ),
    ).toEqual([]);
  });

  it("detects full shared price, process, FAQ, and standards blocks", () => {
    const html = [
      '<section class="pricing-preview">',
      ...Array.from({ length: 5 }, () => '<article class="pricing-card"></article>'),
      ...Array.from({ length: 14 }, () => "<dt>시간</dt>"),
      "</section>",
      '<section class="process-section"><ol>',
      ...Array.from({ length: 5 }, () => "<li>단계</li>"),
      "</ol></section>",
      '<section class="faq-section">',
      ...Array.from({ length: 7 }, () => "<details>질문</details>"),
      "</section>",
      '<section class="standards-section">',
      ...Array.from({ length: 6 }, () => "<article>기준</article>"),
      "</section>",
    ].join("");
    expect(leafCommonBlockSignatures(html)).toMatchObject({
      fullPricing: true,
      fullPricingTable: true,
      fullProcess: true,
      fullFaq: true,
      fullStandards: true,
    });
  });

  it("keeps fixed-route clones diagnostic while staged indexing is enforced separately", () => {
    const fixedRecords = Array.from({ length: 27 }, (_, siteIndex) =>
      ["/pricing/", "/guide/", "/notice/"].map((path) => ({
        siteKey: `site-${siteIndex}`,
        path,
        metaTitle: `${siteIndex}-${path}`,
        description: `${siteIndex}-${path}-description`,
        h1: `${siteIndex}-${path}-heading`,
        html: `<article><h1>${siteIndex}-${path}</h1></article>`,
        surroundingBlocks: [`${siteIndex}-${path}-surrounding`],
      })),
    ).flat();
    expect(evaluateFixedPageDuplication(fixedRecords, (value) => value).status).toBe(
      "PASS",
    );
    fixedRecords[1] = {
      ...fixedRecords[1],
      html: fixedRecords[4].html,
      metaTitle: fixedRecords[4].metaTitle,
      description: fixedRecords[4].description,
      h1: fixedRecords[4].h1,
      surroundingBlocks: fixedRecords[4].surroundingBlocks,
    };
    const report = evaluateFixedPageDuplication(fixedRecords, (value) => value);
    expect(report.status).toBe("PASS");
    expect(report.exactCollisions).toMatchObject({
      byteDocumentGroups: 1,
      visibleTextGroups: 1,
      surroundingSignatureGroups: 1,
    });
  });

  it("keeps ancillary metadata staged while allowing the complete regional sitemap", () => {
    expect(
      evaluateStagedIndexingSource({
        metadataSource: "routeIndexEligible = false",
        sitemapSource:
          "getIndexEligibleRegionNodes(site); lastModified: getRegionContentModifiedAt(node)",
        ancillaryRouteSource:
          'createRouteMetadataContract("/guide/", title, description); createRouteMetadataContract(path, title, description, keywords, site, false)',
      }).status,
    ).toBe("PASS");
    const unsafe = evaluateStagedIndexingSource({
      metadataSource: "routeIndexEligible = true",
      sitemapSource:
        "const FIXED_ROUTES=[]; getBlogPosts(); blogIndex; lastModified: new Date(); priority: 1;",
      ancillaryRouteSource:
        'createRouteMetadataContract("/guide/", title, description, [], site, true)',
    });
    expect(unsafe.status).toBe("FAIL");
    expect(unsafe.violations).toEqual(
      expect.arrayContaining([
        "ROUTE_METADATA_DEFAULT_NOT_STAGED",
        "SITEMAP_MISSING_ELIGIBLE_REGIONAL_INVENTORY",
        "SITEMAP_MISSING_STABLE_LASTMOD",
        "SITEMAP_BUILD_TIME_LASTMOD",
        "SITEMAP_UNSUPPORTED_HINT_FIELD",
        "SITEMAP_INCLUDES_FIXED_ROUTES",
        "SITEMAP_INCLUDES_BLOG_POSTS",
        "SITEMAP_INCLUDES_BLOG_INDEX",
        "ANCILLARY_ROUTE_EXPLICITLY_INDEXABLE",
      ]),
    );
  });

  it("hard-gates staged ancillary route discovery behavior", () => {
    const paths = [
      "/areas/",
      "/pricing/",
      "/guide/",
      "/notice/",
      "/blog/",
      "/blog/site-address/",
      "/blog/site-course/",
    ];
    const records = Array.from({ length: 27 }, (_, siteIndex) =>
      paths.map((path) => ({
        siteKey: `site-${siteIndex}`,
        path,
        staticRenderPass: true,
        selfCanonicalPass: true,
        actualPublicationContractPass: true,
        routeRobotsIndex: false,
        routeRobotsFollow: true,
        sitemapPresent: false,
      })),
    ).flat();
    expect(evaluateStagedRouteContract(records).status).toBe("PASS");
    const unsafe = records.map((record, index) =>
      index === 0
        ? {
            ...record,
            sitemapPresent: true,
            actualPublicationContractPass: false,
          }
        : record,
    );
    expect(evaluateStagedRouteContract(unsafe).failures[0].reasons).toContain(
      "STAGED_ROUTE_IN_SITEMAP",
    );
    expect(evaluateStagedRouteContract(unsafe).failures[0].reasons).toContain(
      "ACTUAL_PUBLICATION_TUPLE_CONTRACT",
    );
  });

  it("flags artificial editorial wrappers instead of rewarding filler", () => {
    const samples = [
      "주소 장부의 첫째 칸을 확인합니다.",
      "경계선 표식을 다음 칸으로 옮깁니다.",
      "EDITORIAL CUE를 본문에 붙입니다.",
    ];
    for (const sample of samples) {
      expect(
        ARTIFICIAL_EDITORIAL_FILLER_PATTERNS.some((pattern) =>
          pattern.test(sample),
        ),
      ).toBe(true);
    }
  });

  it("rejects internal graph-audit jargon from customer-facing regional copy", () => {
    const samples = [
      "원천명 수 근접 분포와 밀도를 계산합니다.",
      "법정지역 연결 수 집중 분포를 비교합니다.",
      "원본 경로 깊이와 경로별 비중을 표시합니다.",
      "최댓값과 최솟값 차이가 네 배입니다.",
      "행정 레코드와 지역 그래프를 확인합니다.",
      "시·군 서비스 루트와 구 단위 허브를 엽니다.",
      "동 단위 대표 경로의 원천 지역명 분포를 봅니다.",
    ];
    for (const sample of samples) {
      expect(
        CUSTOMER_FACING_TECHNICAL_FILLER_PATTERNS.some((pattern) =>
          pattern.test(sample),
        ),
      ).toBe(true);
    }
  });

  it("requires every regional route to be indexable with a kind-specific reason", () => {
    const valid = {
      siteKey: "one",
      path: "/areas/leaf/",
      kind: "representative",
      indexEligible: true,
      indexEligibilityReason: "regional-leaf",
      indexEligibilityTargetPath: null,
      parentPath: "/areas/parent/",
    };
    expect(indexEligibilityContractFailures([valid])).toEqual([]);
    expect(
      indexEligibilityContractFailures([
        {
          ...valid,
          indexEligible: false,
          indexEligibilityReason: "wrong-reason",
          indexEligibilityTargetPath: "/areas/parent/",
        },
      ])[0].reasons,
    ).toEqual([
      "REGIONAL_ROUTE_EXCLUSION",
      "INVALID_INDEX_ELIGIBILITY_REASON",
      "INDEXABLE_ROUTE_HAS_FALLBACK_TARGET",
    ]);
  });

  it("requires current HTTPS provenance for every rendered indexable city-home fact profile", () => {
    const valid = {
      siteKey: "suwon",
      path: "/",
      kind: "home",
      indexEligible: true,
      cityFactProvenance: {
        checkedAt: "2026-08-19",
        sourceCount: 1,
        sourceUrls: ["https://www.suwon.go.kr/example"],
        sourceLabels: ["수원시 공식 안내"],
        factSectionCount: 4,
        renderedFactBlocksVerified: true,
      },
    };
    expect(cityHomeProvenanceFailures([valid])).toEqual([]);
    expect(
      cityHomeProvenanceFailures([
        {
          ...valid,
          cityFactProvenance: {
            ...valid.cityFactProvenance,
            checkedAt: "2026-08-18",
            sourceUrls: ["http://example.test"],
            factSectionCount: 3,
            renderedFactBlocksVerified: false,
          },
        },
      ])[0].reasons,
    ).toEqual([
      "STALE_CITY_FACT_PROVENANCE",
      "INVALID_CITY_FACT_SOURCE",
      "CITY_FACT_SECTION_COUNT",
      "CITY_FACT_NOT_RENDERED",
    ]);
  });

  it("selects an eligible leaf only from the deterministic richest fact profile", () => {
    const leaves = [
      {
        siteKey: "one",
        path: "/areas/a/",
        kind: "representative",
        localType: "동",
        routeOrdinal: 1,
        eligibilityEvidenceScore: 100,
        indexEligible: true,
        indexEligibilityReason: "richest-city-leaf",
      },
      {
        siteKey: "one",
        path: "/areas/b/",
        kind: "representative",
        localType: "읍",
        routeOrdinal: 2,
        eligibilityEvidenceScore: 200,
        indexEligible: false,
      },
    ];
    expect(eligibilitySelectionContractFailures(leaves)[0]).toMatchObject({
      path: "/areas/a/",
      expectedPath: "/areas/b/",
      reasons: ["ELIGIBLE_LEAF_NOT_FACT_RICHEST"],
    });
    expect(
      eligibilitySelectionContractFailures([
        { ...leaves[0], indexEligible: false },
        {
          ...leaves[1],
          indexEligible: true,
          indexEligibilityReason: "richest-city-leaf",
        },
      ]),
    ).toEqual([]);
  });

  it("keeps total rendered H2 count diagnostic but rejects empty, duplicate, or placeholder H2", () => {
    expect(
      renderedHeadingQualityFailures([
        {
          siteKey: "one",
          path: "/",
          renderedH2Count: 3,
          renderedH2Texts: ["지역 계층", "코스 고정 안내", "관련 지역"],
        },
      ]),
    ).toEqual([]);
    expect(
      renderedHeadingQualityFailures([
        {
          siteKey: "one",
          path: "/",
          renderedH2Count: 4,
          renderedH2Texts: ["지역 계층", "지역 계층", "안내"],
        },
      ])[0].reasons,
    ).toEqual([
      "EMPTY_RENDERED_H2",
      "DUPLICATE_RENDERED_H2",
      "PLACEHOLDER_RENDERED_H2",
    ]);
  });

  it("keeps internal normalized collisions diagnostic while hard-gating external collisions", () => {
    const comparison = () => ({
      substantiveExactCollisions: { count: 0 },
      brandRegionNormalizedCollisions: { count: 0 },
    });
    const report = {
      authoritativeRepositoryCount: 8,
      targetSiteCount: 27,
      targetRegionalRouteCount: 455,
      targetBlogPostCount: 54,
      exactMetaTitleCollisions: 0,
      exactDescriptionCollisions: 0,
      exactH1Collisions: 0,
      exactSignatureCollisions: 0,
      normalizedMetaTitleCollisions: 0,
      normalizedDescriptionCollisions: 0,
      normalizedH1Collisions: 0,
      normalizedParagraphCollisions: 312,
      normalizedSignatureCollisions: 0,
      officialSuffixLeakCount: 0,
      sharedServiceContractViolationCount: 0,
      allowlist: {
        sharedServiceAllowlistSource: "FIXED_SECTION_ID_AND_COPY_CONTRACT",
      },
      comparisons: Object.fromEntries(
        Array.from({ length: 8 }, (_, index) => [`platform-${index}`, comparison()]),
      ),
    };
    const diagnosticOnly = evaluateCrossPlatformCopyAuditBoundary(report);
    expect(diagnosticOnly.status).toBe("PASS");
    expect(diagnosticOnly.diagnostics.normalizedParagraphCollisions).toBe(312);

    const stillDiagnostic = evaluateCrossPlatformCopyAuditBoundary({
      ...report,
      normalizedSignatureCollisions: 1,
    });
    expect(stillDiagnostic.status).toBe("PASS");
    expect(
      stillDiagnostic.diagnostics.normalizedSignatureCollisions,
    ).toBe(1);

    const hardFailure = evaluateCrossPlatformCopyAuditBoundary({
      ...report,
      comparisons: {
        ...report.comparisons,
        "platform-0": {
          substantiveExactCollisions: { count: 1 },
          brandRegionNormalizedCollisions: { count: 0 },
        },
      },
    });
    expect(hardFailure.status).toBe("FAIL");
    expect(hardFailure.failures).toContain("EXTERNAL_PLATFORM_COPY_COLLISION");

    const dynamicAllowlist = evaluateCrossPlatformCopyAuditBoundary({
      ...report,
      allowlist: { sharedServiceAllowlistSource: "RUNTIME_OUTPUT" },
    });
    expect(dynamicAllowlist.failures).toContain(
      "DYNAMIC_SHARED_SERVICE_ALLOWLIST",
    );
  });
});
