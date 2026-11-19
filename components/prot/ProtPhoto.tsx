'use client';

/**
 * A PROT photo (Phase 13): next/image through Vercel Image Optimization for the PROT uploads on S3, the
 * original URL for anything else (and as a fallback).
 *
 * Kept small on purpose, so the project stays inside the Vercel Hobby image limits (5K transformations per
 * month; a transformation is billed per source URL × width × format, again after the cache TTL):
 * - only https URLs on the PROT bucket under /prot/ are optimized (the same rule as `images.remotePatterns`
 *   in next.config.ts; a test keeps both in sync);
 * - two display sizes only: `cover` (400 px wide, srcset 640 / 828) and `thumb` (80 px, srcset 96 / 256), so
 *   every photo has at most two variants per size, shared by /prot, the detail page and Jelajah;
 * - if optimization fails (for example the Hobby limit answers 402), the photo falls back to its original
 *   URL instead of showing only the alt text.
 */
import Image from 'next/image';
import { useState } from 'react';

export const PROT_PHOTO_HOST = 'nusantara-play-storage.s3.ap-southeast-2.amazonaws.com';
export const PROT_PHOTO_PATH_PREFIX = '/prot/';

/** https, the PROT bucket host (default port), a path under /prot/ and no query string. */
export function isOptimizableProtPhoto(src: string): boolean {
  try {
    const u = new URL(src);
    return (
      u.protocol === 'https:' &&
      u.hostname === PROT_PHOTO_HOST &&
      u.port === '' &&
      u.pathname.startsWith(PROT_PHOTO_PATH_PREFIX) &&
      u.search === ''
    );
  } catch {
    return false;
  }
}

/** Display boxes (CSS px); the container sets the real size with object-cover. */
export const PROT_PHOTO_SIZES = {
  cover: { width: 400, height: 225 },
  thumb: { width: 80, height: 80 },
} as const;

interface ProtPhotoProps {
  src: string;
  alt: string;
  size: keyof typeof PROT_PHOTO_SIZES;
  className?: string;
  /** The first visible photo of the page: loaded at once with high priority; every other photo is lazy. */
  priority?: boolean;
}

export function ProtPhoto({ src, alt, size, className = 'h-full w-full object-cover', priority = false }: ProtPhotoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const optimize = isOptimizableProtPhoto(src) && failedSrc !== src;
  const { width, height } = PROT_PHOTO_SIZES[size];
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized={!optimize}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      onError={optimize ? () => setFailedSrc(src) : undefined}
    />
  );
}
