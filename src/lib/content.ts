import {
  getCityFactProfile,
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
    | "deferred-district-route"
    | "deferred-regional-route";
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
  return {
    ...section,
    heading: `${facts.label} ${section.heading}`,
  };
}

function mergedNameExplanation(nodes: readonly BabyRegionNode[]): string {
  const examples = nodes.slice(0, 4).map((node) => {
    const names = sourceAliases(node);
    return names.length > 0
      ? `${compactNames(names, 5)}은 ${node.displayName} 안내에서 함께 찾을 수 있습니다.`
      : `${node.displayName}은 표시 이름 그대로 찾을 수 있습니다.`;
  });
  if (nodes.length > 4) {
    examples.push(
      `나머지 ${nodes.length - 4}개 지역도 같은 방식으로 대표 이름에 연결합니다.`,
    );
  }
  return examples.join(" ");
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
      heading: `${profile.addressAxes.slice(0, 2).join("와 ")} 주소 확인 뒤 볼 안내`,
      paragraphs: [
        `${profile.addressAxes[0]} 또는 ${profile.addressAxes[1]} 쪽 주소를 정했다면 코스별 시간과 금액은 코스·가격 페이지에서 확인할 수 있습니다.`,
        "전화 전에 준비할 항목과 현장 후불 기준은 이용 방법 페이지에 따로 정리돼 있습니다. 같은 가격표와 절차를 지역 본문마다 반복하지 않습니다.",
      ],
    },
  ];
}

function naturalDistrictSections(facts: GraphFacts): ContentSection[] {
  const {
    node,
    site,
    children,
    parent,
    siblings,
    siblingIndex,
    aliases,
    legalNames,
    cityDistricts,
    cityLeaves,
    directCityLeaves,
    nestedCityLeaves,
    mergedChildren,
    aliasedChildren,
    multiLegalChildren,
  } = facts;
  const label = facts.label;
  const childNames = children.map((child) => child.displayName);
  const parentLabel = parent ? qualifiedName(parent, site) : site.searchName;
  const typeProfile = childTypeProfile(children);
  const addressOrder = `${site.searchName} → ${node.segments.join(" → ")}`;
  const namedMergedChildren = mergedChildren.filter(
    (child) => child.kind === "representative",
  );
  const namedAliasedChildren = aliasedChildren.filter(
    (child) => child.kind === "representative",
  );
  const namedMultiLegalChildren = multiLegalChildren.filter(
    (child) => child.kind === "representative",
  );
  const drafts: DraftSection[] = [
    {
      id: "address-boundary",
      heading: "이 페이지에서 이어지는 지역",
      paragraphs: [
        `${label} 페이지에서 바로 열 수 있는 하위 지역은 ${children.length}개입니다. 화면에 표시된 읍·면·동 이름을 선택하면 해당 지역 안내로 이동합니다.`,
        `지역 이름은 ${compactNames(childNames, 12)}이며, 전체 링크는 페이지 마지막 지역 목록에서 확인할 수 있습니다.`,
      ],
    },
    {
      id: "route-depth",
      heading: "구와 동을 차례로 확인하는 주소 순서",
      paragraphs: [
        `${label}은 ${addressOrder} 순서로 찾습니다. 현재 구 이름과 다음 읍·면·동 이름을 차례로 확인하세요.`,
        "구 페이지를 먼저 연 뒤 해당 읍·면·동을 선택합니다. 구를 건너뛴 별도 주소 페이지는 만들지 않습니다.",
      ],
    },
    {
      id: "branch-types",
      heading: typeProfile.label,
      paragraphs: [
        `${label}의 직계 지역은 ${nodeTypeSummary(children)}로 구성됩니다. ${typeProfile.sentence}`,
        "화면에 표시된 행정 단계만 선택하면 다음 지역 페이지로 이동합니다.",
      ],
    },
    {
      id: "source-aliases",
      heading:
        namedMergedChildren.length > 0 || aliases.length > 0
          ? "여러 행정동 이름을 함께 찾는 방법"
          : "표시 이름과 행정동 이름 확인",
      paragraphs: [
        namedMergedChildren.length > 0
          ? mergedNameExplanation(namedMergedChildren)
          : "이 단계의 하위 지역은 표시된 행정동 이름으로 각각 찾을 수 있습니다.",
        namedAliasedChildren.length > 0
          ? `표시 이름 외에 함께 확인할 행정동 이름이 있는 하위 지역은 ${namedAliasedChildren.length}개입니다. 주소가 다르게 보이면 상위 지역 이름을 함께 확인하세요.`
          : "지역 카드에 표시된 읍·면·동 이름을 실제 주소와 맞춰 확인하세요.",
      ],
    },
    {
      id: "legal-area-map",
      heading:
        namedMultiLegalChildren.length > 0 || legalNames.length > 1
          ? "행정동과 법정동 이름이 다른 경우"
          : "행정동과 법정동 이름 맞추기",
      paragraphs: [
        namedMultiLegalChildren.length > 0
          ? `법정동 이름을 둘 이상 포함한 하위 지역은 ${namedMultiLegalChildren.length}개입니다. 행정동 이름과 도로명주소의 법정동 이름이 다를 수 있습니다.`
          : "하위 지역마다 확인된 법정동 이름을 함께 연결해 주소 이름 차이를 확인할 수 있습니다.",
        "전화할 때는 지역 카드 이름만 말하기보다 실제 도로명주소와 건물명을 함께 전달하세요.",
      ],
    },
    {
      id: "city-scope",
      heading: "도시 안에서 연결되는 지역",
      paragraphs: [
        `${site.searchName}에는 구 페이지 ${cityDistricts.length}개가 있고, 각 구 아래에 읍·면·동 지역 페이지 ${cityLeaves.length}개가 연결됩니다.`,
        `홈에서 바로 이어지는 읍·면·동은 ${directCityLeaves.length}개이고 구를 거쳐 이어지는 읍·면·동은 ${nestedCityLeaves.length}개입니다. 다른 시·군 주소는 포함하지 않습니다.`,
      ],
    },
    {
      id: "reservation-address",
      heading: "전화 전에 준비할 주소",
      paragraphs: [
        `${label}에서 이용할 행정동 또는 법정동, 도로명, 건물명을 순서대로 준비하세요. 숙소라면 건물명과 출입 안내도 함께 확인합니다.`,
        "공개 지역 페이지는 읍·면·동까지만 안내합니다. 실제 방문 가능 여부는 세부 주소와 희망 시각을 전화로 확인한 뒤 정해집니다.",
      ],
    },
    {
      id: "fixed-guide-handoff",
      heading: "지역을 고른 뒤 가격과 이용 방법 확인",
      paragraphs: [
        "지역 페이지에는 같은 가격표를 반복하지 않습니다. 코스별 시간과 금액은 코스·가격 페이지에서 확인할 수 있습니다.",
        `${label} 주소를 정한 뒤 전화 전 준비사항과 현장 후불 기준은 이용 방법 페이지에서 이어서 확인하세요.`,
      ],
    },
    {
      id: "sibling-context",
      heading: "같은 도시의 다른 구 찾기",
      paragraphs: [
        `${node.displayName}은 ${parentLabel}의 구 목록 ${siblings.length}개 중 ${siblingIndex + 1}번째입니다. 같은 단계 구는 ${compactNames(siblings.map((item) => item.displayName), 8)}입니다.`,
        `현재 구가 아니라면 상위 ${site.searchName} 홈으로 돌아가 다른 구를 선택하세요.`,
      ],
    },
    {
      id: "city-directory-purpose",
      heading: "지역 목록에서 주소 다시 찾기",
      paragraphs: [
        `페이지 마지막 목록은 ${label}에서 바로 이어지는 ${children.length}개 지역 링크를 제공합니다.`,
        "주소가 어느 지역에 속하는지 확실하지 않다면 도로명주소의 시·구·읍·면·동 순서를 먼저 확인하세요.",
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
    siblingIndex,
    previous,
    next,
    aliases,
    legalNames,
    cityDistricts,
    cityLeaves,
  } = facts;
  const label = facts.label;
  const parentLabel = parent ? qualifiedName(parent, site) : site.searchName;
  const type = localType(node);
  const drafts: DraftSection[] = [
    {
      id: "parent-hierarchy",
      heading: "상위 지역과 현재 주소 단계",
      paragraphs: [
        `${node.displayName}의 바로 위 지역은 ${parentLabel}입니다. 전체 순서는 ${[site.searchName, ...node.segments].join(" → ")}입니다.`,
        node.segments.length === 2
          ? `${node.segments[0]} 구 페이지를 거쳐 현재 ${type} 지역 페이지로 이동합니다.`
          : `${site.searchName} 홈에서 현재 ${type} 지역 페이지로 바로 이동합니다.`,
      ],
    },
    {
      id: "sibling-scope",
      heading: "같은 단계 지역 범위",
      paragraphs: [
        `${parentLabel} 아래에는 현재 지역을 포함한 지역 페이지 ${siblings.length}개가 있습니다.`,
        `같은 단계 지역은 ${compactNames(siblings.map((item) => item.displayName), 10)}이며 다른 시·군 주소는 포함하지 않습니다.`,
      ],
    },
    {
      id: "adjacent-routes",
      heading: "앞뒤 지역 링크",
      paragraphs: [
        `${node.displayName}은 같은 단계 ${siblings.length}개 중 ${siblingIndex + 1}번째입니다. 앞 지역은 ${previous?.displayName ?? "없음"}, 다음 지역은 ${next?.displayName ?? "없음"}입니다.`,
        `주소를 다시 찾을 때 앞뒤 링크 또는 상위 ${parentLabel} 링크를 이용할 수 있습니다.`,
      ],
    },
    {
      id: "source-aliases",
      heading: "표시 이름과 함께 확인할 행정동",
      paragraphs: [
        aliases.length > 0
          ? `${node.displayName} 지역 페이지에는 ${compactNames(aliases, 8)} 이름이 함께 연결됩니다.`
          : `${node.displayName}은 별도 병합 명칭 없이 현재 표시 이름으로 확인됩니다.`,
        `검색한 동 이름과 현재 카드 이름이 다르면 상위 ${parentLabel}과 법정동 이름을 함께 확인하세요.`,
      ],
    },
    {
      id: "legal-area-map",
      heading: "법정동 이름으로 주소 확인",
      paragraphs: [
        `현재 지역 페이지에서 확인되는 법정동 이름은 ${compactNames(legalNames, 8)}입니다.`,
        "행정동과 도로명주소의 법정동 이름이 다를 수 있으므로 전화할 때는 실제 도로명과 건물명을 전달하세요.",
      ],
    },
    {
      id: "route-type",
      heading: `${type} 지역 페이지 이용 범위`,
      paragraphs: [
        `${node.displayName}은 ${type} 단위 지역 페이지이며 그 아래 도로명·건물명 페이지는 만들지 않습니다.`,
        "세부 주소별 방문 가능 여부는 공개 목록이 아니라 전화상담에서 확인합니다.",
      ],
    },
    {
      id: "city-scope",
      heading: `${site.searchName} 안에서 연결되는 지역`,
      paragraphs: [
        `${site.searchName}에는 구 페이지 ${cityDistricts.length}개와 읍·면·동 지역 페이지 ${cityLeaves.length}개가 있습니다.`,
        `${label}의 관련 링크는 ${site.searchName} 안의 상위 지역과 같은 단계 지역으로만 이어집니다.`,
      ],
    },
    {
      id: "reservation-address",
      heading: "예약 전에 확인할 세부 주소",
      paragraphs: [
        `${label}에 해당하는지 확인한 뒤 도로명, 건물명, 출입 안내를 준비하세요.`,
        "지역 이름만으로 방문을 확정하지 않으며 세부 주소와 희망 시각을 전화로 확인합니다.",
      ],
    },
    {
      id: "fixed-guide-handoff",
      heading: "가격과 이용 방법은 고정 안내에서 확인",
      paragraphs: [
        "코스별 시간과 금액은 코스·가격 페이지, 전화 전 준비사항은 이용 방법 페이지에서 확인할 수 있습니다.",
        "같은 표와 절차를 지역마다 반복하지 않고 필요한 안내 페이지로 연결합니다.",
      ],
    },
    {
      id: "related-route-purpose",
      heading: "주소가 다를 때 지역 다시 찾기",
      paragraphs: [
        `현재 주소가 ${node.displayName}이 아니라면 상위 ${parentLabel} 또는 같은 단계 지역 목록으로 돌아가세요.`,
        "지역 목록에는 현재 페이지를 제외한 관련 지역이 실제 링크로 제공됩니다.",
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
  return [
    ...sections,
    {
      id: leaf ? "related-region-directory" : "child-directory",
      heading: `${facts.label} ${leaf ? "같은 단계 지역 디렉터리" : "하위 주소 디렉터리"}`,
      paragraphs: [
        leaf
          ? `현재 페이지를 제외한 같은 단계 지역 ${related.length}개를 마지막 목록에서 확인합니다.`
          : `현재 페이지에서 바로 이어지는 하위 지역 ${related.length}개를 마지막 목록에 표시합니다.`,
        leaf
          ? `관련 지역은 ${compactNames(related.map((item) => item.displayName), 8)}입니다.`
          : `하위 지역은 ${compactNames(related.map((item) => item.displayName), 8)}입니다.`,
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
      indexEligible: false,
      indexEligibilityReason: "deferred-district-route",
      indexEligibilityTargetPath: "/",
    };
  }
  return {
    indexEligible: false,
    indexEligibilityReason: "deferred-regional-route",
    indexEligibilityTargetPath: node.parentPath ?? "/",
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
  const description =
    node.kind === "home"
      ? `${facts.label} 출장마사지 지역 안내입니다. ${cityProfile.addressAxes.slice(0, 3).join("·")} 기준과 구·읍·면·동 주소 선택 순서를 확인합니다.`
      : node.kind === "representative"
        ? `${facts.label} 출장마사지 지역 안내입니다. 상위 ${facts.parent?.displayName ?? site.searchName}, 같은 단계 지역 ${facts.siblings.length}개와 행정동·법정동 이름을 확인합니다.`
        : `${facts.label} 출장마사지 지역 안내입니다. 직계 하위 지역 ${facts.children.length}개와 주소 선택 순서, 행정동·법정동 이름 차이를 확인합니다.`;

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
    eyebrow: `${site.brandName} · ${routeTypeLabel(node)}`,
    hooks:
      node.kind === "home"
        ? [
            cityProfile.paragraphs[0],
            `${cityProfile.addressAxes.join("·")} 가운데 가까운 기준과 실제 도로명주소를 함께 확인하세요.`,
          ]
        : node.kind === "representative"
          ? [
              `${facts.parent?.displayName ?? site.searchName} 아래에서 ${node.displayName} 주소를 확인합니다.`,
              `같은 단계 지역 ${facts.siblings.length}개와 실제 도로명주소를 함께 비교하세요.`,
            ]
          : [
              `${facts.label} 안의 읍·면·동을 주소 순서에 맞춰 찾습니다.`,
              "현재 구를 먼저 선택한 뒤 세부 지역과 실제 도로명주소를 확인하세요.",
            ],
    sections,
    faqIntro:
      node.kind === "home"
        ? `${cityProfile.addressAxes
            .slice(0, 3)
            .join("·")} 등 공식 지역 자료의 기준점을 주소 확인에 활용하고, 코스·가격과 전화 준비사항은 고정 안내에서 이어서 볼 수 있습니다.`
        : node.kind === "representative"
          ? `${facts.label}의 상위 지역과 같은 단계 주소를 확인하고, 코스·가격과 이용 순서는 고정 안내 페이지에서 이어서 볼 수 있습니다.`
          : `${facts.label}의 하위 지역과 주소 선택 순서를 확인하고, 코스·가격과 전화 준비사항은 고정 안내 페이지에서 이어서 볼 수 있습니다.`,
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
