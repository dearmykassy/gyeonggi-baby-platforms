import type { Metadata } from "next";
import {
  ACTIVE_SITE,
  ALL_BABY_SITES,
  getSiteConfig,
  type BabySiteConfig,
  type BabySiteKey,
} from "@/lib/site-config";
import { getRegionNodesForSite } from "@/lib/regions";
import { createRouteMetadataContract, getSiteOrigin } from "@/lib/metadata";
import { getRegionImageSetForSite } from "@/lib/images";

export type BlogSection = {
  heading: string;
  paragraphs: readonly [string, string];
};

export type BlogPost = {
  siteKey: BabySiteKey;
  slug: string;
  category: string;
  title: string;
  description: string;
  keywords: readonly string[];
  publishedAt: string;
  modifiedAt: string;
  intro: string;
  sections: readonly BlogSection[];
  checklist: readonly string[];
  relatedSlug: string;
  image: {
    assetId: string;
    src: string;
    alt: string;
  };
};

type BlogVoice = {
  addressLabel: string;
  operationsLabel: string;
  readingStyle: string;
};

const BLOG_VOICE: BlogVoice = {
  addressLabel: "주소 확인 안내",
  operationsLabel: "코스와 현장 결제 안내",
  readingStyle: "주소부터 차례로 확인하는",
};

function indexOfSite(site: BabySiteConfig): number {
  const index = ALL_BABY_SITES.findIndex((candidate) => candidate.key === site.key);
  if (index < 0) throw new Error(`BABY_BLOG_UNKNOWN_SITE:${site.key}`);
  return index;
}

function voiceFor(site: BabySiteConfig): BlogVoice {
  indexOfSite(site);
  return BLOG_VOICE;
}

function editorialDate(site: BabySiteConfig, day: 17 | 18): string {
  const index = indexOfSite(site);
  const hour = 8 + Math.floor(index / 12);
  const minute = (index * 7 + (day === 18 ? 3 : 0)) % 60;
  return `2026-08-${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`;
}

function directRegionSummary(site: BabySiteConfig): {
  count: number;
  names: string;
  kind: string;
} {
  const nodes = getRegionNodesForSite(site);
  const home = nodes.find((node) => node.kind === "home");
  if (!home) throw new Error(`BABY_BLOG_HOME_MISSING:${site.key}`);
  const children = nodes.filter((node) => node.parentPath === home.path);
  return {
    count: children.length,
    names: children.slice(0, 6).map((node) => node.displayName).join("·"),
    kind: site.counts.districtHubs > 0 ? "구 지역 안내" : "대표 지역",
  };
}

export function getBlogPosts(
  site: BabySiteConfig = ACTIVE_SITE,
): readonly BlogPost[] {
  const voice = voiceFor(site);
  const branch = directRegionSummary(site);
  const editorialImages = getRegionImageSetForSite(site.key, "/");
  const firstSlug = `${site.key}-address-call-note`;
  const secondSlug = `${site.key}-course-onsite-check`;
  const firstDate = editorialDate(site, 17);
  const secondDate = editorialDate(site, 18);

  const first: BlogPost = {
    siteKey: site.key,
    slug: firstSlug,
    category: `${site.searchName} 전화 준비`,
    title: `${site.searchName} 지역 경로를 전화 메모로 옮기는 ${voice.addressLabel}`,
    description: `${site.searchName} 출장마사지 문의 전에 실제 지역 계층, 도로명·건물명, 희망 날짜와 시각을 ${voice.readingStyle} 방법으로 정리합니다.`,
    keywords: [
      `${site.searchName} 출장마사지 전화 준비`,
      `${site.searchName} 주소 메모`,
      `${site.searchName} 출장안마 일정 확인`,
      `${site.brandName} ${voice.addressLabel}`,
    ],
    publishedAt: firstDate,
    modifiedAt: firstDate,
    intro: `${site.brandName}의 ${voice.addressLabel}: ${site.searchName} 안에서 지역 카드를 고른 뒤 상세 주소와 일정을 전화에 맞게 정리하는 글입니다. ${branch.kind} 수와 실제 이름을 기준으로 설명하고, 공개 화면에 둘 정보와 통화에서 전할 정보를 구분합니다.`,
    sections: [
      {
        heading: `${branch.count}개 직계 경로부터 주소 좁히기`,
        paragraphs: [
          `${site.searchName} 홈에서 바로 이어지는 ${branch.kind} 경로는 ${branch.count}개입니다. 앞쪽 이름은 ${branch.names}${branch.count > 6 ? " 외 항목" : ""}입니다. 다른 시·군의 지역 경로는 이 사이트에 섞지 않습니다.`,
          `${voice.readingStyle} 순서에서는 먼저 직계 카드를 고르고, 구가 있는 지역은 구 지역 안내를 거쳐 동 페이지로 이동합니다. 구가 없는 지역은 홈에서 동·읍·면 페이지로 바로 이동합니다.`,
        ],
      },
      {
        heading: `${voice.addressLabel}에서 상세 주소 분리하기`,
        paragraphs: [
          `행정 지역은 ${site.searchName}부터 현재 동·읍·면까지 화면에서 확인합니다. 이어서 도로명, 건물 번호, 건물명을 적어 지역 카드 이름과 구분합니다.`,
          `${voice.addressLabel}에는 동·호수나 출입에 필요한 민감한 위치를 공개 입력란에 남기지 않습니다. 해당 내용은 받을 지역을 고른 뒤 전화상담에서 이어서 전달합니다.`,
        ],
      },
      {
        heading: `날짜·시각과 코스 이용 시간 구분하기`,
        paragraphs: [
          `${site.searchName} 문의 날짜와 희망 시작 시각을 먼저 적습니다. 코스의 60·90·120분은 별도의 이용 시간으로 확인해 같은 숫자라도 뜻이 다르다는 점을 구분합니다.`,
          `${voice.readingStyle} 메모에서는 주소, 날짜·시각, 인원, 코스·시간 순서가 유지됩니다. 실제 방문 가능 여부와 일정은 상세 주소를 알린 뒤 24시간 전화상담에서 확인합니다.`,
        ],
      },
      {
        heading: `통화 끝에 ${voice.addressLabel} 다시 읽기`,
        paragraphs: [
          `${site.brandName}에 전화할 때 준비한 네 묶음을 차례로 읽고 현금 또는 무선 카드 단말기 중 현장 결제 방법을 확인합니다. 별도 예약금이나 선입금 없이 관리 뒤 결제하는 기준도 함께 대조합니다.`,
          `통화 중 ${site.searchName} 안의 주소나 일정이 바뀌면 이전 값을 지우기 전에 새 값을 따로 적습니다. 마무리에는 변경된 항목만 다시 읽어 첫 메모와 상담 답변을 맞춥니다.`,
        ],
      },
    ],
    checklist: [
      `${site.searchName} 안의 선택 지역 경로`,
      "도로명·건물 번호·건물명",
      "희망 날짜와 시작 시각",
      "이용 인원과 코스·시간",
      `통화 끝의 ${voice.addressLabel} 재확인`,
    ],
    relatedSlug: secondSlug,
    image: {
      assetId: editorialImages.bodyA.desktop.split("/").at(-2) ?? `${site.key}-body-a`,
      src: editorialImages.bodyA.desktop,
      alt: `${site.searchName} 주소와 일정을 휴대전화로 확인하는 완전 착의 성인 여성 마사지사`,
    },
  };

  const second: BlogPost = {
    siteKey: site.key,
    slug: secondSlug,
    category: `${site.searchName} 코스 확인`,
    title: `${site.searchName} 코스 선택에서 현장 후불까지 잇는 ${voice.operationsLabel}`,
    description: `${site.searchName} 출장마사지의 5개 코스·14개 가격 행, 2인 프로그램, 현금·카드 현장 후불과 비품·소독 기준을 ${voice.operationsLabel}로 확인합니다.`,
    keywords: [
      `${site.searchName} 출장마사지 가격`,
      `${site.searchName} 2인 마사지`,
      `${site.searchName} 현장 후불`,
      `${site.brandName} ${voice.operationsLabel}`,
    ],
    publishedAt: secondDate,
    modifiedAt: secondDate,
    intro: `${site.brandName}의 ${voice.operationsLabel}: 코스명과 이용 시간을 가격표의 한 행으로 맞추고, 인원과 결제 방법, 비품·소독 기준까지 전화에서 확인하는 글입니다. ${site.searchName} 주소를 정한 뒤 사용할 수 있는 운영 사실만 다룹니다.`,
    sections: [
      {
        heading: `다섯 코스와 14개 가격 행 연결하기`,
        paragraphs: [
          `${site.searchName} 문의에서 고를 코스는 타이·아로마·힐링·스페셜·남성전용 다섯 가지입니다. 일반 네 코스는 60·90·120분, 남성전용은 60·90분으로 모두 14개 가격 행입니다.`,
          `${voice.operationsLabel}에는 코스명과 이용 시간을 같은 줄에 적습니다. 두 값이 만나는 공개 가격표의 한 행을 찾아 금액을 옮기고, 표에 없는 조합을 임의로 만들지 않습니다.`,
        ],
      },
      {
        heading: `2인 프로그램을 사람별 두 줄로 확인하기`,
        paragraphs: [
          `${site.searchName}의 한 주소에서 두 사람이 이용하려면 전화 첫 부분에 2인 동시 관리 문의라고 알립니다. 공통 주소와 희망 일정은 한 번 적고 코스와 이용 시간은 사람별로 나눕니다.`,
          `${voice.readingStyle} 방식으로 첫 번째 사람과 두 번째 사람의 가격 행을 각각 대조합니다. 같은 코스를 선택해도 이용 시간이 다르면 서로 다른 행으로 기록합니다.`,
        ],
      },
      {
        heading: `${voice.operationsLabel}에 현장 결제 붙이기`,
        paragraphs: [
          `${site.brandName}은 사전 예약금이나 선입금 없이 관리를 마친 뒤 현장에서 결제하는 기준을 사용합니다. 현금과 무선 카드 단말기 중 사용할 방법은 전화상담에서 확인합니다.`,
          `${site.searchName} 주소, 일정, 인원, 코스·시간을 확인한 다음 결제 방법을 마지막 줄에 둡니다. 선택이 바뀌면 이전 방법과 새 방법을 구분해 통화가 끝나기 전에 다시 알립니다.`,
        ],
      },
      {
        heading: `비품과 관리 전후 소독까지 마무리하기`,
        paragraphs: [
          `${voice.operationsLabel}의 마지막 묶음은 일회용 비품 사용과 관리 전후 소독입니다. 두 사람이 이용할 때도 운영 기준을 각각 확인할 수 있도록 인원 항목 다음에 둡니다.`,
          `${site.searchName} 지역 경로와 코스 가격을 확인했다고 해서 현재 일정까지 자동으로 확정되는 것은 아닙니다. 방문 가능 여부와 선택한 항목은 24시간 전화상담에서 최종 확인합니다.`,
        ],
      },
    ],
    checklist: [
      "사람별 코스명과 이용 시간",
      "14개 가격 행 가운데 선택한 행",
      `${site.searchName}의 한 장소와 이용 인원`,
      "현금 또는 무선 카드 현장 결제",
      `${voice.operationsLabel}의 비품·소독 항목`,
    ],
    relatedSlug: firstSlug,
    image: {
      assetId: editorialImages.bodyB.desktop.split("/").at(-2) ?? `${site.key}-body-b`,
      src: editorialImages.bodyB.desktop,
      alt: `${site.searchName} 코스와 현장 결제 항목을 정리하는 완전 착의 성인 여성 마사지사`,
    },
  };

  return Object.freeze([
    Object.freeze(first),
    Object.freeze(second),
  ]);
}

export const BLOG_POSTS = getBlogPosts(ACTIVE_SITE);

export function findBlogPost(
  slug: string,
  site: BabySiteConfig = ACTIVE_SITE,
): BlogPost | undefined {
  return getBlogPosts(site).find((candidate) => candidate.slug === slug);
}

export function getBlogPost(
  slug: string,
  site: BabySiteConfig = ACTIVE_SITE,
): BlogPost {
  const post = findBlogPost(slug, site);
  if (!post) throw new Error(`BABY_BLOG_POST_NOT_FOUND:${site.key}:${slug}`);
  return post;
}

export function getBlogPostPath(post: Pick<BlogPost, "slug">): string {
  return `/blog/${post.slug}/`;
}

export function createBlogMetadata(post: BlogPost): Metadata {
  const site = getSiteConfig(post.siteKey);
  const path = getBlogPostPath(post);
  const url = new URL(path, getSiteOrigin(site)).href;
  const title = `${post.title} | ${site.brandName}`;
  const routeContract = createRouteMetadataContract(
    path,
    title,
    post.description,
    post.keywords,
    site,
    false,
  );
  return {
    title: { absolute: title },
    description: post.description,
    keywords: [...post.keywords],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      siteName: site.brandName,
      title,
      description: post.description,
      url,
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
    },
    twitter: {
      card: "summary",
      title,
      description: post.description,
    },
    robots: routeContract.robots,
  };
}
