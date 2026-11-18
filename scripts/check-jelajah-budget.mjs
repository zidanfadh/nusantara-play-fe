#!/usr/bin/env node
/**
 * pnpm check:jelajah — asset budget of the Jelajah province scenes (Phase 11). Fails (exit 1) when
 *   - the asset files a scene needs (SceneDefinition.assets) exceed 8 MB in total, or are missing;
 *   - any texture in public/jelajah/assets/ (image files, and images embedded in .glb files) is larger
 *     than 1024 px on either side.
 *
 * Scenes are read from lib/jelajah/scenes/*.ts with Node's built-in type stripping (scene files may only
 * use `import type`). The pure checks are exported for the unit tests.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve, relative, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const MAX_SCENE_BYTES = 8 * 1024 * 1024;
export const MAX_TEXTURE_PX = 1024;

/** Width/height of a PNG, JPEG or WebP image, or null for an unknown format. */
export function imageSize(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const ascii = (o, n) => String.fromCharCode(...b.subarray(o, o + n));
  // PNG: signature + IHDR
  if (b.length >= 24 && b[0] === 0x89 && ascii(1, 3) === 'PNG') {
    return { format: 'png', width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  // WebP: RIFF....WEBP + VP8 / VP8L / VP8X
  if (b.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4);
    if (chunk === 'VP8 ') {
      return { format: 'webp', width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
    }
    if (chunk === 'VP8L') {
      const bits = dv.getUint32(21, true);
      return { format: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') {
      const w = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
      const h = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
      return { format: 'webp', width: w, height: h };
    }
    return null;
  }
  // JPEG: walk the segments to the first SOFn
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) return null;
      const marker = b[o + 1];
      const len = dv.getUint16(o + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { format: 'jpeg', width: dv.getUint16(o + 7), height: dv.getUint16(o + 5) };
      }
      o += 2 + len;
    }
  }
  return null;
}

/** Images embedded in a .glb (binary glTF): [{ index, name, mimeType, bytes }]. External URIs are skipped. */
export function glbImages(buffer) {
  const b = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length < 20 || dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB file');
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset + 8 <= b.length) {
    const length = dv.getUint32(offset, true);
    const type = dv.getUint32(offset + 4, true);
    const data = b.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(data));
    else if (type === 0x004e4942) bin = data;
    offset += 8 + length;
  }
  if (!json) throw new Error('GLB without JSON chunk');
  return (json.images ?? []).flatMap((img, index) => {
    if (img.bufferView === undefined || !bin) return [];
    const view = json.bufferViews[img.bufferView];
    const start = view.byteOffset ?? 0;
    return [{ index, name: img.name ?? `image ${index}`, mimeType: img.mimeType, bytes: bin.subarray(start, start + view.byteLength) }];
  });
}

/**
 * Pure verdict. scenes: [{ slug, files: [{ url, size | null }] }], textures: [{ label, width, height }].
 * size null = file missing.
 */
export function evaluateBudget({ scenes, textures }, limits = { maxSceneBytes: MAX_SCENE_BYTES, maxTexturePx: MAX_TEXTURE_PX }) {
  const errors = [];
  const report = [];
  for (const scene of scenes) {
    let total = 0;
    for (const f of scene.files) {
      if (f.size === null) errors.push(`${scene.slug}: missing asset ${f.url}`);
      else total += f.size;
    }
    report.push({ slug: scene.slug, totalBytes: total, files: scene.files.length });
    if (total > limits.maxSceneBytes) {
      errors.push(`${scene.slug}: assets ${(total / 1048576).toFixed(2)} MB > ${(limits.maxSceneBytes / 1048576).toFixed(0)} MB`);
    }
  }
  for (const t of textures) {
    if (t.width === undefined || t.height === undefined) errors.push(`${t.label}: unknown image format`);
    else if (t.width > limits.maxTexturePx || t.height > limits.maxTexturePx) {
      errors.push(`${t.label}: ${t.width}x${t.height} > ${limits.maxTexturePx} px`);
    }
  }
  return { ok: errors.length === 0, errors, report };
}

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Every texture under public/jelajah/assets (image files and images inside .glb files). */
export function collectTextures(assetsDir) {
  const out = [];
  for (const file of walk(assetsDir)) {
    const ext = extname(file).toLowerCase();
    const label = relative(root, file).replace(/\\/g, '/');
    if (IMAGE_EXT.has(ext)) {
      const size = imageSize(readFileSync(file));
      out.push({ label, width: size?.width, height: size?.height });
    } else if (ext === '.glb') {
      for (const img of glbImages(readFileSync(file))) {
        const size = imageSize(img.bytes);
        out.push({ label: `${label} → ${img.name}`, width: size?.width, height: size?.height });
      }
    }
  }
  return out;
}

export async function loadScenes(scenesDir = join(root, 'lib', 'jelajah', 'scenes')) {
  const scenes = [];
  for (const name of readdirSync(scenesDir).sort()) {
    if (!name.endsWith('.ts') || name === 'types.ts' || name === 'index.ts') continue;
    const mod = await import(pathToFileURL(join(scenesDir, name)).href);
    for (const value of Object.values(mod)) {
      if (value && typeof value === 'object' && typeof value.slug === 'string' && value.assets) scenes.push(value);
    }
  }
  return scenes;
}

async function main() {
  const publicDir = join(root, 'public');
  const scenes = (await loadScenes()).map((scene) => ({
    slug: scene.slug,
    files: Object.values(scene.assets).map((url) => {
      const path = join(publicDir, ...String(url).split('/').filter(Boolean));
      return { url, size: existsSync(path) ? statSync(path).size : null };
    }),
  }));
  if (scenes.length === 0) {
    console.error('check:jelajah: no scenes found in lib/jelajah/scenes/');
    process.exit(1);
  }
  const textures = collectTextures(join(publicDir, 'jelajah', 'assets'));
  const result = evaluateBudget({ scenes, textures });
  for (const r of result.report) {
    console.log(`${r.slug}: ${r.files} asset files, ${(r.totalBytes / 1024).toFixed(1)} KB (limit ${MAX_SCENE_BYTES / 1048576} MB)`);
  }
  console.log(`textures: ${textures.length} checked (limit ${MAX_TEXTURE_PX} px): ${textures.map((t) => `${t.label} ${t.width}x${t.height}`).join(', ') || 'none'}`);
  if (!result.ok) {
    for (const e of result.errors) console.error(`FAIL ${e}`);
    process.exit(1);
  }
  console.log('check:jelajah OK');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
