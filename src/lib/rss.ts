import {
  getBlogPostPath,
  getBlogPosts,
  type BlogPost,
} from "@/data/blog-posts";
import {
  ACTIVE_SITE,
  type BabySiteConfig,
} from "@/lib/site-config";
import { getSiteOrigin, RSS_PATH } from "@/lib/metadata";

export type RssFeedItem = {
  title: string;
  link: string;
  guid: string;
  category: string;
  summary: string;
  bodyText: string;
  bodyHtml: string;
  publishedAt: string;
  modifiedAt: string;
};

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function getFullPostText(post: BlogPost): string {
  return [
    post.intro,
    ...post.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
    ]),
    "전화 전에 확인할 메모",
    ...post.checklist,
  ].join("\n\n");
}

export function getFullPostHtml(post: BlogPost): string {
  const sections = post.sections
    .map(
      (section) =>
        `<section><h2>${escapeXml(section.heading)}</h2>${section.paragraphs
          .map((paragraph) => `<p>${escapeXml(paragraph)}</p>`)
          .join("")}</section>`,
    )
    .join("");
  const checklist = post.checklist
    .map((item) => `<li>${escapeXml(item)}</li>`)
    .join("");
  return `<article><p>${escapeXml(post.intro)}</p>${sections}<section><h2>전화 전에 확인할 메모</h2><ul>${checklist}</ul></section></article>`;
}

export function createRssFeedItems(
  site: BabySiteConfig = ACTIVE_SITE,
): readonly RssFeedItem[] {
  const origin = getSiteOrigin(site);
  const items = getBlogPosts(site).map((post) => {
    const link = new URL(getBlogPostPath(post), origin).href;
    return {
      title: post.title,
      link,
      guid: link,
      category: post.category,
      summary: post.description,
      bodyText: getFullPostText(post),
      bodyHtml: getFullPostHtml(post),
      publishedAt: post.publishedAt,
      modifiedAt: post.modifiedAt,
    };
  });
  if (items.length !== 2) {
    throw new Error(`BABY_RSS_EDITORIAL_ITEM_COUNT:${site.key}:${items.length}`);
  }
  return Object.freeze(
    [...items].sort(
      (left, right) =>
        Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt) ||
        left.link.localeCompare(right.link),
    ),
  );
}

export const RSS_FEED_ITEMS = createRssFeedItems(ACTIVE_SITE);

function toRfc822(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`BABY_RSS_INVALID_DATE:${value}`);
  }
  return date.toUTCString();
}

function cdata(value: string): string {
  return value.replaceAll("]]>", "]]]]><![CDATA[>");
}

function renderItem(item: RssFeedItem, origin: string): string {
  if (
    new URL(item.link).origin !== origin ||
    item.link !== item.guid ||
    Date.parse(item.modifiedAt) < Date.parse(item.publishedAt)
  ) {
    throw new Error(`BABY_RSS_ITEM_CONTRACT:${item.link}`);
  }
  return [
    "    <item>",
    `      <title>${escapeXml(item.title)}</title>`,
    `      <link>${escapeXml(item.link)}</link>`,
    `      <description>${escapeXml(item.summary)}</description>`,
    `      <content:encoded><![CDATA[${cdata(item.bodyHtml)}]]></content:encoded>`,
    `      <category>${escapeXml(item.category)}</category>`,
    `      <pubDate>${escapeXml(toRfc822(item.publishedAt))}</pubDate>`,
    `      <dcterms:modified>${escapeXml(item.modifiedAt)}</dcterms:modified>`,
    `      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`,
    "    </item>",
  ].join("\n");
}

export function createRssXml(
  site: BabySiteConfig = ACTIVE_SITE,
  items: readonly RssFeedItem[] = createRssFeedItems(site),
): string {
  if (items.length !== 2) {
    throw new Error(`BABY_RSS_EXACT_ITEM_COUNT:${site.key}:${items.length}`);
  }
  const first = items[0];
  if (!first) throw new Error(`BABY_RSS_EMPTY:${site.key}`);
  const lastBuildDate = items.reduce(
    (latest, item) =>
      Date.parse(item.modifiedAt) > Date.parse(latest)
        ? item.modifiedAt
        : latest,
    first.modifiedAt,
  );
  const origin = getSiteOrigin(site);
  const feedUrl = new URL(RSS_PATH, origin).href;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dcterms="http://purl.org/dc/terms/">',
    "  <channel>",
    `    <title>${escapeXml(`${site.brandName} 지역 이용 글`)}</title>`,
    `    <link>${escapeXml(new URL("/", origin).href)}</link>`,
    `    <description>${escapeXml(`${site.brandName}가 ${site.searchName} 주소 확인과 코스 이용 순서를 직접 정리한 글`)}</description>`,
    "    <language>ko-KR</language>",
    `    <lastBuildDate>${escapeXml(toRfc822(lastBuildDate))}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...items.map((item) => renderItem(item, origin)),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
