import { SiteLink } from "@/components/site-link";

export default function NotFound() {
  return (
    <article className="fixed-page">
      <header className="interior-hero">
        <div className="content-frame">
          <p className="eyebrow">404</p>
          <h1>요청한 지역 안내를 찾지 못했습니다.</h1>
          <p className="interior-hero__description">현재 플랫폼에 포함된 지역인지 지역 목록에서 다시 확인하세요.</p>
        </div>
      </header>
      <div className="fixed-page__body content-frame notice-links">
        <h2>다음 경로에서 다시 찾기</h2>
        <div><SiteLink href="/">홈</SiteLink><SiteLink href="/areas/">지역 안내</SiteLink></div>
      </div>
    </article>
  );
}
