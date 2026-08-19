import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogArticleContent } from "@/components/blog-pages";
import { JsonLd } from "@/components/json-ld";
import {
  createBlogMetadata,
  findBlogPost,
  getBlogPost,
  getBlogPosts,
} from "@/data/blog-posts";
import { createBlogPostingJsonLd } from "@/lib/blog-schema";
import { getRegionImageSet } from "@/lib/images";

type BlogRouteProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const post = findBlogPost(slug);
  return post ? createBlogMetadata(post) : {};
}

export default async function BlogArticlePage({ params }: BlogRouteProps) {
  const { slug } = await params;
  const post = findBlogPost(slug);
  if (!post) notFound();
  const relatedPost = getBlogPost(post.relatedSlug);
  const posts = getBlogPosts();
  const images = getRegionImageSet("/");
  const image = posts.findIndex((candidate) => candidate.slug === post.slug) === 0
    ? images.bodyA
    : images.bodyB;
  return (
    <>
      <JsonLd data={createBlogPostingJsonLd(post)} />
      <BlogArticleContent image={image} post={post} relatedPost={relatedPost} />
    </>
  );
}
