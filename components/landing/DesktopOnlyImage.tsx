import { getImageProps, type StaticImageData } from 'next/image';

/** Tailwind `lg`: the sections that use this image are `hidden lg:block`. */
export const DESKTOP_ONLY_MEDIA = '(min-width: 1024px)';

/** 1x1 transparent GIF: what the <img> shows below `lg`, so phones download nothing. */
export const BLANK_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAACH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * A static landing image that is only visible from `lg` (Phase 18, same approach as the hero carousel in
 * Phase 14): the optimized srcset sits on a `<source media>` for `lg`, the `<img>` itself is a data URI,
 * so phones never download the photo even though the element is in the HTML. Server component (no
 * 'use client'), lazy unless `eager`.
 */
export function DesktopOnlyImage({
  image,
  alt,
  sizes,
  className,
}: {
  image: StaticImageData;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const {
    props: { srcSet, width, height },
  } = getImageProps({ src: image, alt, sizes });
  return (
    <picture className="block w-full h-full">
      <source media={DESKTOP_ONLY_MEDIA} srcSet={srcSet} sizes={sizes} />
      <img
        className={className}
        alt={alt}
        src={BLANK_IMAGE}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}
