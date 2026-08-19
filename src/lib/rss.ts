import {
  createRegionContent,
  getIndexEligibleRegionNodes,
} from "@/lib/content";
import { getSiteOrigin, RSS_PATH } from "@/lib/metadata";
import { getRegionNodesForSite } from "@/lib/regions";
import { getRegionContentModifiedAt } from "@/lib/site-revisions";
import {
  ACTIVE_SITE,
  type BabySiteConfig,
} from "@/lib/site-config";

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

function homeFeedItem(site: BabySiteConfig): RssFeedItem {
  const regionalInventory = getRegionNodesForSite(site);
  const eligibleRegional = getIndexEligibleRegionNodes(site);
  const home = regionalInventory.find((node) => node.kind === "home");
  if (!home) throw new Error(`BABY_RSS_HOME_MISSING:${site.key}`);
  if (
    eligibleRegional.length !== regionalInventory.length ||
    !eligibleRegional.some((node) => node.path === home.path)
  ) {
    throw new Error(`BABY_RSS_REGIONAL_ELIGIBILITY:${site.key}`);
  }
  const content = createRegionContent(home, site);
  const link = new URL("/", getSiteOrigin(site)).href;
  const bodyText = [
    ...content.hooks,
    ...content.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
    ]),
  ].join("\n\n");
  const bodyHtml = `<article>${content.sections
    .map(
      (section) =>
        `<section><h2>${escapeXml(section.heading)}</h2>${section.paragraphs
          .map((paragraph) => `<p>${escapeXml(paragraph)}</p>`)
          .join("")}</section>`,
    )
    .join("")}</article>`;
  const revision = getRegionContentModifiedAt(home);
  return {
    title: content.h1,
    link,
    guid: link,
    category: `${site.searchName} 지역 안내`,
    summary: content.description,
    bodyText,
    bodyHtml,
    publishedAt: revision,
    modifiedAt: revision,
  };
}

export function createRssFeedItems(
  site: BabySiteConfig = ACTIVE_SITE,
): readonly RssFeedItem[] {
  return Object.freeze([Object.freeze(homeFeedItem(site))]);
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
    item.link !== new URL("/", origin).href ||
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
  if (items.length !== 1) {
    throw new Error(`BABY_RSS_EXACT_ITEM_COUNT:${site.key}:${items.length}`);
  }
  const item = items[0];
  if (!item) throw new Error(`BABY_RSS_EMPTY:${site.key}`);
  const origin = getSiteOrigin(site);
  const feedUrl = new URL(RSS_PATH, origin).href;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dcterms="http://purl.org/dc/terms/">',
    "  <channel>",
    `    <title>${escapeXml(`${site.brandName} ${site.searchName} 지역 안내`)}</title>`,
    `    <link>${escapeXml(item.link)}</link>`,
    `    <description>${escapeXml(`${site.searchName} 공식 지역 자료와 주소 선택 순서를 정리한 ${site.brandName} 안내`)}</description>`,
    "    <language>ko-KR</language>",
    `    <lastBuildDate>${escapeXml(toRfc822(item.modifiedAt))}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    renderItem(item, origin),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
