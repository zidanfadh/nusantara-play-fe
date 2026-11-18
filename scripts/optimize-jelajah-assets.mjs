#!/usr/bin/env node
/**
 * Builds the Jelajah 3D assets in public/jelajah/assets/v1/ from the CC0 source packs (Phase 11).
 * Re-runnable: the output depends only on the source packs and the lists below.
 *
 *   pnpm jelajah:assets --nature <dir> --characters <dir>
 *
 *   --nature      unzipped Kenney "Nature Kit" (2.1) folder (contains "Models/GLTF format/")
 *   --characters  unzipped Kenney "Mini Characters" (2.0) folder (contains "Models/GLB format/")
 *
 * Download the packs once into a scratch folder on D: (never into the repo). Licences and the exact
 * files used are recorded in public/jelajah/assets/ASSET_LICENSES.md; update it when the lists change.
 *
 * Output:
 *   nature.glb  every model of NATURE_MODELS in one file, each under a root node named after the model
 *   player.glb  PLAYER_MODEL with only the PLAYER_ANIMATIONS clips
 * Both: deduplicated, pruned, meshopt-compressed (EXT_meshopt_compression, decoded by drei useGLTF),
 * textures resized to <= 1024 px and converted to WebP (EXT_texture_webp). No KTX2 (needs a native
 * encoder).
 *
 * The glTF-Transform API (core, extensions, functions) and its encoders (meshoptimizer, sharp) are
 * the dependencies of the @gltf-transform/cli dev dependency; they are resolved through it, so the
 * repo has no other new dependency.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_DIR = join(root, 'public', 'jelajah', 'assets', 'v1');

/** Nature Kit models used by the scenes (lib/jelajah/scenes/*). Names = file names without .glb. */
export const NATURE_MODELS = [
  // trees
  'tree_palmTall',
  'tree_palmBend',
  'tree_palmShort',
  'tree_default',
  'tree_oak',
  'tree_fat',
  // plants
  'crops_bambooStageA',
  'plant_bushLarge',
  'plant_bush',
  'plant_flatTall',
  'grass',
  'grass_large',
  'flower_redA',
  'flower_yellowA',
  'flower_purpleA',
  // ground details
  'rock_largeA',
  'rock_smallA',
  'stone_smallA',
  'fence_simple',
  'fence_planks',
  // props
  'log_stack',
  'log',
  'stump_round',
  'pot_large',
  'pot_small',
  'canoe',
  'lily_large',
  'lily_small',
];

export const PLAYER_MODEL = 'character-male-a';
export const PLAYER_ANIMATIONS = ['idle', 'walk'];
export const MAX_TEXTURE_SIZE = 1024;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--nature' || a === '--characters') out[a.slice(2)] = argv[(i += 1)];
  }
  return out;
}

async function loadToolkit() {
  // pnpm keeps transitive dependencies out of the root node_modules: resolve them from the CLI package.
  const cliPkg = realpathSync(join(root, 'node_modules', '@gltf-transform', 'cli', 'package.json'));
  const req = createRequire(cliPkg);
  const core = await import(pathToUrl(req.resolve('@gltf-transform/core')));
  const extensions = await import(pathToUrl(req.resolve('@gltf-transform/extensions')));
  const functions = await import(pathToUrl(req.resolve('@gltf-transform/functions')));
  const { MeshoptEncoder } = await import(pathToUrl(req.resolve('meshoptimizer')));
  const sharp = (await import(pathToUrl(req.resolve('sharp')))).default;
  await MeshoptEncoder.ready;
  return { core, extensions, functions, MeshoptEncoder, sharp };
}

function pathToUrl(p) {
  return new URL(`file:///${p.replace(/\\/g, '/').replace(/^\/+/, '')}`).href;
}

async function finish(doc, tk) {
  const f = tk.functions;
  await doc.transform(
    f.unpartition(),
    f.dedup(),
    f.prune(),
    f.textureCompress({
      encoder: tk.sharp,
      targetFormat: 'webp',
      resize: [MAX_TEXTURE_SIZE, MAX_TEXTURE_SIZE],
    }),
    f.meshopt({ encoder: tk.MeshoptEncoder, level: 'medium' }),
  );
}

async function buildNature(natureDir, io, tk) {
  const srcDir = join(natureDir, 'Models', 'GLTF format');
  const target = new tk.core.Document();
  target.createBuffer();
  const scene = target.createScene('nature');
  for (const name of NATURE_MODELS) {
    const file = join(srcDir, `${name}.glb`);
    if (!existsSync(file)) throw new Error(`missing source model: ${file}`);
    const src = await io.read(file);
    const map = tk.functions.mergeDocuments(target, src);
    const group = target.createNode(name);
    for (const srcScene of src.getRoot().listScenes()) {
      const merged = map.get(srcScene);
      for (const child of merged.listChildren()) group.addChild(child);
      merged.dispose();
    }
    scene.addChild(group);
  }
  target.getRoot().setDefaultScene(scene);
  await finish(target, tk);
  return target;
}

async function buildPlayer(charactersDir, io, tk) {
  const file = join(charactersDir, 'Models', 'GLB format', `${PLAYER_MODEL}.glb`);
  if (!existsSync(file)) throw new Error(`missing source model: ${file}`);
  const doc = await io.read(file);
  const anims = doc.getRoot().listAnimations();
  for (const name of PLAYER_ANIMATIONS) {
    if (!anims.some((a) => a.getName() === name)) throw new Error(`${PLAYER_MODEL}: animation "${name}" not found`);
  }
  for (const a of anims) if (!PLAYER_ANIMATIONS.includes(a.getName())) a.dispose();
  await finish(doc, tk);
  return doc;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.nature || !args.characters) {
    console.error('usage: pnpm jelajah:assets --nature <Nature Kit folder> --characters <Mini Characters folder>');
    process.exit(2);
  }
  const tk = await loadToolkit();
  const io = new tk.core.NodeIO()
    .registerExtensions(tk.extensions.ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': tk.MeshoptEncoder });
  mkdirSync(OUT_DIR, { recursive: true });

  const outputs = [
    ['nature.glb', await buildNature(resolve(args.nature), io, tk)],
    ['player.glb', await buildPlayer(resolve(args.characters), io, tk)],
  ];
  for (const [name, doc] of outputs) {
    const path = join(OUT_DIR, name);
    await io.write(path, doc);
    console.log(`${name}: ${(statSync(path).size / 1024).toFixed(1)} KB`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
