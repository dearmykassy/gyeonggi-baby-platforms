import {
  getCityFactProfile,
  type CityFactSection,
  type CityOfficialSource,
} from "@/data/city-fact-profiles";
import {
  ACTIVE_SITE,
  ALL_BABY_SITES,
  type BabySiteConfig,
} from "@/lib/site-config";
import {
  getRegionChildrenForSite,
  getRegionNodesForSite,
  getRegionParentForSite,
  type BabyRegionNode,
} from "@/lib/regions";

export type ContentSection = {
  id: string;
  heading: string;
  paragraphs: [string, string];
};

export type ChildDirectoryContent = {
  heading: string;
  intro: string;
};

export type RegionContent = {
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  eyebrow: string;
  hooks: [string, string];
  sections: ContentSection[];
  faqIntro: string;
  childDirectory: ChildDirectoryContent;
  ctaLabels: [string, string, string];
  officialSources: readonly CityOfficialSource[];
  detailMode: "root" | "district" | "leaf";
  layoutSemantic:
    | "address-ledger"
    | "call-sequence"
    | "course-crosscheck"
    | "schedule-board"
    | "branch-map"
    | "settlement-checklist";
  indexEligible: boolean;
  indexEligibilityReason:
    | "city-home"
    | "regional-district"
    | "regional-leaf";
  indexEligibilityTargetPath: string | null;
};

type GraphFacts = {
  node: BabyRegionNode;
  site: BabySiteConfig;
  label: string;
  children: readonly BabyRegionNode[];
  parent: BabyRegionNode | null;
  siblings: readonly BabyRegionNode[];
  siblingIndex: number;
  previous: BabyRegionNode | null;
  next: BabyRegionNode | null;
  aliases: readonly string[];
  legalNames: readonly string[];
  cityDistricts: readonly BabyRegionNode[];
  cityLeaves: readonly BabyRegionNode[];
  directCityLeaves: readonly BabyRegionNode[];
  nestedCityLeaves: readonly BabyRegionNode[];
  mergedChildren: readonly BabyRegionNode[];
  aliasedChildren: readonly BabyRegionNode[];
  multiLegalChildren: readonly BabyRegionNode[];
};

type DraftSection = {
  id: string;
  heading: string;
  paragraphs: [string, string];
};

const LAYOUT_SEMANTICS = [
  "address-ledger",
  "call-sequence",
  "course-crosscheck",
  "schedule-board",
  "branch-map",
  "settlement-checklist",
] as const satisfies readonly RegionContent["layoutSemantic"][];

function siteIndex(site: BabySiteConfig): number {
  const index = ALL_BABY_SITES.findIndex((candidate) => candidate.key === site.key);
  if (index < 0) throw new Error(`BABY_CONTENT_UNKNOWN_SITE:${site.key}`);
  return index;
}

function siteNodes(site: BabySiteConfig): readonly BabyRegionNode[] {
  return getRegionNodesForSite(site);
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter(Boolean))];
}

function hasFinalConsonant(value: string): boolean {
  const character = [...value.normalize("NFC")].at(-1);
  if (!character) return false;
  const code = character.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

function withTopicParticle(value: string): string {
  return `${value}${hasFinalConsonant(value) ? "은" : "는"}`;
}

function withSubjectParticle(value: string): string {
  return `${value}${hasFinalConsonant(value) ? "이" : "가"}`;
}

function withObjectParticle(value: string): string {
  return `${value}${hasFinalConsonant(value) ? "을" : "를"}`;
}

function withAndParticle(value: string): string {
  return `${value}${hasFinalConsonant(value) ? "과" : "와"}`;
}

function compactNames(values: readonly string[], limit = 6): string {
  if (values.length === 0) return "별도 항목 없음";
  const visible = values.slice(0, limit).join("·");
  return values.length > limit ? `${visible} 외 ${values.length - limit}개` : visible;
}

function sourceAliases(node: BabyRegionNode): readonly string[] {
  return uniqueStrings(
    node.records.flatMap((record) => [...record.sourceNames, record.name]),
  ).filter((name) => name !== node.displayName);
}

function legalAreaNames(node: BabyRegionNode): readonly string[] {
  return uniqueStrings(
    node.records.flatMap((record) => record.legalAreas.map((area) => area.name)),
  );
}

function routeTypeLabel(node: BabyRegionNode): string {
  if (node.kind === "home") return "지역 안내";
  if (node.kind === "district") return "구 지역 안내";
  if (node.displayName.endsWith("읍")) return "읍 지역 안내";
  if (node.displayName.endsWith("면")) return "면 지역 안내";
  return "동 지역 안내";
}

function localType(node: BabyRegionNode): "동" | "읍" | "면" {
  if (node.displayName.endsWith("읍")) return "읍";
  if (node.displayName.endsWith("면")) return "면";
  return "동";
}

function nodeTypeSummary(nodes: readonly BabyRegionNode[]): string {
  const districts = nodes.filter((node) => node.kind === "district").length;
  const towns = nodes.filter((node) => node.displayName.endsWith("읍")).length;
  const townships = nodes.filter((node) => node.displayName.endsWith("면")).length;
  const neighborhoods = nodes.filter((node) => node.displayName.endsWith("동")).length;
  return [
    districts ? `구 ${districts}개` : "",
    neighborhoods ? `동 ${neighborhoods}개` : "",
    towns ? `읍 ${towns}개` : "",
    townships ? `면 ${townships}개` : "",
  ].filter(Boolean).join("·") || "추가 하위 지역 없음";
}

function childTypeProfile(nodes: readonly BabyRegionNode[]): {
  label: string;
  sentence: string;
} {
  const hasDistrict = nodes.some((node) => node.kind === "district");
  const hasDong = nodes.some((node) => node.displayName.endsWith("동"));
  const hasEup = nodes.some((node) => node.displayName.endsWith("읍"));
  const hasMyeon = nodes.some((node) => node.displayName.endsWith("면"));
  if (hasDistrict && !hasDong && !hasEup && !hasMyeon) {
    return {
      label: "구부터 선택하는 지역",
      sentence: "직계 목록은 모두 구 페이지이며, 읍·면·동은 각 구를 먼저 선택한 뒤 확인합니다.",
    };
  }
  if (hasDong && !hasEup && !hasMyeon) {
    return {
      label: "동 지역만 있는 목록",
      sentence: "직계 목록은 동 지역 페이지만으로 구성됩니다.",
    };
  }
  if (!hasDong && hasEup && hasMyeon) {
    return {
      label: "읍·면을 함께 찾는 목록",
      sentence: "직계 목록은 읍과 면 지역 페이지를 함께 포함합니다.",
    };
  }
  if (hasDong && hasEup && hasMyeon) {
    return {
      label: "동·읍·면을 함께 찾는 목록",
      sentence: "직계 목록에서 동·읍·면 지역 페이지를 모두 확인할 수 있습니다.",
    };
  }
  if (hasDong && hasMyeon && !hasEup) {
    return {
      label: "동·면을 함께 찾는 목록",
      sentence: "직계 목록은 동과 면 지역 페이지로 나뉩니다.",
    };
  }
  if (hasDong && hasEup && !hasMyeon) {
    return {
      label: "동·읍을 함께 찾는 목록",
      sentence: "직계 목록은 동과 읍 지역 페이지로 나뉩니다.",
    };
  }
  if (hasEup && !hasDong && !hasMyeon) {
    return {
      label: "읍 지역만 있는 목록",
      sentence: "직계 목록은 읍 지역 페이지만으로 구성됩니다.",
    };
  }
  if (hasMyeon && !hasDong && !hasEup) {
    return {
      label: "면 지역만 있는 목록",
      sentence: "직계 목록은 면 지역 페이지만으로 구성됩니다.",
    };
  }
  return {
    label: "추가 지역 없음",
    sentence: "현재 단계에서 더 내려가는 행정 지역은 없습니다.",
  };
}

function qualifiedName(node: BabyRegionNode, site: BabySiteConfig): string {
  return node.kind === "home"
    ? site.searchName
    : [site.searchName, ...node.segments].join(" ");
}

function legalCount(node: BabyRegionNode): number {
  return legalAreaNames(node).length;
}

function buildFacts(node: BabyRegionNode, site: BabySiteConfig): GraphFacts {
  const cityNodes = siteNodes(site);
  const children = getRegionChildrenForSite(site, node);
  const parent = getRegionParentForSite(site, node);
  const siblings = parent ? getRegionChildrenForSite(site, parent) : [];
  const siblingIndex = siblings.findIndex((candidate) => candidate.path === node.path);
  const cityLeaves = cityNodes.filter((candidate) => candidate.kind === "representative");
  const cityDistricts = cityNodes.filter((candidate) => candidate.kind === "district");
  return {
    node,
    site,
    label: qualifiedName(node, site),
    children,
    parent,
    siblings,
    siblingIndex,
    previous: siblingIndex > 0 ? siblings[siblingIndex - 1] ?? null : null,
    next:
      siblingIndex >= 0 && siblingIndex < siblings.length - 1
        ? siblings[siblingIndex + 1] ?? null
        : null,
    aliases: sourceAliases(node),
    legalNames: legalAreaNames(node),
    cityDistricts,
    cityLeaves,
    directCityLeaves: cityLeaves.filter((candidate) => candidate.segments.length === 1),
    nestedCityLeaves: cityLeaves.filter((candidate) => candidate.segments.length === 2),
    mergedChildren: children.filter((child) => child.sourceUnitCount > 1),
    aliasedChildren: children.filter((child) => sourceAliases(child).length > 0),
    multiLegalChildren: children.filter((child) => legalCount(child) > 1),
  };
}

function toSection(section: DraftSection, facts: GraphFacts): ContentSection {
  const targetName = facts.node.displayName;
  const localHeading = section.heading.trim();
  const targetSuffix = localHeading.startsWith(targetName)
    ? localHeading.slice(targetName.length)
    : null;
  const targetPrefixBoundary =
    targetSuffix !== null &&
    (targetSuffix === "" ||
      /^(?:\s|·|은|는|이|가|을|를|과|와|의|에서|으로|로|도|만|부터|까지)/u.test(
        targetSuffix,
      ));
  if (targetPrefixBoundary) {
    const suffix = targetSuffix ?? "";
    return {
      ...section,
      heading: /^\s/u.test(suffix)
        ? `${facts.label} ${suffix.trimStart()}`
        : `${facts.label}${suffix}`,
    };
  }
  return {
    ...section,
    heading: `${facts.label} ${localHeading}`,
  };
}

function mergedNameExplanation(nodes: readonly BabyRegionNode[]): string {
  const examples = nodes.slice(0, 4).map((node) => {
    const names = sourceAliases(node);
    return names.length > 0
      ? `${withTopicParticle(compactNames(names, 5))} ${node.displayName} 안내에서 함께 찾을 수 있습니다.`
      : `${withTopicParticle(node.displayName)} 표시 이름 그대로 찾을 수 있습니다.`;
  });
  if (nodes.length > 4) {
    examples.push(
      `나머지 ${nodes.length - 4}개 지역도 같은 방식으로 대표 이름에 연결합니다.`,
    );
  }
  return examples.join(" ");
}

function nodeGroupTypes(node: BabyRegionNode): readonly string[] {
  return uniqueStrings(node.records.map((record) => record.groupType));
}

function siblingLegalNames(
  node: BabyRegionNode,
  siblings: readonly BabyRegionNode[],
): readonly string[] {
  const current = new Set(legalAreaNames(node));
  return uniqueStrings(
    siblings
      .filter((sibling) => sibling.path !== node.path)
      .flatMap((sibling) => legalAreaNames(sibling))
      .filter((name) => current.has(name)),
  );
}

function homonymousRegions(
  node: BabyRegionNode,
): readonly { site: BabySiteConfig; node: BabyRegionNode }[] {
  return ALL_BABY_SITES.flatMap((site) =>
    getRegionNodesForSite(site)
      .filter(
        (candidate) =>
          candidate.kind === "representative" &&
          candidate.displayName === node.displayName &&
          (candidate.siteKey !== node.siteKey || candidate.path !== node.path),
      )
      .map((candidate) => ({ site, node: candidate })),
  );
}

function cityFactMatches(
  facts: GraphFacts,
  limit = 2,
): readonly CityFactSection[] {
  const profile = getCityFactProfile(facts.site.key);
  const weightedNames = [
    { name: facts.node.displayName, weight: 100 },
    ...facts.aliases.map((name) => ({ name, weight: 80 })),
    ...facts.legalNames.map((name) => ({ name, weight: 70 })),
    ...linkedNeighborNodes(facts).flatMap((neighbor) => [
      { name: neighbor.displayName, weight: 90 },
      ...sourceAliases(neighbor).map((name) => ({ name, weight: 60 })),
      ...legalAreaNames(neighbor).map((name) => ({ name, weight: 50 })),
    ]),
    ...(facts.parent?.kind === "district"
      ? [{ name: facts.parent.displayName, weight: 30 }]
      : []),
    ...(facts.node.kind === "district"
      ? facts.children.flatMap((child) => [
          { name: child.displayName, weight: 40 },
          ...sourceAliases(child).map((name) => ({ name, weight: 25 })),
          ...legalAreaNames(child).map((name) => ({ name, weight: 20 })),
        ])
      : []),
  ].filter(({ name }) => name.length >= 2);
  return profile.sections
    .map((section, sourceIndex) => {
      const text = [section.heading, ...section.paragraphs].join(" ");
      const score = weightedNames.reduce(
        (total, { name, weight }) => total + (text.includes(name) ? weight : 0),
        0,
      );
      return { section, score, sourceIndex };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.sourceIndex - right.sourceIndex,
    )
    .slice(0, limit)
    .map(({ section }) => section);
}

function sameLegalSiblingNodes(
  node: BabyRegionNode,
  siblings: readonly BabyRegionNode[],
): readonly BabyRegionNode[] {
  const current = new Set(legalAreaNames(node));
  return siblings.filter(
    (sibling) =>
      sibling.path !== node.path &&
      legalAreaNames(sibling).some((name) => current.has(name)),
  );
}

function linkedNeighborNodes(facts: GraphFacts): readonly BabyRegionNode[] {
  const preferred = [facts.previous, facts.next].filter(
    (node): node is BabyRegionNode => Boolean(node),
  );
  if (preferred.length > 0) return preferred;
  return facts.siblings
    .filter((sibling) => sibling.path !== facts.node.path)
    .slice(0, 2);
}

function compactLegalNames(node: BabyRegionNode, limit = 8): string {
  return compactNames(legalAreaNames(node), limit);
}

function childLegalExamples(
  children: readonly BabyRegionNode[],
  limit = 3,
): string {
  return children
    .slice(0, limit)
    .map((child) => {
      const legalLabel = child.displayName.endsWith("동")
        ? "법정동"
        : "법정 지역";
      return `${child.displayName} 카드(${legalLabel} ${compactLegalNames(child, 4)})`;
    })
    .join(", ");
}

function childIdentityExamples(
  children: readonly BabyRegionNode[],
  limit = 8,
): string {
  return children
    .slice(0, limit)
    .map((child) => {
      const aliases = sourceAliases(child);
      const confirmedNames = aliases.length > 0
        ? aliases
        : legalAreaNames(child);
      return `${child.displayName}(${compactNames(
        confirmedNames.length > 0 ? confirmedNames : [child.displayName],
        5,
      )})`;
    })
    .join(", ");
}

function siblingSourceExamples(nodes: readonly BabyRegionNode[]): string {
  return nodes
    .slice(0, 3)
    .map((node) => {
      const aliases = sourceAliases(node);
      return aliases.length > 0
        ? `${node.displayName}(${compactNames(aliases, 3)})`
        : node.displayName;
    })
    .join("·");
}

function childFactSummary(children: readonly BabyRegionNode[]): {
  merged: readonly BabyRegionNode[];
  singleLegal: readonly BabyRegionNode[];
  multipleLegal: readonly BabyRegionNode[];
  displayDiffersFromLegal: readonly BabyRegionNode[];
} {
  return {
    merged: children.filter((child) =>
      nodeGroupTypes(child).includes("merged_representative_group"),
    ),
    singleLegal: children.filter((child) => legalAreaNames(child).length === 1),
    multipleLegal: children.filter((child) => legalAreaNames(child).length > 1),
    displayDiffersFromLegal: children.filter(
      (child) => !legalAreaNames(child).includes(child.displayName),
    ),
  };
}

function exactRegionNameList(nodes: readonly BabyRegionNode[], limit = 8): string {
  return compactNames(nodes.map((node) => node.displayName), limit);
}

function naturalHomeSections(facts: GraphFacts): ContentSection[] {
  const { site, children, cityDistricts, mergedChildren } = facts;
  const profile = getCityFactProfile(site.key);
  const childNames = children.map((child) => child.displayName);
  const mergedRepresentatives = mergedChildren.filter(
    (child) => child.kind === "representative",
  );
  const regionStructure =
    cityDistricts.length > 0
      ? `${site.searchName}에서는 ${cityDistricts
          .map((item) => item.displayName)
          .join("·")} 가운데 구를 먼저 선택하고, 해당 구의 동 지역을 이어서 확인합니다.`
      : `${site.searchName} 홈에서 ${nodeTypeSummary(children)} 지역을 바로 선택할 수 있습니다.`;

  return [
    {
      id: "city-address-context",
      heading: profile.heading,
      paragraphs: [...profile.paragraphs],
    },
    ...profile.sections.map((section) => ({
      id: `city-fact-${section.id}`,
      heading: section.heading,
      paragraphs: [...section.paragraphs] as [string, string],
    })),
    {
      id: "address-boundary",
      heading: `${profile.addressAxes[0]} 기준과 함께 보는 지역 목록`,
      paragraphs: [
        `${regionStructure} 홈에서 바로 보이는 이름은 ${compactNames(childNames, 12)}입니다.`,
        `${profile.addressAxes.join("·")} 같은 지명은 방향을 설명하는 보조 기준입니다. 최종 위치는 목록의 구·읍·면·동과 실제 도로명주소로 확인하세요.`,
      ],
    },
    {
      id: "source-aliases",
      heading: `${profile.addressAxes[1]} 주변의 행정동 이름 확인`,
      paragraphs: [
        mergedRepresentatives.length > 0
          ? mergedNameExplanation(mergedRepresentatives)
          : cityDistricts.length > 0
            ? `${cityDistricts
                .map((item) => item.displayName)
                .join("·")} 구 페이지에서 행정동과 법정동 이름을 함께 확인할 수 있습니다.`
            : `${site.searchName}의 동·읍·면은 지역 목록에 표시된 이름으로 각각 찾을 수 있습니다.`,
        `${profile.addressAxes[1]} 같은 지형·시설 이름만으로 행정동을 확정하지 않습니다. 주소에 적힌 행정동 또는 법정동과 도로명을 함께 보세요.`,
      ],
    },
    {
      id: "reservation-address",
      heading: `${profile.addressAxes.at(-1)} 쪽 주소를 전달할 때`,
      paragraphs: [
        `${profile.addressAxes.at(-1)} 쪽이라는 설명에 구·읍·면·동, 도로명, 건물명을 이어 적어 주세요. 숙소라면 출입 안내도 함께 확인합니다.`,
        "산·하천·호수·역·공원·항구 이름은 주소를 보완하는 기준이며, 세부 방문 가능 여부는 정확한 주소와 희망 시각을 전화로 확인한 뒤 정합니다.",
      ],
    },
    {
      id: "fixed-guide-handoff",
      heading: `${withAndParticle(profile.addressAxes[0])} ${profile.addressAxes[1]} 주소 확인 뒤 볼 안내`,
      paragraphs: [
        `${profile.addressAxes[0]} 또는 ${profile.addressAxes[1]} 쪽 주소를 정했다면 코스별 시간과 금액은 코스·가격 페이지에서 확인할 수 있습니다.`,
        "전화 전에 준비할 항목과 현장 후불 기준은 이용 방법 페이지에 따로 정리돼 있습니다. 같은 가격표와 절차를 지역 본문마다 반복하지 않습니다.",
      ],
    },
  ];
}

function naturalDistrictSections(facts: GraphFacts): ContentSection[] {
  const { node, site, children, parent, siblings } = facts;
  const label = facts.label;
  const parentLabel = parent ? qualifiedName(parent, site) : site.searchName;
  const typeProfile = childTypeProfile(children);
  const summary = childFactSummary(children);
  const profile = getCityFactProfile(site.key);
  const matchedCityFact = cityFactMatches(facts, 1)[0];
  const officialHeading = matchedCityFact?.heading ?? profile.heading;
  const officialParagraphs = matchedCityFact?.paragraphs ?? profile.paragraphs;
  const siblingDistricts = siblings.filter(
    (sibling) => sibling.path !== node.path,
  );
  const siblingNames = siblingDistricts.length > 0
    ? exactRegionNameList(siblingDistricts)
    : site.searchName;
  const firstChild = children[0] ?? node;
  const lastChild = children.at(-1) ?? node;
  const singleChild = children.length === 1;
  const childLinks = exactRegionNameList(children, 12);
  const legalExamples = childLegalExamples(children, 8);
  const identityExamples = childIdentityExamples(children, 10);
  const mergedNames = summary.merged.length > 0
    ? exactRegionNameList(summary.merged, 8)
    : null;
  const differentLegalNames = summary.displayDiffersFromLegal.length > 0
    ? exactRegionNameList(summary.displayDiffersFromLegal, 8)
    : null;
  const multipleLegalNames = summary.multipleLegal.length > 0
    ? exactRegionNameList(summary.multipleLegal, 8)
    : null;
  const singleLegalNames = summary.singleLegal.length > 0
    ? exactRegionNameList(summary.singleLegal, 8)
    : childLinks;
  const drafts: DraftSection[] = [
    {
      id: "address-boundary",
      heading: `하위 주소로 이어지는 ${childLinks}`,
      paragraphs: [
        `${label}에서 바로 여는 지역은 ${childLinks}입니다. 도로명주소에서 ${node.displayName} 다음에 적힌 이름을 고르세요.`,
        singleChild
          ? `${node.displayName}에서 바로 이어지는 하위 안내는 ${firstChild.displayName} 한 곳이며, 실제 링크는 페이지 마지막 주소 목록에 있습니다.`
          : `${firstChild.displayName}부터 ${lastChild.displayName}까지의 실제 하위 링크는 페이지 마지막 주소 목록에 있습니다.`,
      ],
    },
    {
      id: "route-depth",
      heading: `${firstChild.displayName}부터 읽는 도로명주소 순서`,
      paragraphs: [
        `${label} 주소는 ${site.searchName}, ${node.displayName}, 실제 읍·면·동, 도로명, 건물명 순서로 읽습니다.`,
        singleChild
          ? `${withTopicParticle(firstChild.displayName)} ${node.displayName}에서 바로 여는 하위 지역입니다.`
          : `${withTopicParticle(firstChild.displayName)} ${withAndParticle(lastChild.displayName)} 같은 ${node.displayName} 하위 단계에 놓인 서로 다른 지역입니다.`,
      ],
    },
    {
      id: "branch-types",
      heading: typeProfile.label,
      paragraphs: [
        `${label}의 직계 하위 지역은 ${nodeTypeSummary(children)}입니다. ${typeProfile.sentence}`,
        `${childLinks} 가운데 주소에 적힌 행정 단위를 그대로 골라야 ${node.displayName} 아래 단계가 맞습니다.`,
      ],
    },
    {
      id: "source-aliases",
      heading: mergedNames
        ? `${mergedNames} 대표 이름에 모인 행정동 확인`
        : singleChild
          ? `${firstChild.displayName} 표시 이름 확인`
          : `${firstChild.displayName}·${lastChild.displayName} 표시 이름 확인`,
      paragraphs: [
        mergedNames
          ? `${label}에서는 ${mergedNameExplanation(summary.merged)}`
          : `${label}의 ${childLinks} 카드는 표시 이름별로 각각 열립니다. 확인 이름은 ${identityExamples}입니다.`,
        mergedNames
          ? `${siblingSourceExamples(summary.merged)} 표기를 보았다면 대표 카드 이름과 실제 도로명주소를 함께 확인하세요. 하위 확인 이름은 ${identityExamples}입니다.`
          : singleChild
            ? `${firstChild.displayName} 카드 이름을 도로명주소의 행정동 표기와 먼저 맞추세요.`
            : `${withAndParticle(firstChild.displayName)} ${lastChild.displayName} 카드 이름을 도로명주소의 행정동 표기와 먼저 맞추세요.`,
      ],
    },
    {
      id: "legal-area-map",
      heading: differentLegalNames
        ? `${differentLegalNames} 행정동·법정동 이름 대조`
        : `${firstChild.displayName}부터 확인하는 법정동 표기`,
      paragraphs: [
        differentLegalNames
          ? `${label}에서 카드 이름과 확인된 법정동 표기가 다른 지역은 ${differentLegalNames}입니다.`
          : `${label} 하위 카드의 법정동 예시는 ${legalExamples}입니다.`,
        `${legalExamples}처럼 카드 이름과 법정동을 함께 읽은 뒤 도로명과 건물명을 이어 적으세요.`,
      ],
    },
    {
      id: "legal-area-shape",
      heading: multipleLegalNames
        ? `${multipleLegalNames} 복수 법정동 범위`
        : `${singleLegalNames} 단일 법정동 범위`,
      paragraphs: [
        multipleLegalNames
          ? `${multipleLegalNames} 카드는 확인된 법정동이 둘 이상이므로 카드 안에서 현재 법정동을 다시 고릅니다.`
          : `${singleLegalNames} 카드는 확인된 법정동 표기 하나를 주소와 맞춥니다.`,
        singleChild
          ? `${withTopicParticle(firstChild.displayName)} ${node.displayName} 아래의 하위 카드이며, 카드 안에서 현재 법정동 범위를 확인합니다.`
          : `${withTopicParticle(childLinks)} 모두 ${node.displayName} 아래에 있지만 법정동 범위는 카드마다 다를 수 있습니다.`,
      ],
    },
    {
      id: "city-scope",
      heading: `${siblingNames} 등 같은 도시의 다른 구 확인`,
      paragraphs: [
        `${withAndParticle(node.displayName)} 같은 ${site.searchName}의 다른 구 이름은 ${siblingNames}입니다.`,
        `${childLinks} 주소는 현재 ${node.displayName} 목록에서 찾고, 도로명주소의 구가 ${siblingNames} 중 하나라면 그 구 페이지로 이동하세요.`,
      ],
    },
    {
      id: matchedCityFact ? `official-city-${matchedCityFact.id}` : "official-city-overview",
      heading: `${officialHeading}에서 보는 하위 주소`,
      paragraphs: [
        `${officialParagraphs[0]}`,
        `${officialParagraphs[1]} ${childLinks} 가운데 현재 도로명주소에 적힌 하위 지역을 함께 확인하세요.`,
      ],
    },
    {
      id: "reservation-address",
      heading: singleChild
        ? `${firstChild.displayName} 주소 전화 메모`
        : `${firstChild.displayName}·${lastChild.displayName} 주소 전화 메모`,
      paragraphs: [
        singleChild
          ? `${label} 상담 전에는 ${firstChild.displayName}의 법정동, 도로명, 건물명, 출입 안내와 희망 시각을 준비하세요.`
          : `${label} 상담 전에는 ${childLinks} 중 현재 지역, 법정동, 도로명, 건물명, 출입 안내와 희망 시각을 준비하세요.`,
        `${withAndParticle(parentLabel)} ${node.displayName}, 선택한 하위 지역을 한 줄에 적으면 주소 단계를 빠뜨리지 않습니다.`,
      ],
    },
    {
      id: "fixed-guide-handoff",
      heading: `${childLinks} 주소 확인 뒤 보는 고정 안내`,
      paragraphs: [
        `${label}에서 하위 주소를 정한 다음 코스별 시간과 금액은 코스·가격 페이지에서 확인합니다.`,
        singleChild
          ? `${firstChild.displayName}의 전화 전 준비사항과 현장 후불 기준은 이용 방법 페이지에 따로 정리돼 있습니다.`
          : `${firstChild.displayName}부터 ${lastChild.displayName}까지 전화 전 준비사항과 현장 후불 기준은 이용 방법 페이지에 따로 정리돼 있습니다.`,
      ],
    },
  ];
  return drafts.map((section) => toSection(section, facts));
}

function naturalLeafSections(facts: GraphFacts): ContentSection[] {
  const {
    node,
    site,
    parent,
    siblings,
    previous,
    next,
    aliases,
    legalNames,
  } = facts;
  const peers = siblings.filter((sibling) => sibling.path !== node.path);
  if (peers.length === 0) {
    return naturalStandaloneLeafSections(facts);
  }
  if (!previous || !next) {
    return naturalBoundaryLeafSections(facts);
  }

  const label = facts.label;
  const parentLabel = parent ? qualifiedName(parent, site) : site.searchName;
  const parentHeadingScope = parent?.kind === "home"
    ? "도시 홈"
    : parent?.displayName ?? site.searchName;
  const type = localType(node);
  const legalUnit = type === "동" ? "법정동" : "법정 지역";
  const displayUnit = type === "동" ? "행정동" : `${type} 표시 이름`;
  const legalNameList = compactNames(legalNames, 10);
  const headingLegalNames = compactNames(legalNames, 3);
  const riNames = legalNames.filter((name) => name.endsWith("리"));
  const nodeIndex = siblings.findIndex((candidate) => candidate.path === node.path);
  const precedingPeers = nodeIndex > 0
    ? siblings.slice(Math.max(0, nodeIndex - 2), nodeIndex)
    : [];
  const followingPeers = nodeIndex >= 0
    ? siblings.slice(nodeIndex + 1, nodeIndex + 3)
    : [];
  const linkedNeighbors = linkedNeighborNodes(facts);
  const focusPeers = linkedNeighbors.filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.path === candidate.path) === index,
  );
  const displayContextNodes = [...precedingPeers, ...followingPeers].filter(
      (candidate, index, all) =>
        all.findIndex((item) => item.path === candidate.path) === index,
  );
  const displayContextNames = exactRegionNameList(displayContextNodes);
  const displayContextLegalExamples = childLegalExamples(
    displayContextNodes,
    4,
  );
  const firstPeer = focusPeers[0] ?? peers[0]!;
  const secondPeer =
    [...focusPeers].reverse().find((candidate) => candidate.path !== firstPeer.path) ??
    peers.find((candidate) => candidate.path !== firstPeer.path) ??
    null;
  const focusNames = exactRegionNameList(
    secondPeer ? [firstPeer, secondPeer] : [firstPeer],
  );
  const peerNames = exactRegionNameList(peers, 10);
  const firstPeerLegal = compactLegalNames(firstPeer, 5);
  const secondPeerLegal = secondPeer
    ? compactLegalNames(secondPeer, 5)
    : null;
  const groupTypes = nodeGroupTypes(node);
  const merged = groupTypes.includes("merged_representative_group");
  const sharedLegal = siblingLegalNames(node, siblings);
  const sameLegalNodes = sameLegalSiblingNodes(node, siblings);
  const homonyms = homonymousRegions(node);
  const profile = getCityFactProfile(site.key);
  const matchedCityFact = cityFactMatches(facts, 1)[0];
  const officialHeading = matchedCityFact?.heading ?? profile.heading;
  const addressPath = [site.searchName, ...node.segments].join(" → ");
  const sourceNameList = aliases.length > 0
    ? compactNames(aliases, 8)
    : node.displayName;
  const displayOrderHeading = previous && next
    ? `${previous.displayName}·${next.displayName} 사이의 목록 표시 위치`
    : `${previous?.displayName ?? next?.displayName ?? parentLabel} 쪽 목록 끝 위치`;
  const displayOrderSentence = previous && next
    ? `${previous.displayName} → ${node.displayName} → ${next.displayName}`
    : previous
      ? `${previous.displayName} → ${node.displayName}`
      : `${node.displayName} → ${next?.displayName ?? firstPeer.displayName}`;
  const peerLegalSentence = secondPeer
    ? `${firstPeer.displayName}의 법정 표기는 ${firstPeerLegal}, ${secondPeer.displayName}의 법정 표기는 ${secondPeerLegal}입니다.`
    : `${firstPeer.displayName}의 법정 표기는 ${firstPeerLegal}입니다.`;

  const drafts: DraftSection[] = [
    {
      id: "parent-hierarchy",
      heading: parent?.kind === "home"
        ? `도시 홈에서 ${withAndParticle(focusNames)} 함께 보는 ${type} 주소 단계`
        : `${parentHeadingScope} 아래 ${withAndParticle(focusNames)} 함께 보는 ${type} 주소 단계`,
      paragraphs: [
        `주소 순서는 ${addressPath} → 도로명 → 건물명이며, 상위 목록에는 ${focusNames}도 표시됩니다.`,
        `${node.displayName}의 바로 위 행정 단계는 ${parentLabel}이고, ${withAndParticle(firstPeer.displayName)} ${secondPeer?.displayName ?? parent?.displayName ?? site.searchName}도 같은 상위 목록에서 확인합니다.`,
      ],
    },
    {
      id: "adjacent-routes",
      heading: displayOrderHeading,
      paragraphs: [
        `상위 목록의 표시 순서는 ${displayOrderSentence}입니다.`,
        `이 구간에서 함께 확인할 카드와 법정 표기는 ${displayContextLegalExamples}입니다. ${displayContextNames} 표시는 목록 순서이며 이동 거리나 지리적 인접을 뜻하지 않습니다.`,
      ],
    },
    {
      id: "sibling-scope",
      heading: `${parentHeadingScope}의 같은 단계 지역 이름`,
      paragraphs: [
        `${parentLabel}에서 ${node.displayName}과 같은 단계에 놓인 이름은 ${peerNames}입니다.`,
        `${withAndParticle(focusNames)} 현재 ${node.displayName} 카드를 확인한 뒤 도로명주소를 읽으세요.`,
      ],
    },
    {
      id: "source-aliases",
      heading: merged
        ? `${sourceNameList} 이름이 모이는 대표 안내`
        : `${node.displayName} 표시 이름과 ${focusNames} 확인`,
      paragraphs: [
        merged
          ? `${sourceNameList} 이름은 ${node.displayName} 대표 안내에서 함께 확인합니다.`
          : `${withTopicParticle(node.displayName)} 묶음 별칭 없이 표시 이름을 그대로 사용하며 ${withTopicParticle(focusNames)} 각자 다른 카드입니다.`,
        secondPeer
          ? `${withAndParticle(firstPeer.displayName)} ${secondPeer.displayName}도 상위 목록에서 각각의 카드 이름을 유지합니다.`
          : `${withTopicParticle(firstPeer.displayName)} 상위 목록에서 자체 카드 이름을 유지합니다.`,
      ],
    },
    {
      id: "legal-area-map",
      heading: `${headingLegalNames} ${legalUnit}과 ${focusNames} 법정 표기 확인`,
      paragraphs: [
        `${label}에서 확인할 ${legalUnit} 표기는 ${legalNameList}이며 ${focusNames} 표기와 함께 읽습니다.`,
        peerLegalSentence,
      ],
    },
    {
      id: "shared-boundary-names",
      heading: sharedLegal.length > 0
        ? `${exactRegionNameList(sameLegalNodes, 4)}에도 보이는 ${compactNames(sharedLegal, 4)} 표기`
        : `${focusNames}의 법정 표기와 다른 ${headingLegalNames}`,
      paragraphs: [
        sharedLegal.length > 0
          ? `${compactNames(sharedLegal, 6)} 표기는 현재 안내와 ${exactRegionNameList(sameLegalNodes, 6)}에서 함께 확인됩니다.`
          : `${legalNameList} 표기는 ${focusNames}의 법정 이름과 겹치지 않습니다.`,
        `${peerLegalSentence} 도로명과 건물명을 붙여 현재 주소를 확정하세요.`,
      ],
    },
    {
      id: "route-type",
      heading: type === "읍" || type === "면"
        ? `${withObjectParticle(focusNames)} 확인한 뒤 ${node.displayName} 아래 리·도로명 순서`
        : `${withAndParticle(focusNames)} ${displayUnit}·${legalUnit}을 함께 적는 순서`,
      paragraphs: [
        type === "읍" || type === "면"
          ? `${label}에는 ${compactNames(riNames.length > 0 ? riNames : legalNames, 12)} 주소가 포함되며 ${withAndParticle(focusNames)} 행정 단계가 다릅니다.`
          : `${displayUnit} ${withAndParticle(node.displayName)} ${legalUnit} ${withObjectParticle(legalNameList)} 적고 ${withTopicParticle(focusNames)} 상위 목록의 다른 이름으로 남겨 두세요.`,
        `${parent?.displayName ?? site.searchName} 다음에는 ${node.displayName}, 도로명, 건물번호가 이어지고 ${withTopicParticle(focusNames)} 현재 주소에 넣지 않습니다.`,
      ],
    },
    {
      id: "same-name-safety",
      heading: homonyms.length > 0
        ? `${compactNames(homonyms.map(({ site: candidateSite }) => candidateSite.searchName), 4)}의 같은 이름 지역 확인`
        : `${withAndParticle(focusNames)} ${parentHeadingScope} 범위 확인`,
      paragraphs: [
        homonyms.length > 0
          ? `${node.displayName}이라는 이름은 ${compactNames(homonyms.map(({ site: candidateSite }) => candidateSite.searchName), 8)}에도 있습니다. 현재 주소의 도시는 ${site.searchName}입니다.`
          : parent?.kind === "home"
            ? `${node.displayName} 주소의 도시는 ${site.searchName}이며, ${site.searchName} 홈 목록에서 ${withAndParticle(focusNames)} 현재 카드를 함께 확인합니다.`
            : `${node.displayName} 주소의 도시는 ${site.searchName}, 상위 지역은 ${parent?.displayName ?? site.searchName}이며 같은 목록에서 ${focusNames}도 확인합니다.`,
        `${focusNames} 중 어느 주소도 현재 ${label}을 대신하지 않으므로 도시·상위 지역·도로명을 함께 전달하세요.`,
      ],
    },
    {
      id: matchedCityFact ? `official-city-${matchedCityFact.id}` : "official-city-overview",
      heading: `${officialHeading} — ${focusNames} 주소와 함께 보기`,
      paragraphs: [
        `${withTopicParticle(profile.addressAxes.join("·"))} ${site.searchName} 공식 지역 자료에서 주소 범위를 설명하는 기준점입니다.`,
        `${withAndParticle(focusNames)} ${withTopicParticle(node.displayName)} ${parent?.displayName ?? site.searchName} 목록에 속하며, 현재 주소에는 도로명과 건물명을 이어 확인하세요.`,
      ],
    },
    {
      id: "reservation-address",
      heading: `${focusNames} 확인 뒤 ${headingLegalNames}·도로명·건물명 전화 메모`,
      paragraphs: [
        `${label} 상담 전에는 ${legalNameList}, 도로명, 건물명, 출입 안내와 희망 시각을 준비하고 ${focusNames} 주소와 섞이지 않았는지 확인하세요.`,
        `${withSubjectParticle(focusNames)} 아닌 현재 주소를 확인한 뒤 코스별 시간·금액은 코스·가격, 현장 후불 기준은 이용 방법에서 확인합니다.`,
      ],
    },
  ];
  return drafts.map((section) => toSection(section, facts));
}
function naturalBoundaryLeafSections(facts: GraphFacts): ContentSection[] {
  const {
    node,
    site,
    parent,
    siblings,
    previous,
    next,
    aliases,
    legalNames,
  } = facts;
  const peers = siblings.filter((sibling) => sibling.path !== node.path);
  const neighbor = previous ?? next ?? peers[0]!;
  const atStart = previous === null;
  const oppositeEndpoint = atStart
    ? siblings.at(-1) ?? neighbor
    : siblings[0] ?? neighbor;
  const label = facts.label;
  const parentLabel = parent ? qualifiedName(parent, site) : site.searchName;
  const parentHeadingScope = parent?.kind === "home"
    ? "도시 홈"
    : parent?.displayName ?? site.searchName;
  const type = localType(node);
  const legalUnit = type === "동" ? "법정동" : "법정 지역";
  const displayUnit = type === "동" ? "행정동" : `${type} 표시 이름`;
  const legalNameList = compactNames(legalNames, 12);
  const headingLegalNames = compactNames(legalNames, 3);
  const neighborLegalNames = compactLegalNames(neighbor, 8);
  const peerNames = exactRegionNameList(peers, 10);
  const sameLegalNodes = sameLegalSiblingNodes(node, siblings);
  const sharedLegal = siblingLegalNames(node, siblings);
  const homonyms = homonymousRegions(node);
  const merged = nodeGroupTypes(node).includes("merged_representative_group");
  const sourceNameList = aliases.length > 0
    ? compactNames(aliases, 8)
    : node.displayName;
  const riNames = legalNames.filter((name) => name.endsWith("리"));
  const profile = getCityFactProfile(site.key);
  const matchedCityFact = cityFactMatches(facts, 1)[0];
  const officialHeading = matchedCityFact?.heading ?? profile.heading;
  const addressPath = [site.searchName, ...node.segments].join(" → ");
  const orderLine = atStart
    ? `${node.displayName} → ${neighbor.displayName}`
    : `${neighbor.displayName} → ${node.displayName}`;
  const boundaryLabel = atStart ? "첫" : "마지막";

  const drafts: DraftSection[] = [
    {
      id: "parent-hierarchy",
      heading: parent?.kind === "home"
        ? `도시 홈에서 여는 ${boundaryLabel} ${type} 주소 단계`
        : `${parentHeadingScope} 아래 ${boundaryLabel} ${type} 주소 단계`,
      paragraphs: [
        `${label} 주소는 ${addressPath} → 도로명 → 건물명 순서로 적고, 상위 목록에서는 ${withAndParticle(neighbor.displayName)} ${oppositeEndpoint.displayName} 방향을 함께 확인합니다.`,
        `${withTopicParticle(neighbor.displayName)} 같은 상위 ${parentLabel}에서 이어지는 지역 이름입니다.`,
      ],
    },
    {
      id: "adjacent-routes",
      heading: `${neighbor.displayName}·${oppositeEndpoint.displayName}으로 확인하는 목록의 ${boundaryLabel} 위치`,
      paragraphs: [
        `${parentLabel} 목록의 끝쪽 표시 순서는 ${orderLine}입니다.`,
        `${oppositeEndpoint.displayName}까지 이어지는 전체 표시는 거리나 이동 순서가 아니라 상위 목록을 찾기 위한 기준입니다.`,
      ],
    },
    {
      id: "sibling-scope",
      heading: `${parentHeadingScope}의 ${peerNames} 같은 단계 이름`,
      paragraphs: [
        `${label}과 같은 단계의 다른 이름은 ${peerNames}입니다.`,
        `${withAndParticle(neighbor.displayName)} ${oppositeEndpoint.displayName} 사이에서 현재 카드 이름과 도로명주소를 함께 확인하세요.`,
      ],
    },
    {
      id: "source-aliases",
      heading: merged
        ? `${sourceNameList} 이름이 모이는 ${node.displayName} 안내`
        : `${node.displayName} 표시 이름과 ${neighbor.displayName} 카드 확인`,
      paragraphs: [
        merged
          ? `${sourceNameList} 이름은 ${node.displayName} 대표 안내에 함께 연결됩니다.`
          : `${withTopicParticle(node.displayName)} 묶음 별칭 없이 표시 이름을 그대로 사용합니다.`,
        `${withTopicParticle(neighbor.displayName)} ${parent?.displayName ?? site.searchName} 목록에서 별도의 카드 이름으로 표시됩니다.`,
      ],
    },
    {
      id: "legal-area-map",
      heading: `${withAndParticle(headingLegalNames)} ${neighbor.displayName} 법정 표기 확인`,
      paragraphs: [
        `${label}에서 확인할 ${legalUnit} 이름은 ${legalNameList}입니다.`,
        `${withTopicParticle(neighborLegalNames)} ${neighbor.displayName}의 법정 표기이므로 현재 주소와 섞지 마세요.`,
      ],
    },
    {
      id: "route-type",
      heading: type === "읍" || type === "면"
        ? `${node.displayName} 아래 리·도로명 순서`
        : `${withAndParticle(displayUnit)} ${legalUnit}을 잇는 주소 순서`,
      paragraphs: [
        type === "읍" || type === "면"
          ? `${label}에는 ${compactNames(riNames.length > 0 ? riNames : legalNames, 12)} 주소가 포함됩니다.`
          : `${displayUnit} ${withAndParticle(node.displayName)} ${legalUnit} ${withObjectParticle(legalNameList)} 함께 적으세요.`,
        `${neighbor.displayName} 주소가 아니라면 ${node.displayName} 다음에 실제 도로명과 건물번호를 이어 적습니다.`,
      ],
    },
    {
      id: "shared-boundary-names",
      heading: sharedLegal.length > 0
        ? `${exactRegionNameList(sameLegalNodes, 5)}에도 보이는 ${compactNames(sharedLegal, 4)}`
        : `${withAndParticle(neighbor.displayName)} 겹치지 않는 ${headingLegalNames}`,
      paragraphs: [
        sharedLegal.length > 0
          ? `${compactNames(sharedLegal, 6)} 표기는 ${exactRegionNameList(sameLegalNodes, 6)} 안내에서도 확인됩니다.`
          : `${legalNameList} 표기는 ${neighbor.displayName}의 ${withAndParticle(neighborLegalNames)} 다릅니다.`,
        `${withObjectParticle(parent?.displayName ?? site.searchName)} 포함한 도로명주소로 현재 행정 범위를 확인하세요.`,
      ],
    },
    {
      id: "same-name-safety",
      heading: homonyms.length > 0
        ? `${compactNames(homonyms.map(({ site: candidateSite }) => candidateSite.searchName), 4)}의 같은 이름 지역 확인`
        : `${withAndParticle(`${neighbor.displayName}·${oppositeEndpoint.displayName}`)} ${parentHeadingScope} 범위 확인`,
      paragraphs: [
        homonyms.length > 0
          ? `${node.displayName}이라는 이름은 ${compactNames(homonyms.map(({ site: candidateSite }) => candidateSite.searchName), 8)}에도 있습니다. 현재 도시는 ${site.searchName}입니다.`
          : parent?.kind === "home"
            ? `${node.displayName}의 도시는 ${site.searchName}이며, ${site.searchName} 홈 목록의 ${withAndParticle(`${neighbor.displayName}·${oppositeEndpoint.displayName}`)} 현재 카드를 함께 확인합니다.`
            : `${node.displayName}의 도시는 ${site.searchName}, 바로 위 지역은 ${parent?.displayName ?? site.searchName}입니다.`,
        `${neighbor.displayName}이나 ${oppositeEndpoint.displayName}이 아닌 현재 주소라면 도시·상위 지역·도로명을 함께 전달하세요.`,
      ],
    },
    {
      id: matchedCityFact ? `official-city-${matchedCityFact.id}` : "official-city-overview",
      heading: `${officialHeading} — ${withAndParticle(neighbor.displayName)} 함께 보는 도시 주소`,
      paragraphs: [
        `${withTopicParticle(profile.addressAxes.join("·"))} ${site.searchName} 공식 지역 자료의 주소 기준점이며, 상위 목록의 ${neighbor.displayName}·${oppositeEndpoint.displayName} 범위와 함께 봅니다.`,
        `${withAndParticle(neighbor.displayName)} ${withTopicParticle(node.displayName)} ${parent?.displayName ?? site.searchName} 범위에서 도로명과 건물명으로 확인합니다.`,
      ],
    },
    {
      id: "reservation-address",
      heading: `${neighbor.displayName} 확인 뒤 ${headingLegalNames} 전화 메모`,
      paragraphs: [
        `${label} 상담 전에는 ${neighbor.displayName}·${oppositeEndpoint.displayName} 표기를 제외하고 ${legalNameList}, 도로명, 건물명, 출입 안내와 희망 시각을 준비하세요.`,
        `${neighbor.displayName} 주소가 아닌 것을 확인한 뒤 코스·가격과 현장 후불 기준은 고정 안내에서 이어서 봅니다.`,
      ],
    },
  ];
  return drafts.map((section) => toSection(section, facts));
}

function naturalStandaloneLeafSections(facts: GraphFacts): ContentSection[] {
  const {
    node,
    site,
    parent,
    aliases,
    legalNames,
  } = facts;
  const label = facts.label;
  const parentLabel = parent ? qualifiedName(parent, site) : site.searchName;
  const type = localType(node);
  const legalUnit = type === "동" ? "법정동" : "법정 지역";
  const displayUnit = type === "동" ? "행정동" : `${type} 표시 이름`;
  const legalNameList = legalNames.length > 0
    ? compactNames(legalNames, 12)
    : node.displayName;
  const headingLegalNames = legalNames.length > 0
    ? compactNames(legalNames, 3)
    : node.displayName;
  const aliasNameList = aliases.length > 0
    ? compactNames(aliases, 10)
    : node.displayName;
  const aliasHeadingNames = aliases.length > 0
    ? compactNames(aliases, 3)
    : node.displayName;
  const riNames = legalNames.filter((name) => name.endsWith("리"));
  const profile = getCityFactProfile(site.key);
  const matchedCityFact = cityFactMatches(facts, 1)[0];
  const officialHeading = matchedCityFact?.heading ?? profile.heading;
  const officialParagraphs = matchedCityFact?.paragraphs ?? profile.paragraphs;
  const addressPath = [site.searchName, ...node.segments].join(" → ");
  const drafts: DraftSection[] = [
    {
      id: "parent-hierarchy",
      heading: `${parent?.displayName ?? site.searchName} 아래에서 확인하는 ${type} 주소 단계`,
      paragraphs: [
        `${label}의 바로 위 지역은 ${parentLabel}입니다. 도로명주소는 ${addressPath} 순서로 확인합니다.`,
        `${withTopicParticle(label)} ${withObjectParticle(parent?.displayName ?? site.searchName)} 거쳐 여는 ${type} 안내입니다. ${node.displayName} 다음에 실제 도로명과 건물명을 이어 적으세요.`,
      ],
    },
    {
      id: "source-aliases",
      heading: aliases.length > 0
        ? `${withObjectParticle(aliasHeadingNames)} ${node.displayName} 대표 이름에서 확인하기`
        : `${node.displayName} 표시 이름 확인`,
      paragraphs: [
        aliases.length > 0
          ? `${label} 안내에는 ${aliasNameList} 이름이 ${node.displayName} 대표 이름으로 함께 연결됩니다.`
          : `${label} 안내는 ${node.displayName} 표시 이름을 그대로 사용합니다.`,
        `${displayUnit} 이름을 확인한 뒤 ${legalUnit} ${legalNameList}, 도로명, 건물명을 차례로 준비하세요.`,
      ],
    },
    {
      id: "legal-area-map",
      heading: `${headingLegalNames} 법정 이름 확인`,
      paragraphs: [
        legalNames.includes(node.displayName)
          ? `${label}의 ${displayUnit}과 확인된 ${legalUnit} 이름에는 ${node.displayName}이 함께 쓰입니다.`
          : `${label} 카드에는 ${node.displayName}이 표시되며, 확인된 ${legalUnit} 이름은 ${legalNameList}입니다.`,
        `${legalUnit} 이름만 적지 말고 ${parent?.displayName ?? site.searchName}, ${node.displayName}, 실제 도로명과 건물번호를 함께 확인하세요.`,
      ],
    },
    {
      id: "legal-area-shape",
      heading: type === "읍" || type === "면"
        ? `${headingLegalNames} 아래 리·도로명 확인`
        : `${headingLegalNames} 법정동 범위 확인`,
      paragraphs: [
        type === "읍" || type === "면"
          ? `${label}에는 ${compactNames(riNames.length > 0 ? riNames : legalNames, 12)} 주소가 포함됩니다. ${node.displayName} 다음에 리와 도로명을 이어 확인하세요.`
          : `${withTopicParticle(label)} ${legalNameList} 법정동을 ${node.displayName} 대표 이름 안에서 확인하는 안내입니다.`,
        `${withTopicParticle(headingLegalNames)} 주소 범위를 확인하는 기준이며, 최종 방문지는 도로명과 건물명으로 정합니다.`,
      ],
    },
    {
      id: "administrative-scope",
      heading: `${parent?.displayName ?? site.searchName} 안의 ${node.displayName} 주소 범위`,
      paragraphs: [
        `${label} 페이지는 ${parentLabel} 안에서 ${node.displayName} 대표 이름에 포함된 주소 범위를 다룹니다.`,
        `${withAndParticle(parent?.displayName ?? site.searchName)} ${node.displayName}, ${legalNameList}, 도로명을 한 줄에 적으면 전화로 위치를 확인하기 쉽습니다.`,
      ],
    },
    {
      id: matchedCityFact ? `official-city-${matchedCityFact.id}` : "official-city-overview",
      heading: `${officialHeading}에서 보는 ${parent?.displayName ?? site.searchName} 주소`,
      paragraphs: [
        `${label} 주소를 확인할 때 참고할 공식 도시 안내입니다. ${officialParagraphs[0]}`,
        `${officialParagraphs[1]} 기준점만으로 위치를 확정하지 않고 ${parent?.displayName ?? site.searchName}, ${node.displayName}, 도로명과 건물명을 함께 확인합니다.`,
      ],
    },
    {
      id: "address-checklist",
      heading: "도로명·건물명·출입 안내 준비",
      paragraphs: [
        `${label} 상담 전에는 ${legalNameList}, 도로명, 건물명, 숙소나 공동주택의 출입 안내를 준비하세요.`,
        `${node.displayName}이라는 대표 이름만 전달하기보다 실제 건물번호와 진입 방법까지 알려 주면 주소 확인이 분명해집니다.`,
      ],
    },
    {
      id: "reservation-address",
      heading: "희망 시각과 세부 주소를 함께 확인하는 전화 메모",
      paragraphs: [
        `${label} 주소가 맞는지 확인한 뒤 희망 시각, 도로명, 건물명, 출입 안내를 전화 메모에 적어 두세요.`,
        "세부 방문 가능 여부는 정확한 주소와 희망 시각을 전화로 확인한 뒤 정합니다.",
      ],
    },
    {
      id: "scope-safety",
      heading: `${site.searchName}·${parent?.displayName ?? site.searchName}·${node.displayName} 순서 재확인`,
      paragraphs: [
        `${addressPath} 순서를 다시 읽고, ${legalUnit} ${legalNameList}와 실제 도로명이 현재 주소에 맞는지 확인하세요.`,
        `${withObjectParticle(site.searchName)} 시작으로 ${withAndParticle(parent?.displayName ?? site.searchName)} ${withObjectParticle(node.displayName)} 차례로 적으면 도시와 세부 주소 범위를 함께 전달할 수 있습니다.`,
      ],
    },
    {
      id: "fixed-guide-handoff",
      heading: "주소 준비 뒤 확인할 코스·이용 안내",
      paragraphs: [
        `${label} 주소를 정한 다음 코스별 시간과 금액은 코스·가격 페이지에서 확인하세요.`,
        "전화 전에 준비할 항목과 현장 후불 기준은 이용 방법 페이지에 따로 정리돼 있습니다.",
      ],
    },
  ];
  return drafts.map((section) => toSection(section, facts));
}

function appendDirectory(
  sections: readonly ContentSection[],
  facts: GraphFacts,
  leaf: boolean,
): ContentSection[] {
  const related = leaf
    ? facts.siblings.filter((item) => item.path !== facts.node.path)
    : facts.children;
  const contextual = leaf
    ? linkedNeighborNodes(facts)
    : facts.children.slice(0, 2);
  if (leaf && related.length === 0) {
    const parentLabel = facts.parent
      ? qualifiedName(facts.parent, facts.site)
      : facts.site.searchName;
    return [
      ...sections,
      {
        id: "related-region-directory",
        heading: `${facts.label} 상위 주소 확인 디렉터리`,
        paragraphs: [
          `${facts.label} 주소 단계를 다시 볼 때는 상위 ${withAndParticle(parentLabel)} ${facts.site.searchName} 순서를 확인합니다.`,
          `${facts.node.displayName} 다음에는 실제 도로명, 건물명, 출입 안내를 이어 준비하세요.`,
        ],
      },
    ];
  }
  const contextualNames = exactRegionNameList(contextual);
  return [
    ...sections,
    {
      id: leaf ? "related-region-directory" : "child-directory",
      heading: `${facts.label} ${contextualNames} ${leaf ? "같은 단계 지역 디렉터리" : "하위 주소 디렉터리"}`,
      paragraphs: [
        leaf
          ? `${withObjectParticle(facts.label)} 제외한 같은 단계 링크 중 ${contextualNames}부터 마지막 목록에서 확인합니다.`
          : `${facts.label}에서 바로 이어지는 ${contextualNames} 등 하위 지역을 마지막 목록에 표시합니다.`,
        leaf
          ? `${facts.label}의 관련 지역은 ${compactNames(related.map((item) => item.displayName), 8)}입니다.`
          : `${facts.label}의 하위 지역은 ${compactNames(related.map((item) => item.displayName), 8)}입니다.`,
      ],
    },
  ];
}

function indexEligibility(
  node: BabyRegionNode,
): Pick<
  RegionContent,
  "indexEligible" | "indexEligibilityReason" | "indexEligibilityTargetPath"
> {
  if (node.kind === "home") {
    return {
      indexEligible: true,
      indexEligibilityReason: "city-home",
      indexEligibilityTargetPath: null,
    };
  }
  if (node.kind === "district") {
    return {
      indexEligible: true,
      indexEligibilityReason: "regional-district",
      indexEligibilityTargetPath: null,
    };
  }
  return {
    indexEligible: true,
    indexEligibilityReason: "regional-leaf",
    indexEligibilityTargetPath: null,
  };
}

function createSections(facts: GraphFacts): ContentSection[] {
  if (facts.node.kind === "home") {
    return appendDirectory(naturalHomeSections(facts), facts, false);
  }
  if (facts.node.kind === "district") {
    return appendDirectory(naturalDistrictSections(facts), facts, false);
  }
  return appendDirectory(naturalLeafSections(facts), facts, true);
}

export function isRegionIndexEligible(
  node: BabyRegionNode,
  site: BabySiteConfig = ACTIVE_SITE,
): boolean {
  if (node.siteKey !== site.key) return false;
  return indexEligibility(node).indexEligible;
}

export function getIndexEligibleRegionNodes(
  site: BabySiteConfig = ACTIVE_SITE,
): readonly BabyRegionNode[] {
  return siteNodes(site).filter((node) => isRegionIndexEligible(node, site));
}

export function createRegionContent(
  node: BabyRegionNode,
  site: BabySiteConfig = ACTIVE_SITE,
): RegionContent {
  const facts = buildFacts(node, site);
  const sections = createSections(facts);
  const directory = sections.at(-1);
  if (!directory || !/directory$/u.test(directory.id)) {
    throw new Error(`BABY_CONTENT_DIRECTORY_NOT_LAST:${site.key}:${node.path}`);
  }
  if (sections.length < 10 || sections.length > 12) {
    throw new Error(`BABY_CONTENT_PATTERN_MISSING:${site.key}:${node.path}`);
  }
  const detailMode: RegionContent["detailMode"] =
    node.kind === "home"
      ? "root"
      : node.kind === "district"
        ? "district"
        : "leaf";
  const cityProfile = getCityFactProfile(site.key);
  const contextualNodes = linkedNeighborNodes(facts);
  const hasPeerRegions = contextualNodes.length > 0;
  const contextualNames = contextualNodes.length > 0
    ? exactRegionNameList(contextualNodes)
    : facts.parent?.displayName ?? site.searchName;
  const currentLegalNames = compactNames(facts.legalNames, 5);
  const directChildNames = exactRegionNameList(facts.children, 6);
  const description =
    node.kind === "home"
      ? `${facts.label} 출장마사지 지역 안내입니다. ${cityProfile.addressAxes.slice(0, 3).join("·")} 기준과 구·읍·면·동 주소 선택 순서를 확인합니다.`
      : node.kind === "representative"
        ? hasPeerRegions
          ? `${facts.label} 출장마사지 지역 안내입니다. 상위 ${facts.parent?.displayName ?? site.searchName}, 법정 지역 ${currentLegalNames}, 같은 목록의 ${contextualNames} 링크를 확인합니다.`
          : `${facts.label} 출장마사지 지역 안내입니다. 상위 ${facts.parent?.displayName ?? site.searchName}, 법정 지역 ${currentLegalNames}, 도로명·건물명 준비 항목을 확인합니다.`
        : `${facts.label} 출장마사지 지역 안내입니다. 직계 하위 ${directChildNames} 링크와 행정동·법정동 이름 차이를 확인합니다.`;

  return {
    title: `${facts.label} 출장마사지 | ${routeTypeLabel(node)} - ${site.brandName}`,
    description,
    keywords: [
      `${facts.label} 출장마사지`,
      `${facts.label} 출장안마`,
      `${facts.label} 지역 안내`,
      `${site.brandName} ${routeTypeLabel(node)}`,
      `${facts.label} 현장후불`,
    ],
    h1: `${facts.label} 출장마사지 ${routeTypeLabel(node)}`,
    eyebrow: `${site.brandName} · ${facts.parent?.displayName ?? site.searchName} · ${routeTypeLabel(node)}`,
    hooks:
      node.kind === "home"
        ? [
            cityProfile.paragraphs[0],
            `${cityProfile.addressAxes.join("·")} 가운데 가까운 기준과 실제 도로명주소를 함께 확인하세요.`,
          ]
        : node.kind === "representative"
          ? hasPeerRegions
            ? [
                `${facts.parent?.displayName ?? site.searchName} 아래에서 ${withAndParticle(node.displayName)} 법정 지역 ${withObjectParticle(currentLegalNames)} 함께 확인합니다.`,
                `${contextualNames} 실제 링크와 대조한 뒤 도로명주소를 준비하세요.`,
              ]
            : [
                `${facts.parent?.displayName ?? site.searchName} 아래에서 ${withAndParticle(node.displayName)} 법정 지역 ${withObjectParticle(currentLegalNames)} 함께 확인합니다.`,
                `${facts.label}에 맞는 도로명, 건물명, 출입 안내를 준비하세요.`,
              ]
          : [
              `${facts.label} 안의 ${directChildNames} 지역을 주소 순서에 맞춰 찾습니다.`,
              `${withObjectParticle(node.displayName)} 먼저 선택한 뒤 ${directChildNames} 링크와 실제 도로명주소를 확인하세요.`,
            ],
    sections,
    faqIntro:
      node.kind === "home"
        ? `${cityProfile.addressAxes
            .slice(0, 3)
            .join("·")} 등 공식 지역 자료의 기준점을 주소 확인에 활용하고, 코스·가격과 전화 준비사항은 고정 안내에서 이어서 볼 수 있습니다.`
        : node.kind === "representative"
          ? hasPeerRegions
            ? `${facts.label}의 ${currentLegalNames} 법정 지역과 ${contextualNames} 링크를 확인하고, 코스·가격과 이용 순서는 고정 안내에서 이어서 볼 수 있습니다.`
            : `${facts.label}의 ${currentLegalNames} 법정 지역과 도로명·건물명을 확인하고, 코스·가격과 이용 순서는 고정 안내에서 이어서 볼 수 있습니다.`
          : `${facts.label}의 ${directChildNames} 하위 지역을 확인하고, 코스·가격과 전화 준비사항은 고정 안내에서 이어서 볼 수 있습니다.`,
    childDirectory: {
      heading: directory.heading,
      intro: directory.paragraphs[0],
    },
    ctaLabels: ["전화로 일정 확인", "코스·가격 보기", "관련 지역 찾기"],
    officialSources: node.kind === "home" ? cityProfile.sources : [],
    detailMode,
    layoutSemantic:
      LAYOUT_SEMANTICS[siteIndex(site) % LAYOUT_SEMANTICS.length] ??
      "address-ledger",
    ...indexEligibility(node),
  };
}
