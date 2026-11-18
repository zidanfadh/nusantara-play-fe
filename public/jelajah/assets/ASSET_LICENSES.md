# Jelajah Nusantara 3D asset licences

Rule (Phase 11): only **CC0** packs. Every pack used in `public/jelajah/assets/` is listed here with the
licence text checked in the pack itself, and with the exact files used. Raw packs are never committed; the
files in `v1/` are built by `scripts/optimize-jelajah-assets.mjs` (meshopt, WebP textures <= 1024 px).

Traditional buildings (raised houses "terinspirasi rumah limas", PROT stands) are NOT from any pack: they are
built procedurally in code (`lib/jelajah/three/village-geometry.ts`).

## Kenney — Nature Kit (2.1)

- Author: Kenney (www.kenney.nl)
- Source: https://kenney.nl/assets/nature-kit (downloaded 2026-11-18)
- Licence: Creative Commons Zero (CC0 1.0), https://creativecommons.org/publicdomain/zero/1.0/
  (checked in the pack's `License.txt`: "License: (Creative Commons Zero, CC0)")
- Files used (from `Models/GLTF format/`), merged into `v1/nature.glb`:
  `tree_palmTall.glb`, `tree_palmBend.glb`, `tree_palmShort.glb`, `tree_default.glb`, `tree_oak.glb`,
  `tree_fat.glb`, `crops_bambooStageA.glb`, `plant_bushLarge.glb`, `plant_bush.glb`, `plant_flatTall.glb`,
  `grass.glb`, `grass_large.glb`, `flower_redA.glb`, `flower_yellowA.glb`, `flower_purpleA.glb`,
  `rock_largeA.glb`, `rock_smallA.glb`, `stone_smallA.glb`, `fence_simple.glb`,
  `fence_planks.glb`, `log_stack.glb`, `log.glb`, `stump_round.glb`, `pot_large.glb`, `pot_small.glb`,
  `canoe.glb`, `lily_large.glb`, `lily_small.glb`

## Kenney — Mini Characters (2.0)

- Author: Kenney (www.kenney.nl)
- Source: https://kenney.nl/assets/mini-characters-1 (downloaded 2026-11-18)
- Licence: Creative Commons Zero (CC0 1.0), https://creativecommons.org/publicdomain/zero/1.0/
  (checked in the pack's `License.txt`: "License: (Creative Commons Zero, CC0)")
- Files used: `Models/GLB format/character-male-a.glb` with its texture `Models/Textures/colormap.png`
  → `v1/player.glb` (rigged, about 690 triangles; only the `idle` and `walk` animations are kept; texture
  512 px, WebP).
