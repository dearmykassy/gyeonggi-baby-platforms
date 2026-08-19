import type { ReactNode } from "react";

import { Analytics } from "@/components/analytics";
import { PhoneIcon } from "@/components/icons";
import { MobileDrawer, type NavigationItem } from "@/components/mobile-drawer";
import { SiteLink } from "@/components/site-link";
import { SiteSearch, type SearchItem } from "@/components/site-search";

const NAVIGATION: readonly NavigationItem[] = [
  { href: "/areas/", label: "지역 안내" },
  { href: "/pricing/", label: "코스·가격" },
  { href: "/guide/", label: "이용 방법" },
  { href: "/notice/", label: "공지사항" },
  { href: "/blog/", label: "안내 글" },
] as const;

export function SiteChrome({
  brandName,
  cityName,
  children,
  phoneDisplay,
  phoneHref,
  searchItems,
  siteKey,
}: {
  brandName: string;
  cityName: string;
  children: ReactNode;
  phoneDisplay: string;
  phoneHref: string;
  searchItems: readonly SearchItem[];
  siteKey: string;
}) {
  return (
    <>
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <header className="site-header">
        <div className="header-frame">
          <SiteLink className="wordmark" data-drawer-inert href="/">
            <span aria-hidden="true" className="wordmark__mark">○</span>
            <span>{brandName}</span>
          </SiteLink>
          <nav aria-label="주요 메뉴" className="desktop-navigation" data-drawer-inert>
            {NAVIGATION.map((item) => (
              <SiteLink href={item.href} key={item.href}>{item.label}</SiteLink>
            ))}
          </nav>
          <div className="desktop-search" data-drawer-inert>
            <SiteSearch compact cityName={cityName} items={searchItems} />
          </div>
          <MobileDrawer
            brandName={brandName}
            cityName={cityName}
            navigation={NAVIGATION}
            searchItems={searchItems}
          />
        </div>
      </header>
      <div aria-hidden="true" className="header-space" />
      <div data-drawer-inert data-page-shell>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <footer className="site-footer">
          <div className="footer-frame">
            <div>
              <SiteLink className="footer-brand" href="/">{brandName}</SiteLink>
              <p>{cityName} 안에서 확인 가능한 지역과 운영 정보를 안내합니다.</p>
            </div>
            <nav aria-label="하단 메뉴">
              {NAVIGATION.map((item) => (
                <SiteLink href={item.href} key={item.href}>{item.label}</SiteLink>
              ))}
              <a href="/sitemap.xml">사이트맵</a>
              <a href="/rss.xml">RSS</a>
            </nav>
            <p className="footer-note">© {brandName}. 운영 정보는 전화상담에서 최종 확인합니다.</p>
          </div>
        </footer>
      </div>
      <div className="fixed-contact" data-drawer-inert data-fixed-dock>
        <SiteLink className="contact-secondary" href="/areas/">지역 찾기</SiteLink>
        <a className="contact-primary" data-phone-cta="fixed_dock" href={phoneHref}>
          <PhoneIcon />
          <span>전화 문의 <small>{phoneDisplay}</small></span>
        </a>
      </div>
      <Analytics siteKey={siteKey} />
    </>
  );
}
