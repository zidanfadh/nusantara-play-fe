import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';
import {
  isOptimizableProtPhoto,
  PROT_PHOTO_HOST,
  PROT_PHOTO_PATH_PREFIX,
  ProtPhoto,
} from '@/components/prot/ProtPhoto';

const S3 = `https://${PROT_PHOTO_HOST}`;

describe('isOptimizableProtPhoto (Phase 13)', () => {
  it('accepts https PROT uploads on the bucket', () => {
    expect(isOptimizableProtPhoto(`${S3}/prot/foto-kegiatan/a.png`)).toBe(true);
    expect(isOptimizableProtPhoto(`${S3}/prot/peralatan/b.jpg`)).toBe(true);
  });

  it.each([
    `http://${PROT_PHOTO_HOST}/prot/a.png`, // not https
    `${S3}/nft/a.png`, // other folder of the bucket
    `${S3}/prot/a.png?x=1`, // query string
    `https://${PROT_PHOTO_HOST}:8443/prot/a.png`, // other port
    'https://example.com/prot/a.png', // other host
    'http://localhost:3001/jelajah/demo/placeholder.png', // the local DEMO placeholder
    'not a url',
  ])('rejects %s', (src) => {
    expect(isOptimizableProtPhoto(src)).toBe(false);
  });

  it('matches images.remotePatterns in next.config.ts exactly', () => {
    expect(nextConfig.images?.remotePatterns).toEqual([
      { protocol: 'https', hostname: PROT_PHOTO_HOST, port: '', pathname: `${PROT_PHOTO_PATH_PREFIX}**`, search: '' },
    ]);
  });

  it('changes nothing else in the image config (defaults stay)', () => {
    expect(Object.keys(nextConfig.images ?? {})).toEqual(['remotePatterns']);
  });
});

describe('ProtPhoto', () => {
  it('cover: optimized, two widths only, lazy by default', () => {
    const html = renderToStaticMarkup(<ProtPhoto src={`${S3}/prot/foto-kegiatan/a.png`} alt="A" size="cover" />);
    expect(html).toContain('/_next/image?url=');
    expect(html).toMatch(/srcSet="[^"]*w=640[^"]* 1x, [^"]*w=828[^"]* 2x"/);
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain('fetchPriority');
  });

  it('thumb: 96 / 256', () => {
    const html = renderToStaticMarkup(<ProtPhoto src={`${S3}/prot/peralatan/b.jpg`} alt="" size="thumb" />);
    expect(html).toMatch(/w=96[^"]* 1x, [^"]*w=256[^"]* 2x/);
  });

  it('priority: eager with high fetch priority', () => {
    const html = renderToStaticMarkup(<ProtPhoto src={`${S3}/prot/foto-kegiatan/a.png`} alt="A" size="cover" priority />);
    expect(html).not.toContain('loading="lazy"');
    expect(html).toMatch(/fetchPriority="high"/i);
  });

  it('other sources are shown as they are (no optimizer)', () => {
    const src = 'http://localhost:3001/jelajah/demo/placeholder.png';
    const html = renderToStaticMarkup(<ProtPhoto src={src} alt="" size="cover" />);
    expect(html).toContain(`src="${src}"`);
    expect(html).not.toContain('/_next/image');
  });
});
