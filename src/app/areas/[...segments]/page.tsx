import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { RegionPage } from "@/components/region-page";
import { toBreadcrumbItems, toDirectoryItems } from "@/components/view-model";
import { createRegionContent } from "@/lib/content";
import { createRegionMetadataContract, toNextMetadata } from "@/lib/metadata";
import { createRegionPageJsonLd } from "@/lib/region-schema";
import {
  getNodeBySegments,
  getRegionBreadcrumbs,
  getRegionChildren,
  getRegionParent,
  getRegionStaticParams,
} from "@/lib/regions";
import { ACTIVE_SITE } from "@/lib/site-config";

type RegionRouteProps = {
  params: Promise<{ segments: string[] }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getRegionStaticParams();
}

export async function generateMetadata({ params }: RegionRouteProps): Promise<Metadata> {
  const { segments } = await params;
  const node = getNodeBySegments(segments);
  if (!node) return {};
  return toNextMetadata(createRegionMetadataContract(node));
}

export default async function RegionRoutePage({ params }: RegionRouteProps) {
  const { segments } = await params;
  const node = getNodeBySegments(segments);
  if (!node) notFound();
  const content = createRegionContent(node);
  const children = getRegionChildren(node);
  const parent = getRegionParent(node);
  const related = children.length
    ? children
    : parent
      ? getRegionChildren(parent).filter((candidate) => candidate.path !== node.path)
      : [];

  return (
    <>
      <JsonLd data={createRegionPageJsonLd(node)} />
      <RegionPage
        breadcrumbs={toBreadcrumbItems(getRegionBreadcrumbs(node))}
        content={content}
        directoryItems={toDirectoryItems(related)}
        layoutVariant={ACTIVE_SITE.layoutVariant}
        regionName={node.qualifiedName}
        regionPath={node.path}
      />
    </>
  );
}
