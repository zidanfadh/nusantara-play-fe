import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import type { StaticImageData } from 'next/image';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_IMAGE,
  HERO_CAROUSEL_MEDIA,
  HeroSlideImage,
  heroSlideSizes,
} from '@/components/ui/HeroCarousel';

const root = join(__dirname, '..', '..');

// Vitest has no Next.js static-image loader, so the slide gets the object a static import produces in Next.
const square: StaticImageData = { src: '/_next/static/media/hero.abc.webp', width: 512, height: 512 };
const wide: StaticImageData = { src: '/_next/static/media/nusland.abc.webp', width: 1536, height: 1024 };

describe('HeroSlideImage (Phase 14)', () => {
  it('optimized srcset only for the lg media query; phones get an empty image (no download)', () => {
    const html = renderToStaticMarkup(<HeroSlideImage slide={{ image: square, alt: 'A', href: null }} first />);
    expect(html).toContain(`<source media="${HERO_CAROUSEL_MEDIA}"`);
    expect(html).toMatch(/srcSet="\/_next\/image\?url=%2F_next%2Fstatic%2Fmedia%2Fhero\.abc\.webp&amp;w=\d+&amp;q=75 \d+w/);
    expect(html).toContain(`src="${EMPTY_IMAGE}"`);
    const img = html.slice(html.indexOf('<img'));
    expect(img).not.toContain('_next/image');
    expect(img).not.toContain('srcSet');
  });

  it('first slide: eager with high fetch priority; other slides lazy', () => {
    const first = renderToStaticMarkup(<HeroSlideImage slide={{ image: square, alt: 'A', href: null }} first />);
    expect(first).toMatch(/fetchPriority="high"/i);
    expect(first).not.toContain('loading="lazy"');
    const second = renderToStaticMarkup(<HeroSlideImage slide={{ image: wide, alt: 'B', href: 'x' }} first={false} />);
    expect(second).toContain('loading="lazy"');
    expect(second).not.toMatch(/fetchPriority/i);
  });

  it('sizes follow the box (square) and the object-cover crop (3:2 is drawn 1.5 times as wide)', () => {
    expect(heroSlideSizes(1)).toBe('(min-width: 1280px) 510px, 44vw');
    expect(heroSlideSizes(1536 / 1024)).toBe('(min-width: 1280px) 765px, 66vw');
    const html = renderToStaticMarkup(<HeroSlideImage slide={{ image: wide, alt: 'B', href: null }} first={false} />);
    expect(html).toContain('sizes="(min-width: 1280px) 765px, 66vw"');
  });
});

describe('landing page images (Phase 14)', () => {
  const page = readFileSync(join(root, 'app', 'page.tsx'), 'utf8');

  it('featured PROT photos go through ProtPhoto, not a plain <img>', () => {
    // Phase 25: the photo is the first one the hidden-media denylist lets through.
    expect(page).toMatch(/const photo = firstVisiblePhoto\(game\)/);
    expect(page).toMatch(/<ProtPhoto\s+src=\{photo\}/);
    expect(page).not.toMatch(/<img[^>]*fotoKegiatan/);
  });

  it('no landing image file name contains spaces or brackets', () => {
    for (const name of readdirSync(join(root, 'public', 'images', 'landing'))) {
      expect(name).toMatch(/^[a-z0-9.-]+$/);
    }
  });
});

describe('remaining landing images (Phase 18)', () => {
  const page = readFileSync(join(root, 'app', 'page.tsx'), 'utf8');

  it('no plain <img> is left on the landing page; the five images are static imports', () => {
    expect(page).not.toMatch(/<img\b/);
    expect(page).not.toContain('no-img-element');
    for (const name of ['nusantara-legacy', 'arsip', 'komunitas', 'sertifikasi', 'blockchain']) {
      expect(page).toMatch(new RegExp(`from '@/public/images/landing/${name}\.webp'`));
      expect(page).not.toContain(`'/images/landing/${name}.webp'`);
    }
  });

  it('the lg-only blockchain image goes through DesktopOnlyImage', () => {
    expect(page).toMatch(/<DesktopOnlyImage\s+image=\{blockchainImage\}/);
  });

  it('DesktopOnlyImage: optimized srcset only for lg, a data URI for phones, lazy', async () => {
    const { DesktopOnlyImage, DESKTOP_ONLY_MEDIA, BLANK_IMAGE } = await import('@/components/landing/DesktopOnlyImage');
    const html = renderToStaticMarkup(
      <DesktopOnlyImage image={square} alt="B" sizes="(min-width: 1280px) 576px, calc(50vw - 88px)" />,
    );
    expect(DESKTOP_ONLY_MEDIA).toBe(HERO_CAROUSEL_MEDIA);
    expect(html).toContain(`<source media="${DESKTOP_ONLY_MEDIA}"`);
    expect(html).toMatch(/srcSet="\/_next\/image\?url=/);
    const img = html.slice(html.indexOf('<img'));
    expect(img).toContain(`src="${BLANK_IMAGE}"`);
    expect(img).not.toContain('_next/image');
    expect(img).toContain('loading="lazy"');
  });
});
