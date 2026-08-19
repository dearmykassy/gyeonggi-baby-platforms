import type { MetadataRoute } from "next";

import { getSitePublicationContract } from "@/lib/metadata";
import { ACTIVE_SITE } from "@/lib/site-config";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const publication = getSitePublicationContract(ACTIVE_SITE);
  if (!publication.indexable) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      sitemap: publication.sitemapUrl,
    };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    host: publication.origin,
    sitemap: publication.sitemapUrl,
  };
}
