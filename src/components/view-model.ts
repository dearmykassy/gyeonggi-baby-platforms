import type { BreadcrumbItem, DirectoryItem } from "@/components/content-blocks";
import type { SearchItem } from "@/components/site-search";
import type { BabyRegionNode, RegionBreadcrumb } from "@/lib/regions";

export function toDirectoryItems(nodes: readonly BabyRegionNode[]): DirectoryItem[] {
  return nodes.map((node) => ({
    href: node.path,
    label: node.displayName,
    context: node.kind === "district"
      ? `대표 지역 ${node.representativeCount}개`
      : node.qualifiedName,
  }));
}

export function toSearchItems(nodes: readonly BabyRegionNode[]): SearchItem[] {
  return nodes.map((node) => ({
    href: node.path,
    label: node.displayName,
    context: node.qualifiedName,
  }));
}

export function toBreadcrumbItems(
  breadcrumbs: readonly RegionBreadcrumb[],
): BreadcrumbItem[] {
  return breadcrumbs
    .slice(1)
    .map((breadcrumb) => ({ href: breadcrumb.path, label: breadcrumb.displayName }));
}
