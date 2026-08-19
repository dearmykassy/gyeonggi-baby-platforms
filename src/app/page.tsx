import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { Template11Home } from "@/components/template11-home";
import { toDirectoryItems } from "@/components/view-model";
import { createRegionContent } from "@/lib/content";
import { createRegionMetadataContract, toNextMetadata } from "@/lib/metadata";
import { createRegionPageJsonLd } from "@/lib/region-schema";
import { getNodeBySegments, getRegionChildren } from "@/lib/regions";
import { ACTIVE_SITE } from "@/lib/site-config";

function homeNode() {
  const node = getNodeBySegments([]);
  if (!node) throw new Error(`BABY_HOME_NODE_MISSING:${ACTIVE_SITE.key}`);
  return node;
}

export function generateMetadata(): Metadata {
  return toNextMetadata(createRegionMetadataContract(homeNode()));
}

export default function HomePage() {
  const node = homeNode();
  const content = createRegionContent(node);
  return (
    <>
      <JsonLd data={createRegionPageJsonLd(node)} />
      <Template11Home
        brandName={ACTIVE_SITE.brandName}
        cityName={ACTIVE_SITE.searchName}
        content={content}
        designProfile={ACTIVE_SITE.designProfile}
        directoryItems={toDirectoryItems(getRegionChildren(node))}
        layoutVariant={ACTIVE_SITE.layoutVariant}
      />
    </>
  );
}
