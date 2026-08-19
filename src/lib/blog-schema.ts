import type { BlogPost } from "@/data/blog-posts";
import { getBlogPostPath } from "@/data/blog-posts";
import { getSiteConfig } from "@/lib/site-config";
import { getSiteOrigin } from "@/lib/metadata";

export type BlogPostingJsonLd = {
  "@context": "https://schema.org";
  "@type": "BlogPosting";
  headline: string;
  description: string;
  url: string;
  mainEntityOfPage: { "@type": "WebPage"; "@id": string };
  datePublished: string;
  dateModified: string;
  inLanguage: "ko-KR";
  keywords: string;
  image: { "@type": "ImageObject"; url: string; caption: string };
  author: { "@type": "Organization"; name: string };
  publisher: { "@type": "Organization"; name: string };
  isPartOf: { "@type": "Blog"; name: string; url: string };
};

export function createBlogPostingJsonLd(post: BlogPost): BlogPostingJsonLd {
  const site = getSiteConfig(post.siteKey);
  const origin = getSiteOrigin(site);
  const url = new URL(getBlogPostPath(post), origin).href;
  const blogUrl = new URL("/blog/", origin).href;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: post.publishedAt,
    dateModified: post.modifiedAt,
    inLanguage: "ko-KR",
    keywords: post.keywords.join(", "),
    image: {
      "@type": "ImageObject",
      url: new URL(post.image.src, origin).href,
      caption: post.image.alt,
    },
    author: { "@type": "Organization", name: site.brandName },
    publisher: { "@type": "Organization", name: site.brandName },
    isPartOf: {
      "@type": "Blog",
      name: `${site.brandName} 블로그`,
      url: blogUrl,
    },
  };
}

export function serializeBlogPostingJsonLd(post: BlogPost): string {
  return JSON.stringify(createBlogPostingJsonLd(post)).replace(/</gu, "\\u003c");
}
