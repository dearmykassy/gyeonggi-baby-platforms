import Link from "next/link";
import type { ComponentProps } from "react";

type NextLinkProps = ComponentProps<typeof Link>;

/**
 * The only application boundary around `next/link`.
 *
 * Baby platforms are static, link-dense sites. Disabling automatic prefetch
 * here keeps their first render from producing unsolicited `?_rsc=` traffic
 * while preserving ordinary crawlable anchors and client-side navigation.
 */
export function SiteLink({
  prefetch: _requestedPrefetch,
  ...props
}: NextLinkProps) {
  void _requestedPrefetch;
  return <Link {...props} prefetch={false} />;
}
