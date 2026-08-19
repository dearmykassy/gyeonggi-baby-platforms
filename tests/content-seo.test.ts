import { describe, expect, it } from "vitest";
import { getBlogPosts } from "@/data/blog-posts";
import { getCityFactProfile } from "@/data/city-fact-profiles";
import {
  getRegionRoadFacts,
  REGION_ROAD_FACT_SOURCE,
} from "@/data/region-road-facts.generated";
import { createRegionContent } from "@/lib/content";
import {
  createRegionMetadataContract,
  getSitePublicationContract,
} from "@/lib/metadata";
import {
  getRegionChildrenForSite,
  getRegionNodesForSite,
  getRegionParentForSite,
  type BabyRegionNode,
} from "@/lib/regions";
import {
  getRegionContentModifiedAt,
  getRouteContentModifiedAt,
  SITE_CONTENT_REVISIONS,
} from "@/lib/site-revisions";
import {
  ALL_BABY_SITES,
  type BabySiteConfig,
} from "@/lib/site-config";
import { createRegionPageJsonLd } from "@/lib/region-schema";
import { createBlogPostingJsonLd } from "@/lib/blog-schema";

type ContentRecord = {
  site: BabySiteConfig;
  node: BabyRegionNode;
  content: ReturnType<typeof createRegionContent>;
};

const records: ContentRecord[] = ALL_BABY_SITES.flatMap((site) =>
  getRegionNodesForSite(site).map((node) => ({
    site,
    node,
    content: createRegionContent(node, site),
  })),
);

function expectUnique(values: readonly string[]): void {
  expect(new Set(values).size).toBe(values.length);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function hasFinalConsonant(value: string): boolean {
  const character = [...value.normalize("NFC")].at(-1);
  if (!character) return false;
  const code = character.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

describe("Gyeonggi baby regional content contract", () => {
  it("contains exactly 27 city-scoped builds and 455 regional canonicals", () => {
    expect(ALL_BABY_SITES).toHaveLength(27);
    expect(records).toHaveLength(455);
    expect(records.filter(({ node }) => node.kind === "home")).toHaveLength(27);
    expect(records.filter(({ node }) => node.kind === "district")).toHaveLength(24);
    expect(records.filter(({ node }) => node.kind === "representative")).toHaveLength(404);

    for (const site of ALL_BABY_SITES) {
      const nodes = getRegionNodesForSite(site);
      expect(nodes).toHaveLength(site.counts.regionalCanonicals);
      expect(nodes.every((node) => node.siteKey === site.key)).toBe(true);
      expect(nodes.every((node) => !node.qualifiedName.includes("경기도"))).toBe(true);
    }
  });

  it("gives every regional route exact-unique meta, H1, and document signatures", () => {
    expectUnique(records.map(({ content }) => content.title));
    expectUnique(records.map(({ content }) => content.description));
    expectUnique(records.map(({ content }) => content.h1));

    const signatures = records.map(({ content }) =>
      [
        content.title,
        content.description,
        content.h1,
        ...content.hooks,
        ...content.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
        ]),
      ].join("\u001f"),
    );
    expectUnique(signatures);
  });

  it("puts the qualified 출장마사지 keyword and service intent on every regional route", () => {
    const metaSuffixes = [
      "출장마사지",
      "출장안마",
      "출장타이마사지",
      "출장스웨디시",
      "출장홈타이",
      "토닥이",
      "남성전용마사지",
      "여성전용마사지",
    ];
    for (const { site, node, content } of records) {
      const qualifiedRegion =
        node.kind === "home"
          ? site.searchName
          : [site.searchName, ...node.segments].join(" ");
      const expectedKeyword = `${qualifiedRegion} 출장마사지`;
      const expectedMetaKeywords = metaSuffixes.map(
        (suffix) => `${qualifiedRegion}${suffix}`,
      );
      expect(content.primaryKeyword).toBe(expectedKeyword);
      expect(content.title).toBe(
        `${expectedMetaKeywords[0]} ${expectedMetaKeywords[1]} | ${site.brandName}`,
      );
      expect(content.keywords).toEqual(expectedMetaKeywords);
      expect(content.description).toContain(expectedMetaKeywords[0]);
      expect(content.description).toContain(expectedMetaKeywords[1]);
      expect(content.description).toContain(site.brandName);
      expect(content.description).toMatch(/코스별 시간·금액/u);
      expect(content.description).toMatch(/선입금 없이 현장에서 결제/u);
      expect(content.description).toMatch(/24시간 운영/u);
      expect(content.title).not.toMatch(/지역 안내/u);
      expect(content.keywords.join(" ")).not.toMatch(/지역 안내|현장후불/u);
      expect(content.h1.startsWith(expectedKeyword)).toBe(true);
      expect(
        content.sections.filter((section) =>
          section.heading.includes(expectedKeyword),
        ),
      ).toHaveLength(2);
      const serviceCopy = [
        content.description,
        ...content.hooks,
        content.faqIntro,
        ...content.sections.flatMap((section) => section.paragraphs),
      ].join(" ");
      expect(serviceCopy).toMatch(/(?:여성\s*)?마사지사/u);
      expect(serviceCopy).toMatch(/방문/u);
      expect(serviceCopy).toMatch(/코스/u);
      expect(serviceCopy).toMatch(/24시간\s*전화/u);
      expect(serviceCopy).toMatch(/현장(?:에서|\s*)\s*(?:후불|결제)/u);
    }
  });

  it("binds eight current official road-name examples to every leaf without exact addresses", () => {
    expect(REGION_ROAD_FACT_SOURCE).toMatchObject({
      agency: "행정안전부 도로명주소 업무 시스템 / 한국지역정보개발원",
      snapshotDate: "2026-07-31",
      archiveSha256:
        "da5c4007d696bf98f066b3832b53dc1f95d85b32fe1c479b7be79c42b3c6c1d9",
      roadNameDataset: "도로명(월전체)",
      roadNameSnapshot: "2026-07",
      roadNameArchiveSha256:
        "9234d8ed1c2fa8bd13e18e5a4a5f66e9b5dea409421845ec77dd01a33e3f365f",
      roadNameEntrySha256:
        "2dab7220a8602fbc5711123641c932a93e4a70578dd6c9bf1a1803943028e57c",
    });
    const leaves = records.filter(({ node }) => node.kind === "representative");
    expect(leaves).toHaveLength(404);
    for (const { site, node } of leaves) {
      const facts = getRegionRoadFacts(site.key, node.path);
      const sourceCodes = new Set(
        node.records.flatMap((record) => record.sourceCodes),
      );
      const legalNames = new Set(
        node.records.flatMap((record) =>
          record.legalAreas.map((area) => area.name),
        ),
      );
      const parent = getRegionParentForSite(site, node);
      const expectedDistrict = parent?.kind === "district"
        ? `${site.officialName} ${parent.displayName}`
        : site.officialName;
      expect(facts.length).toBeGreaterThan(0);
      for (const fact of facts) {
        expect(sourceCodes.has(fact.adminCode)).toBe(true);
        expect(fact.roadNames).toHaveLength(8);
        expect(new Set(fact.roadNames).size).toBe(8);
        expect(fact.roadDistrictName).toBe(expectedDistrict);
        expect(fact.roadLegalNames.length).toBeGreaterThan(0);
        expect(fact.roadLegalNames.every((name) => legalNames.has(name))).toBe(true);
      }
    }
  });

  it("uses the short city name in customer-facing city fields", () => {
    for (const { site, content } of records) {
      const customerFields = [
        content.title,
        content.description,
        content.h1,
        content.eyebrow,
        content.faqIntro,
        ...content.keywords,
        ...content.sections.flatMap((section) => [
          section.heading,
          ...(section.auditScope === "local-substantive"
            ? []
            : section.paragraphs),
        ]),
      ];
      if (site.officialName !== site.searchName) {
        const prohibitedOfficialLabel = new RegExp(
          `${escapeRegExp(site.officialName)}(?=$|[\\s·,|:;!?()[\\]/-]|출장|마사지|안마|지역|방문|코스)`,
          "u",
        );
        for (const value of customerFields) {
          expect(value).not.toMatch(prohibitedOfficialLabel);
        }
      }
    }
  });

  it("renders Korean particles correctly after dynamic region labels", () => {
    const obviousParticleErrors = [
      /(?:구|리)(?:을|은|이|과)(?=\s|,|\.|$)/gu,
      /(?:동|읍|면)(?:를|는|가|와)(?=\s|,|\.|$)/gu,
      /개(?:이|은|을|과)(?=\s|,|\.|$)/gu,
    ];
    for (const { site, node, content } of records) {
      const prose = [
        content.title,
        content.description,
        content.h1,
        content.eyebrow,
        ...content.hooks,
        content.faqIntro,
        ...content.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
        ]),
      ];
      for (const value of prose) {
        for (const pattern of obviousParticleErrors) {
          expect(value).not.toMatch(pattern);
        }
      }

      const profile = getCityFactProfile(site.key);
      const dynamicLabels = [
        site.searchName,
        site.officialName,
        node.displayName,
        node.qualifiedName,
        ...node.sourceAliases,
        ...node.records.flatMap((record) => [
          record.name,
          ...record.sourceNames,
          ...record.legalAreas.map((area) => area.name),
        ]),
        ...profile.addressAxes,
      ];
      for (const label of new Set(dynamicLabels.filter(Boolean))) {
        const pattern = new RegExp(
          `${escapeRegExp(label)}(은|는|이|가|을|를|과|와)(?=\\s|,|\\.|$)`,
          "gu",
        );
        const validParticles = hasFinalConsonant(label)
          ? new Set(["은", "이", "을", "과"])
          : new Set(["는", "가", "를", "와"]);
        for (const value of prose) {
          for (const match of value.matchAll(pattern)) {
            expect(
              validParticles.has(match[1] ?? ""),
              `${site.key}:${node.path}:${label}:${match[0]}:${value}`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it("never exposes empty region placeholders or invents peer links", () => {
    const emptyLinkClaim = /(?:링크(?:가|는|은|이)?\s*(?:0개|없(?:음|습니다))|(?:0개|없(?:는|음|습니다))\s*(?:형제|관련|같은 단계)?\s*링크)/u;
    const selfComparison = /(?:^|[\s,.(·])([가-힣]{1,20}(?:구|동|읍|면|리))(?:부터\s*\1까지|·\1|(?:은|는)\s*\1(?:과|와)\s*서로 다른)/u;
    const duplicateCityParent = /도시는\s*([가-힣]{1,20}),\s*(?:상위 지역|바로 위 지역)은\s*\1(?:이며|입니다)/u;
    const peerlessLeaves: ContentRecord[] = [];

    for (const record of records) {
      const { site, node, content } = record;
      const prose = [
        content.title,
        content.description,
        content.h1,
        content.eyebrow,
        ...content.hooks,
        content.faqIntro,
        content.childDirectory.heading,
        content.childDirectory.intro,
        ...content.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
        ]),
      ].join("\n");
      expect(prose).not.toContain("별도 항목 없음");
      expect(prose).not.toMatch(emptyLinkClaim);
      expect(
        prose,
        `${site.key}:${node.path}:self-comparison`,
      ).not.toMatch(selfComparison);
      expect(
        prose,
        `${site.key}:${node.path}:duplicate-city-parent`,
      ).not.toMatch(duplicateCityParent);
      const duplicateTargetHeading = new RegExp(
        `${escapeRegExp(node.displayName)}\\s+${escapeRegExp(node.displayName)}(?=\\s|·|에서|으로|부터|까지|은|는|이|가|을|를|과|와|의|로|도|만|$)`,
        "u",
      );
      for (const section of content.sections) {
        expect(
          section.heading,
          `${site.key}:${node.path}:duplicate-target-heading`,
        ).not.toMatch(duplicateTargetHeading);
      }

      if (node.kind !== "representative") continue;
      const parent = getRegionParentForSite(site, node);
      const peers = parent
        ? getRegionChildrenForSite(site, parent).filter(
            (candidate) => candidate.path !== node.path,
          )
        : [];
      if (peers.length === 0) peerlessLeaves.push(record);
    }

    expect(peerlessLeaves.length).toBeGreaterThan(0);
    for (const { site, node, content } of peerlessLeaves) {
      const parent = getRegionParentForSite(site, node);
      expect(parent).not.toBeNull();
      expect(
        getRegionNodesForSite(site).some(
          (candidate) => candidate.path === parent?.path,
        ),
      ).toBe(true);
      const prose = [
        content.description,
        ...content.hooks,
        content.faqIntro,
        ...content.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
        ]),
      ].join("\n");
      expect(prose).not.toMatch(/링크|같은 단계|인접 지역|관련 지역/u);
      expect(prose).toContain(site.searchName);
      expect(prose).toContain(parent?.displayName ?? site.searchName);
      expect(prose).toMatch(/도로명/u);
      expect(prose).toMatch(/건물명/u);
    }
  });

  it("marks all 455 regional routes eligible without a redirect target", () => {
    for (const { node, content } of records) {
      expect(content.indexEligible).toBe(true);
      expect(content.indexEligibilityTargetPath).toBeNull();
      expect(content.indexEligibilityReason).toBe(
        node.kind === "home"
          ? "city-home"
          : node.kind === "district"
            ? "regional-district"
            : "regional-leaf",
      );
    }
  });

  it("emits index,follow and self-canonicals for every regional route once a site is public", () => {
    for (const site of ALL_BABY_SITES) {
      const publicOrigin = `https://${site.slug}.regional-release.example`;
      const publicSite: BabySiteConfig = {
        ...site,
        deploymentState: "public",
        isPublic: true,
        indexingEnabled: true,
        publicOrigin,
        origin: publicOrigin,
      };
      for (const node of getRegionNodesForSite(site)) {
        const metadata = createRegionMetadataContract(node, publicSite);
        expect(metadata.robots).toEqual({ index: true, follow: true });
        expect(metadata.canonical).toBe(new URL(node.path, publicOrigin).href);
      }
    }
  });

  it("keeps 10–12 sections and makes the region directory the final section", () => {
    for (const { node, content } of records) {
      const directory = content.sections.at(-1);
      expect(content.sections.length).toBeGreaterThanOrEqual(10);
      expect(content.sections.length).toBeLessThanOrEqual(12);
      expect(directory?.id).toMatch(/directory$/u);
      expect(content.childDirectory.id).toBe(directory?.id);
      expect(content.childDirectory.heading).toBe(directory?.heading);
      expect(content.childDirectory.intro).toBe(directory?.paragraphs[0]);
      expect(content.childDirectory.auditScope).toBe("directory");
      expect(content.childDirectory.factRefs).toEqual(
        directory?.factRefs,
      );
      expect((directory?.paragraphs[0]?.match(/·/gu) ?? []).length).toBeLessThanOrEqual(5);
      expect(content.detailMode).toBe(
        node.kind === "home" ? "root" : node.kind === "district" ? "district" : "leaf",
      );
    }
  });

  it("uses all six layout semantics without artificial editorial wrappers", () => {
    expect(new Set(records.map(({ content }) => content.layoutSemantic)).size).toBe(6);
  });

  it("does not introduce unsupported popularity, branch, review or arrival claims", () => {
    const forbidden = [
      /인기\s*(?:순위|지역|장소)/u,
      /이용이\s*많은/u,
      /도착\s*(?:예정|보장|\d+\s*분)/u,
      /\d+\s*분\s*(?:이내|안에)\s*도착/u,
      /(?:오프라인\s*)?(?:매장|지점)\s*(?:운영|위치|안내)/u,
      /후기\s*\d+/u,
      /평점\s*\d/u,
      /(?:검색|노출)\s*1위/u,
      /효과를\s*보장/u,
    ];
    const allProse = records.flatMap(({ content }) => [
      content.description,
      ...content.hooks,
      content.faqIntro,
      ...content.sections.flatMap((section) => [
        section.heading,
        ...section.paragraphs,
      ]),
    ]);
    for (const value of allProse) {
      for (const pattern of forbidden) expect(value).not.toMatch(pattern);
    }
  });

  it("keeps preview builds noindex with .invalid canonicals until publication", () => {
    for (const site of ALL_BABY_SITES) {
      const publication = getSitePublicationContract(site);
      const home = getRegionNodesForSite(site)[0];
      expect(home).toBeDefined();
      const metadata = createRegionMetadataContract(home!, site);
      if (!publication.indexable) {
        expect(publication.origin.endsWith(".invalid")).toBe(true);
        expect(metadata.canonical.endsWith(".invalid/")).toBe(true);
        expect(metadata.robots).toEqual({
          index: false,
          follow: false,
          nocache: true,
        });
      } else {
        expect(publication.origin).toBe(site.publicOrigin);
        expect(metadata.robots).toEqual({ index: true, follow: true });
      }
    }
  });

  it("emits WebPage/BreadcrumbList and BlogPosting schemas on the same origin", () => {
    for (const site of ALL_BABY_SITES) {
      const origin = getSitePublicationContract(site).origin;
      const nodes = getRegionNodesForSite(site);
      for (const node of [nodes[0], nodes.at(-1)]) {
        expect(node).toBeDefined();
        const schema = createRegionPageJsonLd(node!, site);
        expect(schema["@graph"][0]["@type"]).toBe("WebPage");
        expect(schema["@graph"][1]["@type"]).toBe("BreadcrumbList");
        expect(new URL(schema["@graph"][0].url).origin).toBe(origin);
        expect(schema["@graph"][1].itemListElement[0]?.name).toBe(site.searchName);
      }
      for (const post of getBlogPosts(site)) {
        const schema = createBlogPostingJsonLd(post);
        expect(schema["@type"]).toBe("BlogPosting");
        expect(new URL(schema.url).origin).toBe(origin);
        expect(schema.dateModified).toBe(post.modifiedAt);
      }
    }
  });

  it("uses stable, non-future route-group lastmod revisions", () => {
    expect(SITE_CONTENT_REVISIONS).toMatchObject({
      home: "2026-08-20T02:48:04+09:00",
      district: "2026-08-20T02:48:04+09:00",
      representative: "2026-08-20T02:48:04+09:00",
    });
    const first = JSON.stringify(SITE_CONTENT_REVISIONS);
    const second = JSON.stringify(SITE_CONTENT_REVISIONS);
    expect(second).toBe(first);
    const ceiling = Date.now();
    for (const value of Object.values(SITE_CONTENT_REVISIONS)) {
      expect(Number.isNaN(Date.parse(value))).toBe(false);
      expect(Date.parse(value)).toBeLessThanOrEqual(ceiling);
    }
    for (const { node } of records) {
      expect(getRegionContentModifiedAt(node)).toBe(
        getRouteContentModifiedAt(node.path, node),
      );
    }
  });
});

describe("city-specific editorial posts", () => {
  it("provides two real dated full-body posts per site with exact-unique documents", () => {
    const posts = ALL_BABY_SITES.flatMap((site) => getBlogPosts(site));
    expect(posts).toHaveLength(54);
    for (const site of ALL_BABY_SITES) {
      const sitePosts = getBlogPosts(site);
      expect(sitePosts).toHaveLength(2);
      for (const post of sitePosts) {
        expect(post.sections).toHaveLength(4);
        expect(post.sections.every((section) => section.paragraphs.length === 2)).toBe(true);
        expect(Date.parse(post.publishedAt)).toBeLessThanOrEqual(Date.parse(post.modifiedAt));
        expect(Date.parse(post.modifiedAt)).toBeLessThanOrEqual(
          Date.parse("2026-08-19T23:59:59+09:00"),
        );
      }
    }
    expectUnique(posts.map((post) => post.title));
    expectUnique(posts.map((post) => post.description));
    expectUnique(
      posts.map((post) =>
        [
          post.intro,
          ...post.sections.flatMap((section) => [
            section.heading,
            ...section.paragraphs,
          ]),
          ...post.checklist,
        ].join("\u001f"),
      ),
    );
  });
});
