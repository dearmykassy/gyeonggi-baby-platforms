import type { BlogPost } from "@/data/blog-posts";

import { InteriorHero } from "@/components/content-blocks";
import { ResponsivePicture, type ResponsiveImageSources } from "@/components/responsive-picture";
import { SiteLink } from "@/components/site-link";

export function BlogIndexContent({
  brandName,
  cityName,
  posts,
  images,
}: {
  brandName: string;
  cityName: string;
  posts: readonly BlogPost[];
  images: readonly [ResponsiveImageSources, ResponsiveImageSources];
}) {
  return (
    <article className="fixed-page">
      <InteriorHero
        description={`${cityName} 지역 선택, 전화 준비, 코스와 현장 결제 기준을 실제 운영 정보로 정리한 글입니다.`}
        eyebrow={`${brandName} · EDITORIAL`}
        title={`${cityName} 이용 안내 글`}
      />
      <div className="fixed-page__body content-frame">
        <div className="blog-grid">
          {posts.map((post, index) => (
            <article className="blog-card" key={post.slug}>
              <ResponsivePicture
                alt={post.image.alt}
                className="blog-card__picture"
                intrinsicHeight={900}
                intrinsicWidth={1600}
                sizes="(max-width: 767px) 94vw, 610px"
                sources={images[index] ?? images[0]}
              />
              <div className="blog-card__copy">
                <time dateTime={post.publishedAt}>{formatKoreanDate(post.publishedAt)}</time>
                <h2>{post.title}</h2>
                <p>{post.description}</p>
                <SiteLink href={`/blog/${post.slug}/`}>글 읽기</SiteLink>
              </div>
            </article>
          ))}
        </div>
      </div>
    </article>
  );
}

export function BlogArticleContent({
  post,
  relatedPost,
  image,
}: {
  post: BlogPost;
  relatedPost: BlogPost;
  image: ResponsiveImageSources;
}) {
  return (
    <article className="fixed-page blog-article">
      <InteriorHero
        breadcrumbs={[
          { href: "/blog/", label: "안내 글" },
          { href: `/blog/${post.slug}/`, label: post.category },
        ]}
        description={post.description}
        eyebrow={post.category}
        title={post.title}
      />
      <div className="fixed-page__body content-frame">
        <figure className="article-lead-image">
          <ResponsivePicture
            alt={post.image.alt}
            className="article-lead-image__picture"
            eager
            intrinsicHeight={900}
            intrinsicWidth={1600}
            sizes="(max-width: 1279px) 100vw, 1240px"
            sources={image}
          />
          <figcaption>{post.intro}</figcaption>
        </figure>
        <div className="article-body">
          {post.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
          <section className="article-checklist">
            <h2>전화 전 체크리스트</h2>
            <ul>{post.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <nav aria-label="관련 안내 글" className="related-article">
            <p>RELATED</p>
            <SiteLink href={`/blog/${relatedPost.slug}/`}>{relatedPost.title}</SiteLink>
          </nav>
        </div>
      </div>
    </article>
  );
}

function formatKoreanDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
