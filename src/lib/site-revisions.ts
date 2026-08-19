import type { BabyRegionNode } from "@/lib/regions";
import { CONTENT_RELEASED_AT } from "@/lib/metadata";

/**
 * Stable content revisions for sitemap lastmod. These are committed editorial
 * revisions, never build time, request time, file mtime, or Date.now(). Update
 * only the route group whose visible copy, metadata, schema, or links changed.
 */
export const SITE_CONTENT_REVISIONS = {
  home: "2026-08-20T02:14:17+09:00",
  district: "2026-08-20T02:14:17+09:00",
  representative: "2026-08-20T02:14:17+09:00",
  fixed: "2026-08-19T06:15:00+09:00",
  blogIndex: "2026-08-19T06:20:00+09:00",
} as const;

export type StableRouteGroup = keyof typeof SITE_CONTENT_REVISIONS;

const FIXED_ROUTES = new Set([
  "/areas/",
  "/pricing/",
  "/guide/",
  "/notice/",
]);

function normalizedRoute(route: string): string {
  if (route === "/") return route;
  return `/${route.replace(/^\/+|\/+$/gu, "")}/`;
}

export function getRegionContentModifiedAt(node: BabyRegionNode): string {
  return SITE_CONTENT_REVISIONS[node.kind];
}

export function getStableRouteGroup(
  route: string,
  node?: BabyRegionNode | null,
): StableRouteGroup {
  if (node) return node.kind;
  const normalized = normalizedRoute(route);
  if (normalized === "/") return "home";
  if (normalized === "/blog/") return "blogIndex";
  if (FIXED_ROUTES.has(normalized)) return "fixed";
  if (normalized.startsWith("/areas/")) return "representative";
  return "fixed";
}

export function getRouteContentModifiedAt(
  route: string,
  node?: BabyRegionNode | null,
): string {
  return SITE_CONTENT_REVISIONS[getStableRouteGroup(route, node)];
}

/** Compatibility alias for fixed pages whose first release is this revision. */
export const SITE_RELEASED_AT = CONTENT_RELEASED_AT;
