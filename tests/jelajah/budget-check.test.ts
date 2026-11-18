import { describe, expect, it } from 'vitest';
import { evaluateBudget, glbImages, imageSize, loadScenes, MAX_SCENE_BYTES } from '../../scripts/check-jelajah-budget.mjs';

function png(width: number, height: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const dv = new DataView(b.buffer);
  dv.setUint32(16, width);
  dv.setUint32(20, height);
  return b;
}

function webpLossless(width: number, height: number): Uint8Array {
  const b = new Uint8Array(30);
  b.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
  b.set([...'WEBPVP8L'].map((c) => c.charCodeAt(0)), 8);
  b[20] = 0x2f;
  const bits = (width - 1) | ((height - 1) << 14);
  new DataView(b.buffer).setUint32(21, bits, true);
  return b;
}

function jpeg(width: number, height: number): Uint8Array {
  // SOI, APP0 (length 4), SOF0
  const b = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0, 0, 0, 0, 0x03]);
  const dv = new DataView(b.buffer);
  dv.setUint16(13, height);
  dv.setUint16(15, width);
  return b;
}

function glb(json: object, bin: Uint8Array): Uint8Array {
  const pad = (n: number) => (4 - (n % 4)) % 4;
  let text = JSON.stringify(json);
  text += ' '.repeat(pad(text.length));
  const jsonBytes = new TextEncoder().encode(text);
  const binLen = bin.length + pad(bin.length);
  const total = 12 + 8 + jsonBytes.length + 8 + binLen;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true);
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, jsonBytes.length, true);
  dv.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  const o = 20 + jsonBytes.length;
  dv.setUint32(o, binLen, true);
  dv.setUint32(o + 4, 0x004e4942, true);
  out.set(bin, o + 8);
  return out;
}

describe('imageSize', () => {
  it('reads PNG, WebP (VP8L) and JPEG dimensions', () => {
    expect(imageSize(png(512, 256))).toMatchObject({ format: 'png', width: 512, height: 256 });
    expect(imageSize(webpLossless(1024, 300))).toMatchObject({ format: 'webp', width: 1024, height: 300 });
    expect(imageSize(jpeg(2048, 1024))).toMatchObject({ format: 'jpeg', width: 2048, height: 1024 });
  });

  it('returns null for unknown data', () => {
    expect(imageSize(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });
});

describe('glbImages', () => {
  it('extracts embedded images from a GLB', () => {
    const image = png(2048, 2048);
    const file = glb(
      { asset: { version: '2.0' }, bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: image.length }], images: [{ name: 'big', mimeType: 'image/png', bufferView: 0 }] },
      image,
    );
    const images = glbImages(file);
    expect(images).toHaveLength(1);
    expect(imageSize(images[0].bytes)).toMatchObject({ width: 2048, height: 2048 });
  });

  it('rejects non-GLB data', () => {
    expect(() => glbImages(new Uint8Array(32))).toThrow(/GLB/);
  });
});

describe('evaluateBudget', () => {
  const okTexture = { label: 'a.glb → t', width: 1024, height: 512 };

  it('passes within the limits', () => {
    const r = evaluateBudget({
      scenes: [{ slug: 's', files: [{ url: '/a.glb', size: 1000 }, { url: '/b.glb', size: 2000 }] }],
      textures: [okTexture],
    });
    expect(r.ok).toBe(true);
    expect(r.report[0].totalBytes).toBe(3000);
  });

  it('fails when the scene assets exceed 8 MB in total', () => {
    const r = evaluateBudget({
      scenes: [{ slug: 's', files: [{ url: '/a.glb', size: MAX_SCENE_BYTES }, { url: '/b.glb', size: 1 }] }],
      textures: [],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/s: assets .* > 8 MB/);
  });

  it('fails on a texture above 1024 px and on a missing asset', () => {
    const r = evaluateBudget({
      scenes: [{ slug: 's', files: [{ url: '/missing.glb', size: null }] }],
      textures: [okTexture, { label: 'big.glb → t', width: 2048, height: 1024 }, { label: 'x.webp' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual([
      's: missing asset /missing.glb',
      'big.glb → t: 2048x1024 > 1024 px',
      'x.webp: unknown image format',
    ]);
  });
});

describe('scene loading', () => {
  it('finds the Sumatera Selatan scene and its assets', async () => {
    const scenes = await loadScenes();
    const sumsel = scenes.find((s: { slug: string }) => s.slug === 'sumatera-selatan');
    expect(sumsel?.assets).toEqual({ nature: '/jelajah/assets/v1/nature.glb', player: '/jelajah/assets/v1/player.glb' });
  });
});
