import type { ResponsiveImageSources } from "@/lib/images";

type ResponsivePictureProps = {
  sources: ResponsiveImageSources;
  alt: string;
  className?: string;
  eager?: boolean;
  sizes: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
};

export type { ResponsiveImageSources } from "@/lib/images";

/**
 * A visible `<img>` is intentionally retained when an asset is unavailable.
 * The browser then exposes the broken image and its useful alt text instead of
 * a decorative fallback silently hiding an incomplete release.
 */
export function ResponsivePicture({
  sources,
  alt,
  className,
  eager = false,
  sizes,
  intrinsicWidth = 1920,
  intrinsicHeight = 970,
}: ResponsivePictureProps) {
  return (
    <picture className={className} data-image-source={sources.desktop}>
      <source
        media="(max-width: 639px)"
        srcSet={sources.mobile}
      />
      <source
        media="(max-width: 1023px)"
        srcSet={sources.tablet}
      />
      <img
        alt={alt}
        decoding={eager ? "sync" : "async"}
        fetchPriority={eager ? "high" : "auto"}
        height={intrinsicHeight}
        loading={eager ? "eager" : "lazy"}
        sizes={sizes}
        src={sources.desktop}
        width={intrinsicWidth}
      />
    </picture>
  );
}
