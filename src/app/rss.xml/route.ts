import { createRssXml } from "@/lib/rss";
import { ACTIVE_SITE } from "@/lib/site-config";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(createRssXml(ACTIVE_SITE), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "application/rss+xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
