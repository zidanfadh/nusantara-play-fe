# CLAUDE.md — Nusantara Legacy Frontend

> There is **no** root `CLAUDE.md` above this repo (an earlier version of this file pointed to
> `../CLAUDE.md`, which does not exist). This file and `nusantara-play-be/CLAUDE.md` are the project
> context. The sections from "Current direction" onwards are identical in both repos.

## Project Overview

Next.js 16 + React 19 + TypeScript + Tailwind v4 frontend for Nusantara Legacy — a digital
archive platform for Indonesian traditional games and sports (PROT). Uses Supabase for auth
and a NestJS backend (http://localhost:3000/api in development) for all data.

## Commands

```bash
pnpm dev          # Start dev server on port 3001 (next dev -p 3001; the backend uses 3000)
pnpm build        # Production build (needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, otherwise prerendering fails)
pnpm lint         # ESLint (no auto-fix)
pnpm test         # Vitest (vitest run); tests live in tests/**/*.test.{ts,tsx}, `@/` alias works like tsconfig (component tests render with react-dom/server)
pnpm jelajah:geo --download D:/dev-cache/tmp/jelajah-geo   # Rebuild public/jelajah/geo/indonesia-provinces.json (mapshaper; source pinned by SHA-256)
pnpm concept:map  # Rebuild lib/jelajah/concept/indonesia-paths.ts (concept video outline, from the file above; commit it)
```

On this machine always add the D: store/cache flags to pnpm install/add (see "Local machine" below).
Build scripts of sharp and unrs-resolver are allowed in `pnpm-workspace.yaml` (see Decisions log),
so `pnpm install --frozen-lockfile` exits 0. Keep `pnpm-lock.yaml` at `lockfileVersion: '9.0'`.

## Git Workflow

This is a standalone git repo. Run all git commands directly — no need to `cd` first.

```bash
# Correct — plain git commands in this directory
git add app/(protected)/marketplace/page.tsx
git commit -m "feat(marketplace): implement browse page"
```

Never chain navigation with git using `&&` — always run them as separate commands.

## Architecture

**Route organization** (App Router):
- `app/(auth)/` — public auth pages (login, signup)
- `app/(protected)/` — authenticated pages with shared layout
- `app/prot/` — public-facing PROT browsing pages
- `app/jelajah/` — Jelajah Nusantara (login required since Phase 18): hub map `/jelajah`, province pages `/jelajah/[provinsi]` (Phase 10)
- `app/main/` — hosted games (public, Phase 17): `/main` lists them, `/main/congklak`, `/main/gasing` (Phase 20)
- `app/api/` — Next.js API routes
- `app/page.tsx` — landing page; a **server component** that fetches stats and featured PROT on the server

**Data flow**: Page/component → domain hook (`hooks/use*.ts`) → API module (`lib/api/*.ts`) →
`apiClient` (`lib/api/client.ts`) → NestJS backend. `apiClient` auto-attaches the Supabase
JWT as `Authorization: Bearer <token>`.

**Backend URL** (`lib/api/base-url.ts`, `getBackendApiUrl()`): in development it uses
`NEXT_PUBLIC_BACKEND_API_URL` (browser and server). In production, in the browser it returns
`${window.location.origin}/backend-api` on any domain (nusantaralegacy.org, `*.vercel.app` previews; the
retired nusantaravirtual.org is redirected to nusantaralegacy.org before any page loads, Phase 10). `next.config.ts` rewrites `/backend-api/:path*` to `<BACKEND_ORIGIN>/api/:path*`
(default `https://api.nusantaralegacy.org`; validated, an invalid value fails `pnpm build`), so browser
calls are same-origin and not subject to CORS. On the server (no `window`) it uses
`NEXT_PUBLIC_BACKEND_API_URL` directly. `middleware.ts` excludes `/backend-api` from its matcher (no
Supabase call, no `/login` redirect). `/backend-api` is reserved: do not create `app/**/backend-api/`
(a test fails if you do). Every backend call, including raw multipart `fetch` uploads, must build its
URL with `getBackendApiUrl()`.

**Auth**: `contexts/AuthContext.tsx` exposes `user`, `session`, `signIn`, `signOut`,
`getAccessToken`. `middleware.ts` handles session refresh and redirects unauthenticated users
to `/login` (Next.js 16 warns that the `middleware` file convention is deprecated in favour of `proxy`).
Since Phase 18 the redirect carries `redirectTo` (and `reason=jelajah` for Jelajah pages), and every login path honours
it; see "Brand, navbar and the Jelajah login gate (Phase 18)".

## Key Conventions

- All backend calls go through `apiClient` — never use raw `fetch` directly (except multipart file uploads where the browser must set the `Content-Type` boundary automatically). Files that currently call `fetch` directly (some of them for uploads): `app/page.tsx`, `hooks/useMarketplace.ts`, `lib/api/stats.ts`, `lib/api/nfts.ts`, `lib/api/prot.ts`.
- API modules live in `lib/api/` and return typed responses matching `types/*.ts`.
- Hooks follow the pattern: `useState` + `useEffect` with `isMounted` guard + optional `refetch` via a `refresh` counter. See `hooks/useEvents.ts` as the canonical example.
- Pages are mostly `'use client'` components that compose hooks + components. Keep pages thin.
- Use `useCurrentUser()` to get the authenticated user and check roles (`user.role`).
- Admin role is `'admin_kpoti'`. Check via `user.role === 'admin_kpoti'` or `['kurator_daerah', 'admin_kpoti'].includes(user.role)`.
- Audit log `changes` are always displayed through `redactSecrets()` (`components/audit/redact-secrets.ts`): values of secret-looking keys (password, token, secret, api key, authorization) show as `[REDACTED]` at any depth (Phase 07).
- PROT photos are rendered with `ProtPhoto` (`components/prot/ProtPhoto.tsx`, Phase 13), never with a plain `<img>`, on
  every page including the landing page (Phase 14). Image rules for all public pages: "Public page images (Phase 14)".
- The brand is `SITE_NAME` from `lib/brand.ts` (Phase 18); never write the site name as text in a page or component.
- Components are grouped by domain: `components/events/`, `components/prot/`, `components/marketplace/`, etc.

## Feature Modules

| Domain | Types | API | Hooks | Components | Pages |
|--------|-------|-----|-------|------------|-------|
| PROT | `types/prot.ts` | `lib/api/prot.ts` | `hooks/useBlockchainProof.ts` | `components/prot/` | `app/prot/` |
| Events | `types/events.ts` | `lib/api/events.ts` | `hooks/useEvents.ts` | `components/events/` | `app/(protected)/events/` |
| Calendar | `types/calendar.ts` | `lib/api/calendar.ts` | `hooks/useCalendar.ts` | `components/calendar/` | `app/(protected)/calendar/` |
| Marketplace | `types/marketplace.ts` | `lib/api/marketplace.ts` | `hooks/useMarketplace.ts` | `components/marketplace/` | `app/(protected)/marketplace/` |
| Jelajah | `lib/jelajah/data.ts` | `lib/jelajah/data.ts` (via `apiClient`) | `lib/jelajah/use-*.ts` | `components/jelajah/` | `app/jelajah/` |
| Games | `lib/games/congklak/*.ts`, `lib/games/gasing/*.ts` | none (games record nothing) | none | `components/games/` | `app/main/` |

## Jelajah Nusantara (Phases 10 to 13)

Feature code lives only in `app/jelajah/`, `components/jelajah/`, `lib/jelajah/`, `public/jelajah/` (and `scripts/build-jelajah-geo.mjs`,
`scripts/optimize-jelajah-assets.mjs`, `scripts/check-jelajah-budget.mjs`, `scripts/build-concept-map.mjs`).

- `app/jelajah/page.tsx` (static) renders `JelajahHub` (client). `app/jelajah/[provinsi]/page.tsx`: `generateStaticParams` +
  `dynamicParams = false`, so only `ENTERABLE_PROVINCES` (`sumatera-selatan`) exist; every other slug is a 404.
  Since Phase 18 `/jelajah` and `/jelajah/*` need a login (`middleware.ts`); only the static files under
  `/jelajah/geo/`, `/jelajah/assets/` and `/jelajah/demo/` stay public. Navbar link "Jelajah" since Phase 18.
- Data (`lib/jelajah/data.ts`): provinces (`/daerah/provinces?limit=100`) and every public PROT (`/prot`, always
  `status=ARSIP_NASIONAL`, because `apiClient` sends the login token and kurator/admin would otherwise get drafts; 100 per
  page, max 50 pages), counted per province on the client. While loading or after an error, every province from
  `KNOWN_PROVINCES` (`lib/jelajah/provinces.ts`, the 35 production codes) is shown with 0 PROT, so the map still renders.
- Geometry (`lib/jelajah/geo.ts`, no three.js): GeoJSON → map units (1 unit = 1 degree, centred on 118°E 2.5°S), shapes
  matched to codes by normalized name (`matchShapesToProvinces`), point-in-polygon hit test, SVG paths, portrait framing.
- Views: `Map3D.tsx` (tiers full/lite; one merged non-indexed geometry with vertex colours for all provinces + one
  LineSegments for borders + the sea = 3 draw calls, ~39k triangles; `lib/jelajah/three/map-geometry.ts`; picking on the
  ground plane, not raycasting; drei `MapControls` without rotation; renders on demand in production) and `Map2D.tsx`
  (tier 2d, SVG, never imports three). Both take `MapViewProps` (`lib/jelajah/map-model.ts`). The "★ Pilot" marker is a DOM
  button positioned from the 3D scene each frame (drei `<Html>` rendered empty in the production build).
- **three.js isolation**: only `components/jelajah/Map3D.tsx`, `components/jelajah/three/*` and `lib/jelajah/three/*` may
  import `three` or `@react-three/*`; `Map3D` is only loaded via `next/dynamic(..., { ssr: false })` from `JelajahHub`, and
  `three/VillageScene3D` only the same way from `ProvinceExperience` (`tests/jelajah/three-isolation.test.ts`). three.js loads on
  no route except `/jelajah` and `/jelajah/[provinsi]`, and the 2d tier never fetches the three chunk.
- Tiers (`lib/jelajah/device-tier.ts`, `use-device-tier.ts`): automatic tier cached in `localStorage['jelajah.autoTier.v1']`,
  user override in `localStorage['jelajah.tier']` (settings menu "Tampilan"); every storage access is in try/catch.
- Budgets (`lib/jelajah/budget.ts`): 30 fps, 5 MB cold download for /jelajah, 100 draw calls, 100k triangles. The stats
  overlay appears only with `?debug=1` (Phase 13, see below); in development the probe still warns in the console when
  the set of exceeded budgets changes.
- Colours (`lib/jelajah/palette.ts`) are derived from the `app/globals.css` tokens; the theme comes from the `dark` class on
  `<html>` (`use-theme-mode.ts`, `useSyncExternalStore`), so the map recolours live when the navbar toggle is used.
- Everything simulated is labelled in the UI ("Demo"; simulated rewards "Simulasi · tidak disimpan") and never sent to
  the backend.

### Province scene engine (Phase 11)

`/jelajah/sumatera-selatan` is a walkable riverside village with 6 PROT stands. The engine is generic; a province is a data file.

- **Scene data** (`lib/jelajah/scenes/`): `types.ts` (`SceneDefinition`: assets, ground, river, plaza, paths, spawn, walkable
  rectangle, houses, stands in assignment order, decor with optional `collide` and `detail`, colours), one file per province
  (`sumatera-selatan.ts`) and the registry `index.ts` (`findScene(slug)`). Metres, +x east, -z north (river side); the camera
  looks north. Scene files may only use `import type` (the budget script loads them with Node type stripping). New province =
  new scene file + registry entry + slug in `ENTERABLE_PROVINCES`.
- **Engine** (`lib/jelajah/engine/`, pure, unit-tested in `tests/jelajah/scene-engine.test.ts` and `scene-prot.test.ts`):
  `stands.ts` (`assignStands`: PROT in name order onto the stands, empty stands = "Segera hadir", more PROT than stands → the
  last stand is a notice board listing the rest; `INTERACT_DISTANCE` 2 m from the stand footprint), `collision.ts` (circle and
  turned-box colliders for houses, stands and decor, walkable rectangle, push-out resolution with sliding; no physics
  library), `input.ts` (joystick and WASD/arrow keys → input vector), `scene-prot.ts` (the province's ARSIP_NASIONAL PROT from
  `lib/jelajah/data.ts` → plain-text `SceneProt`, https photos only (Phase 13: plus loopback http while the page itself runs
on a loopback host), shortened texts), `help-hint.ts` (controls hint shown once,
  `localStorage['jelajah.sceneHelpSeen.v1']`, try/catch).
- **Views**: `ProvinceExperience.tsx` (client: data, tiers, overlays: Demo label, back to the map, help hint, loading screen with
  progress, "Lihat" button, `StandPanel` side panel / bottom sheet with Esc and focus return, screen-reader stand list),
  `three/VillageScene3D.tsx` (full/lite), `ProvinceScene2D.tsx` (2d: illustrated header + PROT card grid, same panel, no three).
- **3D build-up** (`lib/jelajah/three/`): `village-geometry.ts` merges ground, plaza, paths, river banks, the procedural raised
  houses ("terinspirasi rumah limas", never described otherwise) and the stand pavilions into ONE vertex-coloured mesh;
  `model-bake.ts` bakes the Nature Kit materials to vertex colours for one `InstancedMesh` per model; `canvas-textures.ts` draws
  the stand signs (canvas sprites, not drei `<Html>`) and the blob shadow. One directional + one ambient light, no realtime
  shadows. The player (Kenney mini character, idle/walk) has a fixed-pitch follow camera and a silhouette pass (opaque render
  order scene 0 → fill 1 → edge 1.5 → player 2, `depthFunc: GreaterDepth`, stencil) so it stays visible behind roofs. Lite tier
  drops decor marked `detail` and the water streaks. Measured (dev overlay, spawn, 1440x900): Phase 11 full 43 draw calls /
  17.7k triangles, lite 34 / 9.2k; Phase 12 full 45 / 18.7k, lite 37 / 10.3k.
- **Assets** (`public/jelajah/assets/v1/`, versioned folder; bump to `v2/` instead of changing files in place): `nature.glb` and
  `player.glb`, built by `pnpm jelajah:assets --nature <dir> --characters <dir>` from packs downloaded to D: (never committed
  raw): meshopt (decoded by drei `useGLTF`), textures <= 1024 px as WebP, no KTX2. **Only CC0 packs**; every pack and the exact
  files used are recorded in `public/jelajah/assets/ASSET_LICENSES.md` (licence checked in the pack's own licence file).
- **Budget**: `pnpm check:jelajah` fails if a scene's asset files exceed 8 MB in total (or are missing) or any texture in
  `public/jelajah/assets/` (also inside .glb files) exceeds 1024 px. Phase 11: 195.6 KB of assets; cold load of the scene
  about 0.74 to 0.97 MB (3D) and 0.39 MB (2d).
- Scene text comes only from PROT data or neutral UI text; no cultural facts are invented.

### Camera, polish and simulated rewards (Phase 12)

- **Camera** (`lib/jelajah/engine/camera.ts`, pure, `tests/jelajah/camera.test.ts`): `frameCamera(aspect, spawnFramePoints(scene))`
  picks the field of view from the aspect ratio (62° portrait phone → 44° landscape) and the smallest distance at which the
  player, the two stands nearest to the spawn point (footprint and sign) and every sign top fit inside 92 % of the screen,
  with the player's chest in the lower third (`PLAYER_SCREEN_Y` -0.4). Fixed 40° pitch, never rotates; `smoothDamp` follow
  (no allocations per frame); `introPose` = 1.5 s glide from higher and farther, full tier only, skipped by any input and
  never with reduced motion (`lib/jelajah/use-reduced-motion.ts`). The camera's fov and pose are written inside `useFrame`
  (the React compiler lint forbids mutating hook values elsewhere). Phone 390x844: 62°, 23.5 m (Phase 11: 34.9 m).
- **Signs** (`lib/jelajah/engine/sign-text.ts`, pure, `tests/jelajah/sign-text.test.ts`): one size for every sign (3.8 m wide,
  canvas 512x200, just above the roof); the title is drawn at 64, 56 or 48 px in at most two lines and shortened with "…"
  otherwise (the full name is in the panel). The canvas passes a `measure` function, the tests a fake one.
- **Scene**: `SceneDefinition.centrepiece` (`PavilionDef`: neutral open pavilion, merged mesh, box collider); silhouette in
  the primary colour with a light edge (see Decisions log); ambient life on the full tier without reduced motion only:
  water colour shimmer and drift, palm sway and canoe bob through instance matrices with reused scratch objects.
- **Overlays** (`ProvinceExperience.tsx`): reward HUD under the title bar (left), messages below it (help hint, error,
  empty-province banner "PROT <provinsi> sedang dalam proses kurasi. …" with "Kembali ke peta", once per visit); on phones
  the stand prompt sits right of the joystick. Movement keys pause while the panel, Paspor or Misi is open; the stand
  panel ignores Esc while a `<dialog>` is open.
- **Simulated rewards** (`lib/jelajah/demo-rewards.ts`, no imports at all; `tests/jelajah/demo-rewards.test.ts`): pure rules
  (`enterProvince`, `openProt`, `questProgress`, `levelForXp`, constants in `DEMO_REWARD_RULES`), sessionStorage persistence
  (`jelajah.demoRewards.v2` since Phase 13, validated, try/catch) and a tiny store (`demoRewardsStore`, read with `useDemoRewards()`). UI:
  `RewardHud.tsx` (level badge, XP bar, "Simulasi · tidak disimpan", Paspor and Misi buttons; on the hub and in the scene),
  `PasporModal.tsx` (35 provinces from `KNOWN_PROVINCES`, stamped first; reset button), `MisiPanel.tsx` (one quest per
  enterable province), `DemoDialog.tsx` (native `<dialog>` with `showModal()`: focus trap, Esc, focus return). Toasts
  through the site-wide sonner Toaster (top centre since Phase 13, `announceRewards`); sonner turns its animations off
  with reduced motion. A test fails
  if any of these files imports API code or calls `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` or `EventSource`.
- **Measured** (Phase 12, production build): cold load `/jelajah` 664 to 684 KB, `/jelajah/sumatera-selatan` 715 to 742 KB
  (budget 5 MB / 8 MB); the three.js chunk (241 KB) loads only on the two /jelajah routes.

### Finish, real-device measurement and PROT photos (Phase 13)

- **Levels start at 1** (owner decision): level L needs 50 × (L − 1) × L total XP (L1 = 0, L2 = 100, L3 = 300);
  `MIN_LEVEL = 1`, `xpForLevel`, `levelForXp` in `lib/jelajah/demo-rewards.ts`; the HUD shows "Lv 1" at 0 XP. The state
  key moved to `sessionStorage['jelajah.demoRewards.v2']` (version 2), so Phase 12 state is ignored. The DEMO walk
  (105 XP) levels up exactly once, 1 → 2.
- **Toasts at the top centre, site-wide** (owner decision): `app/layout.tsx` `<Toaster position="top-center">` with
  `offset`/`mobileOffset` top `var(--toast-top, 72px)` (below the 64 px navbar). On the Jelajah pages
  `lib/jelajah/toast-clearance.ts` (pure, `tests/jelajah/toast-clearance.test.ts`) measures every element marked
  `data-toast-avoid` (title bar, "Tampilan", reward HUD, stand panel close button) and sets `--toast-top` just below the
  lowest one the toast's horizontal span would cover (sonner geometry: full width minus 16 px each side up to 600 px,
  otherwise 356 px centred). `useToastClearance()` re-measures on resize and overlay changes and resets on unmount;
  toast helpers call `placeToasts()` right before a toast. Measured: phone 390x844 and 360x740 toasts at y 229 (below
  the HUD), or below the panel close button while the bottom sheet is open; desktop y 72. No per-toast `position`.
- **Phone stand prompt** (`components/jelajah/StandPrompt.tsx`, tests in `tests/jelajah/stand-prompt.test.tsx`): on touch
  screens an empty stand shows "Segera hadir" (one line); a tap opens the full neutral message in a bubble above it.
  PROT names are clamped to two lines next to "Lihat". Every overlay was checked at 360x740 (no overflow, no overlap).
- **`?debug=1`** on `/jelajah` and `/jelajah/[provinsi]` (`lib/jelajah/use-debug-flag.ts`, read after hydration): the
  overlay (`StatsOverlay` in `components/jelajah/three/StatsProbe.tsx`, right edge, vertically centred) shows fps
  (2 s average, `FpsWindow` in `lib/jelajah/perf.ts`), draw calls, triangles, tier, `devicePixelRatio` → renderer pixel
  ratio, and the canvas size in device pixels. Without the flag neither probe nor overlay is mounted in production
  (development mounts only the probe for the console warnings). The hub map renders continuously only while the flag
  is on (otherwise on demand).
- **Automatic fallback** (province scene only; the hub map renders on demand, so idle time would look like low fps):
  `AutoFallbackProbe` (mounted only while the tier is automatic) feeds `fallbackStep()` (`lib/jelajah/perf.ts`, tests in
  `tests/jelajah/perf.test.ts`): 2 s average below 24 fps for 5 s → lite; on lite below 20 fps for another 5 s → 2d.
  Measuring starts after the 1.5 s intro (full tier) and needs a full 2 s window; a hidden tab resets the window and
  the timer. The result is cached in `localStorage['jelajah.autoTier.v1']` like the measured automatic tier
  (`useDeviceTier().fallBack`, exported `writeCachedAutoTier`); toast "Beralih ke mode Ringan agar lebih lancar" (or
  "Beralih ke Peta 2D agar lebih lancar"). A manually chosen tier is never overridden.
- **PROT photos** (`components/prot/ProtPhoto.tsx`, tests in `tests/prot/prot-photo.test.tsx`): next/image through Vercel
  Image Optimization for https URLs on `nusantara-play-storage.s3.ap-southeast-2.amazonaws.com` under `/prot/` without a
  query (`images.remotePatterns`, kept in sync by a test; since Phase 14 also `minimumCacheTTL`); every other URL is
  shown unoptimized. Two display sizes only: `cover` 400 px (srcset 640 / 828; /prot cards, detail main image, stand
  panel) and `thumb` 80 px (96 / 256; detail thumbnails, equipment photos, Jelajah 2d cards and hub card). The first
  visible photo is eager with `fetchpriority="high"`, all others lazy. On an optimizer error (for example the Hobby
  limit's 402) the original URL is shown. Used by `components/prot/ProtCard.tsx`, `app/prot/page.tsx`,
  `app/prot/[id]/page.tsx`, `components/jelajah/StandPanel.tsx`, `ProvinceScene2D.tsx`, `ProvinceCard.tsx`, and since
  Phase 14 the featured PROT on the landing page (`app/page.tsx`).
- **Local DEMO photo**: `public/jelajah/demo/foto-contoh.svg` (neutral placeholder, "Gambar contoh, bukan foto PROT") is
  the one photo of "DEMO PROT Sumsel 1" in the local seed. `firstPhoto()` accepts http only for a loopback photo host and
  only while the page itself is on a loopback host (`isLocalPage()`); the deployed site stays https-only.
- **Measured** (Phase 13, production build, headless Chrome, cache off): `/prot` phone cold load 2983 KB → 617 KB (desktop
  3009 → 567 KB); PROT detail 4606 → 455 KB and 2813 → 410 KB; `/jelajah` 670 to 690 KB; `/jelajah/sumatera-selatan` 727
  to 745 KB; the three.js chunk (241 KB) loads only on the two /jelajah routes. Debug overlay at spawn (1440x900,
  SwiftShader): full 45 draw calls / 18.7k triangles, lite 37 / 10.3k; hub 3 / 39.3k.

### Intro bumper (Phase 16)

A short animated tour of the whole site that covers `/jelajah` before the map (owner decision; Decisions log).

- **Structure**: `components/jelajah/bumper/` = `JelajahBumper.tsx` (full-screen `role="dialog"` at `z-[60]` above the
  navbar; progress dots, "Lewati", hint line, `AnimatePresence` cross-fade between scenes, keys, focus, scroll lock),
  `SceneLayout.tsx` (shared layout and framer-motion variants; `BumperReducedMotion` context switches every variant to a
  plain fade) and one file per scene: `BrandScene`, `ProtScene`, `MapScene`, `GameScene`, `CommunityScene`,
  `StartScene`. `lib/jelajah/bumper/` = `timeline.ts` (framework-free controller: auto-advance per scene, `next`, `skip`,
  pause while the tab is hidden with the remaining time kept, manual mode; fake-timer tests), `use-bumper-timeline.ts`
  (React wrapper, `visibilitychange`), `session.ts` (once-per-session rule), `scene-data.ts` (storyboard, data and texts,
  fallbacks). `SITE_NAME` and `SITE_TAGLINE` come from `lib/brand.ts` (Phase 18; `lib/jelajah/brand.ts` was removed),
  like every other place that shows the name.
- **Storyboard** (`BUMPER_SCENES`, 19 s): 1 brand (site icon `/apple-icon.png`, `SITE_NAME`, tagline) · 2 Arsip PROT (the
  hub's `totalProt` and up to 4 PROT photos through `ProtPhoto` `cover`, one per province first) · 3 Jelajah Nusantara
  (flat SVG of the hub's own province shapes via `svgPath`, provinces with public PROT in the primary colour, their
  count) · 4 "Segera hadir: mainkan permainan tradisional langsung di sini." · 5 events and members from
  `GET /stats/landing` through `apiClient` (tiles only for numbers above 0; on failure no numbers) · 6 XP and Paspor with
  `SIMULATION_LABEL` ("Simulasi · tidak disimpan") and the large "Mulai Jelajah" button. 3 s each, the last 4 s; after it
  the bumper ends by itself. Unknown numbers (loading, error) are left out of the text, never guessed.
- **Controls**: "Lewati" always visible (Esc, `aria-keyshortcuts`); tap or click anywhere or Enter = next scene (Enter is
  intercepted, so it never presses the focused "Lewati"); focus starts on "Lewati", Tab cycles inside; at the end the hub
  focuses its "Tampilan" button (`data-jelajah-menu`). Reduced motion: opacity fades only and no auto-advance (the
  current dot is shown full, the hint says "Ketuk atau tekan Enter untuk lanjut").
- **Once per day** (Phase 17; Phase 16 was once per session): `lib/jelajah/bumper/session.ts` stores the local date
  (`YYYY-MM-DD`) in `localStorage['jelajah.bumperLastPlayed.v1']` when the bumper mounts; it plays again on a later
  date. When localStorage is missing or throws (read or write), the Phase 16 rule takes over:
  `sessionStorage['jelajah.bumperSeen.v1'] = '1'`, plus an in-memory flag per page load. Every access in try/catch.
  `ProvinceExperience` also marks it, so deep links never lead to the bumper. "Putar intro" (bottom of the hub's
  "Tampilan" menu, `TierMenu` prop `onReplayIntro`) replays it any time.
- **Scene 4** (Phase 17): "Main congklak langsung di sini, tanpa masuk akun." and a "Main Congklak" button
  (`data-bumper-action`, so Enter presses it instead of advancing) that skips the bumper and opens
  `/main/congklak?from=jelajah`.
- **Phase 19**: after the bumper (or without it when it is not due) the concept video plays on the first visit per
  browser; see "Concept video (Phase 19)".
- **Preload** (`JelajahHub`): the hub always mounts (`inert` while covered). Server render and hydration show a plain
  cover in the bumper's colour; after mount the hub decides with `shouldAutoPlayBumper()`. On a first visit the
  auto-played bumper waits until `useDeviceTier().autoTier` is known (its 0.7 s fps probe must not measure the bumper;
  at most `BUMPER_TIER_WAIT_MS` 3 s). Meanwhile and during the bumper the hub loads the PROT data, the geometry and, for
  the full/lite tiers, the Map3D chunk; the 2d tier still never fetches three.js, and the bumper itself imports none
  (`tests/jelajah/bumper-scenes.test.tsx`). If the map is not ready when the bumper closes, the existing
  "Menyiapkan peta…" / "Memuat peta 3D…" state shows.
- **Weight**: framer-motion was already on every page (navbar theme toggle), so the bumper adds only its own code, the
  6 KB icon and the stats JSON. Measured (Phase 16, production build, production API read-only, headless Chrome, cache
  off): `/jelajah` cold load without the reused PROT photos phone 692 KB / desktop 712 KB vs `main` 666 to 672 KB /
  692 KB (+20 to 26 KB; budget +150 KB); the bumper's 4 PROT photos 156 to 220 KB (the shared `cover` variants). The map
  was rendered behind the bumper 1.5 to 5.4 s after navigation and was usable 371 to 391 ms (the 0.35 s fade-out) after
  "Mulai Jelajah". three.js still loads only on the two /jelajah routes.

### Concept video (Phase 19)

"Kenali" + `SITE_NAME`: a ≈48 s code-driven motion-graphics film between the intro bumper and the `/jelajah` map (owner
decision). React + framer-motion + SVG/CSS + an optional particle canvas; no video file, no three.js, no audio.

- **Gate** (`lib/jelajah/concept/gate.ts` `planIntro`, `seen.ts`; integrated in the hub's intro stage machine
  `pending → bumper → concept → done` in `JelajahHub.tsx`, tested in `tests/jelajah/concept-gate.test.ts`): the bumper keeps
  its once-per-day rule; the concept video plays by itself only on the first `/jelajah` visit per browser:
  `localStorage['np_concept_seen_v1'] = '1'` once it has played 1 s or ended (skipped too). localStorage failing → the same
  key in `sessionStorage`, then an in-memory flag; every access in try/catch. Order: bumper (if due) → concept (if unseen)
  → map. `/jelajah?concept=1` forces it (testing, like `?debug=1`). The bumper's "Main Congklak" leaves without starting
  it (`onLeave`); province pages do not mark it. "Tonton pengenalan" (bottom left of the map; icon + text from `md`, icon
  with aria-label on phones, 44 px) replays it; focus returns to that button.
- **Loading**: `components/jelajah/concept/ConceptVideo.tsx` only through `next/dynamic(..., { ssr: false })` from the hub
  (tested); requested only when it plays: 37.9 KB gz in 3 files (film 27.9 KB incl. captions and map paths, the
  `next/image` runtime 7.5 KB, the congklak core 2.5 KB; framer-motion is already on every page). The hub imports only
  `gate.ts` and `seen.ts`; the replay label `CONCEPT_REPLAY_LABEL` lives in `gate.ts` for that reason (importing
  `script.ts` put every caption into `/jelajah`'s initial JS, found in the Phase 19 build) and is re-exported by the script.
  While it plays, the hub stays mounted (data, geometry), prefetches the Map3D chunk (full/lite) and, if the 3D map is not
  mounted yet, mounts it from the last scene on; the hub is `invisible` (not painted) under the film.
- **Script = the one file to edit copy**: `lib/jelajah/concept/script.ts`: `CONCEPT_SCENES` (id, start, duration ms,
  caption, subcaption, `fadeIn`, `still`), `BEATS` (moments inside a scene, ms from its start), `CONCEPT_TEXT` (buttons,
  stamp, passport, XP chip, audiences, card fields, dialog label), `archiveSubcaption` (scene 4's live line, null for 0 or
  unknown), `FINAL_HOLD_MS` 3 s, `REDUCED_STEP_MS` 5 s, `CONCEPT_MUSIC` (TODO hook, `src: null`). Change the strings, keep
  captions ≤ 70 characters and the timings contiguous (≈48 s), then `pnpm test`: `tests/jelajah/concept-script.test.ts`
  checks timings, beats, length, the brand and the forbidden words (poin, points, hadiah, uang, multiplayer). The brand
  only through `SITE_NAME`.
- **Scenes** (`components/jelajah/concept/scenes/`, art in `art/` = `Courtyard`, `MapArt`, `Village`, `MiniBoard`; shared
  `scene-kit.tsx`): 1 halaman, 2 terlupa, 3 nusantara, 4 arsip, 5 jelajah, 6 main, 7 bersama, 8 mulai. Each is a pure
  function of its local-time MotionValue. Three compositions (`lib/jelajah/concept/layout.ts`: portrait, landscape phone =
  height < 560, desktop) on full-screen art boards (`Stage`, `meet`, backgrounds bleed). Live data only from the hub:
  scene 4 cards = real published PROT names (one per province first; neutral cards without names otherwise) and the
  published counts; scene 6 = three real congklak moves (`lib/jelajah/concept/congklak-demo.ts`, the real engine, legal
  moves only) and the pilot province's stamp. The film's colours are fixed (the site theme does not change it).
- **Player**: ONE rAF clock (`lib/jelajah/concept/clock.ts`, fake-frame tests; at most 250 ms per frame) drives a
  MotionValue; React renders only at scene changes. "Lewati" (top right, 44 px, Esc) skips; Enter/Space on the last scene
  or "Mulai Menjelajah" continue; untouched it continues 3 s after the end; a pointer or key on the last scene holds it.
  Pauses while the tab is hidden. `role="dialog"` `aria-modal` `aria-label` "Pengenalan " + `SITE_NAME`; focus on the
  dialog, Tab trapped, back to the map's menu (or the replay button) on close; captions are text in an
  `aria-live="polite"` region; 18 px at 360 px, at most 2 lines (measured at 360x740, 390x844, 844x390). Reduced motion:
  the same 8 scenes as stills (`still` frame), cross-fades, "Lanjut" or every 5 s, no particles, no camera moves.
- **Particles** (`ParticleField.tsx`, `lib/jelajah/concept/particles.ts`): full 300, lite 120, 2d none (SVG fallback);
  dropped for the rest of the film when the 2 s average stays below 30 fps for 3 s. Deterministic (time + seed).
- **Performance rules** (measured; Decisions log): only transform and opacity animate; everything that moves sits on its
  own compositor layer (`LIVE`, `<Stage live>`), never in the same layer as a full-screen background; camera moves are
  CSS transforms (`cameraCss`); the lit map is painted once and revealed by a transform-only wipe.
- **Debug and tests**: `?debug=1` adds an overlay (fps over 2 s, tier, particles, layout, film time);
  `window.__nlConcept` (`seek`, `pause`, `resume`, `time`, `scenes` with their mid and still times) exists in development
  and with `?debug=1` in production.
- **Regenerate the map paths**: `pnpm concept:map` (`scripts/build-concept-map.mjs`: mapshaper on
  `public/jelajah/geo/indonesia-provinces.json`, names → codes with `lib/jelajah/provinces.ts`, integer relative paths,
  fails at 60 KB; 23 KB, 34 provinces) and commit `lib/jelajah/concept/indonesia-paths.ts` (`tests/jelajah/concept-map.test.ts`).
- **Re-record the film**: a local production build with a logged-in session (locally the frontend cannot log in: Phase
  19 used a fake Supabase auth endpoint on localhost plus a session cookie, scratch only, never committed; Phase 19
  report), Playwright `recordVideo` at 1920x1080 and 1080x1920 on `/jelajah?concept=1` until the dialog closes, temp files
  on D: only; then `ffmpeg -i concept.webm -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p concept-1080p.mp4`
  (this machine had no ffmpeg in Phase 19, so the `.webm` files were kept).
- **Measured** (Phase 19, production build, headless Chrome with software rendering, whose ceiling is about 51 to 58 fps
  even for an empty page): 4x CPU throttling, whole film: desktop 1440x900 full tier average 40.6 fps (worst scene
  terlupa 27, including a 1.6 s first-paint stall), phone 390x844 dpr 3 full 47.7 (worst 37), lite 46.6, 2d 50.7; no
  throttling desktop 45.6. The first version ran at 6.3 (desktop) and 14.6 (phone) fps before the layer rules above.
  `/jelajah` JS with both intros already seen: +1.6 to 1.7 KB vs `main` (2d tier desktop 283.0 → 284.6 KB, full tier
  531.1 → 532.8 KB). Real phones not measured yet: use `?debug=1`.

## Games (Phase 17)

Hosted games, public, no login. **Games record nothing yet** (shared section, item 11): no network calls, no API
imports, only local settings (`tests/games/games-record-nothing.test.ts`). three.js never loads on `/main` routes.

- **Folders**: `lib/games/` (pure TypeScript, no React), `components/games/<game>/`, `app/main/` (`page.tsx` lists
  `GAMES` from `lib/games/registry.ts`; `/main` and `/main/*` are public in `middleware.ts`).
- **Congklak engine** (`lib/games/congklak/`):
  - `rules.ts`: THE rules config ("Aturan dasar": `holesPerSide` 7, `seedsPerHole` 7, `captureRequiresLap` false,
    `maxSowPerMove` 10,000). A curator changes rules only here; the "Cara bermain" text (`rules-text.ts`) is generated
    from it, so the sheet always matches the engine.
  - `core.ts`: the whole engine and AI in ONE self-contained function `congklakCore()` (type-only imports, no
    classes/async/generators; see Decisions log) so it can run in a Blob worker. `state.ts` (board model: ring of 16
    pits, 0..6 player 0, 7 their store, 8..14 player 1, 15 their store; opposite of i = 14 − i), `engine.ts`
    (`applyMove()` → new state + ordered events `pickup`, `sow`, `relay`, `capture`, `extra-turn`, `turn-end`, `sweep`,
    `game-over`; `simulateMove()` without events), `ai.ts` (Mudah random, Sedang best immediate result, Sulit
    alpha-beta with iterative deepening and a 300 ms limit) and `random.ts` (seedable mulberry32) are typed wrappers.
  - `replay.ts` (events → pit counts for the animation; replaying all events equals the final state, tested),
    `playback.ts` (step timing: Normal 230 ms, Cepat 90 ms per seed, faster after 40 seeds), `layout.ts` (SVG geometry
    of both board orientations, seed spiral), `announce.ts` (names, aria-live text, results), `settings.ts`
    (`localStorage['games.congklak.settings.v1']`: mode, level, speed), `from-link.ts` (allowlisted back link).
  - **AI worker**: `ai-worker-source.ts` (core source + message handler) → `ai-client.ts` (Blob URL worker, one per
    game page, terminated on unmount; main-thread fallback with a 40 ms limit). `ai-protocol.ts` has the messages.
- **Page** (`components/games/congklak/`): `CongklakGame.tsx` (start → play → end, animation driver, computer turns,
  "Lewati animasi", aria-live messages, `data-*` state attributes used by the headless checks), `StartScreen.tsx`,
  `RulesSheet.tsx` (reuses `components/jelajah/DemoDialog.tsx`), `CongklakBoard.tsx` (SVG wood board, memoized pits,
  roving tabindex: arrows choose, Enter plays; illegal holes disabled; hand marker; capture highlight). Portrait
  phones (max 767 px) get the vertical board; everything fits 360x740 without scrolling (holes 46 px there).
- **Jelajah link**: `PavilionDef.game` (scene data; Sumatera Selatan's centrepiece has `game: 'congklak'`);
  `lib/jelajah/engine/pavilion.ts` `nearestTarget()` (stand or pavilion within `INTERACT_DISTANCE`, the closer
  wins); `components/jelajah/GamePrompt.tsx` ("Paviliun permainan" + "Main Congklak"; on phones one full-width
  button right of the joystick; E opens it too) and `GameCard` on the 2d tier. `GAME_LINK_PROVINCES` in
  `from-link.ts` must list exactly the scenes with a game pavilion (tested).
- **Measured** (production build, headless Chrome, cache off): `/main/congklak` cold load phone 344 KB, desktop
  364 KB, of which about 20 KB is the shared navbar prefetching `/calendar` and `/menu` at idle (desktop only; the
  page's own load is about 344 KB on both). The game's own chunk is about 20 KB gzip; starting a game downloads
  nothing (the worker is a Blob). Scripted games: no long task during AI turns (all levels; Sulit also at 4x CPU
  throttling); at 4x throttling the only long tasks were mounting the board (58 to 102 ms) and the end screen (54 to
  64 ms).
  Phase 18 (navbar links to `/calendar`, `/menu`, `/jelajah` no longer prefetched): phone 341 KB, desktop 355 KB
  (`main` 342 / 361 KB).

## Gasing (Phase 20)

The second hosted game, built like congklak: public, no login, records nothing (shared section item 11), 2D canvas
(no three.js, no image files, no new dependency). Two modes against the computer (Mudah, Sedang, Sulit): **Uri**
(both throw once per round, the longer spin wins) and **Pangkah** (the target spins first, the other side throws to hit
it; roles swap each round). Best of 3; a drawn round is replayed (at most `maxRounds` 5).

- **Archive basis**: the rules text and "Tentang permainan ini" paraphrase and credit the published PROT record "Gasing"
  (Kepulauan Riau, Kabupaten Natuna, id `5ed247fd-e45b-4308-bfbe-74c49fbb6557`, fetched read-only in Phase 20), with a
  link to `/prot/<id>`. The text is stored in `texts.ts` (games may not call the network). Nothing beyond the record is
  claimed; the simplifications (both tops identical, fixed turn order) are stated in the rules sheet.
- **Files**: `lib/games/gasing/` (pure, no React/DOM): `rules.ts` (THE curator file: "Aturan dasar", `roundsToWin` 2,
  `maxRounds` 5, `arenaRadius` 1, `outIsLoss`), `texts.ts` (EVERY Indonesian string: UI, modes, tutorial, rules generated
  from `rules.ts`, curator note, archive credit), `types.ts`, `random.ts` (mulberry32), `physics.ts`, `throw.ts`,
  `outcome.ts`, `ai.ts`, `match.ts`, `settings.ts`, `from-link.ts` (re-exports congklak's allowlisted `backLinkFor`),
  `sound.ts` (no audio yet: `cueSound()` hook, `GASING_SOUNDS` all null). `components/games/gasing/`: `GasingGame.tsx`
  (start and play, toolbar, sheets, `?from=`, `?debug=1`), `GasingArena.tsx` (canvas loop, input, HUD, overlays),
  `render.ts` (all drawing), `StartScreen.tsx`, `InfoSheets.tsx` (rules + about, `DemoDialog`), `Tutorial.tsx`.
  `app/main/gasing/page.tsx` (static, metadata `Gasing · ${SITE_NAME}`).
- **Physics** (`physics.ts`, tests `tests/games/gasing-physics.test.ts`): fixed step 1/120 s, seeded RNG kept in the
  world, no Date/Math.random. Top-down 2D; arena radius 1, top radius 0.085. A throw flies from its side of the ring
  (power → landing distance 0.3 to 1.95 and part of the spin; quality → the rest of the spin, the starting tilt and the
  landing scatter); on the ground: rolling friction + drag, spin decay (faster when tilted), tilt grows below the
  critical spin, precession wander paid for with spin energy, fall at tilt 1 or spin ≤ 3 rad/s (spin 0 = stopped),
  centre outside the ring = out. Collisions: disc impulse (restitution 0.55), Coulomb rim friction, spin loss and tilt
  kick per top proportional to its own speed change; a top landing on the other hits it from the first contact point
  ("Pangkah tepat!"). `simulate(world, inputs, steps)` is the pure headless runner. Invariants tested: determinism,
  energy never increases without a throw, zero spin = stopped, ring exit, collision symmetry (mirror and swap).
- **Round rule** (`outcome.ts`): out = loses at once; otherwise the shorter spin (measured from its own landing) loses,
  decided as soon as it is certain; within 0.05 s = draw. The HUD timers freeze at the decided times.
- **Throw input** (`throw.ts`, tests `gasing-throw.test.ts`): pointer slingshot (press anywhere in the arena, drag back,
  aim = opposite of the drag with the arena tilt undone, power = length / max drag, release in the dead zone = cancel)
  and keyboard (← → aim, ↑ ↓ power, hold Space, release) share ONE rule, `evaluateRelease`: steadiness (pointer spread
  in the last 150 ms; keyboard 0.5 if an arrow was pressed then), winding (steady hold, full after 450 ms), the perfect
  window for 450 ms after that (bonus spin ×1.07, half the bad tilt, a third of the scatter, "Lemparan mantap!"), then
  the string slips (quality down to ×0.85).
- **AI** (`ai.ts`, tests `gasing-match-ai.test.ts`): plans like the player (spin: land short of the centre, away from
  the other top; strike: land on the target with drift lead), executed with per-level noise (`AI_PROFILES`); the Sulit
  striker simulates 12 candidates for 300 steps (about 1.5 ms median on a desktop) on the main thread, no worker.
  Calibration test: the documented `TYPICAL_HUMAN` (±0.05 rad aim, ±0.06 power, quality 0.5 to 0.92, perfect 1 in 3)
  plays 300 seeded matches per mode and level; measured player win rates: Uri 75.3 / 51.3 / 27.0 %, Pangkah
  76.7 / 55.7 / 32.0 % (targets 75 / 50 / 30 ± 10).
- **Page**: canvas loop = fixed-step accumulator with interpolated drawing, at most 12 steps per frame, dpr capped at 2,
  paused while the tab is hidden or the tutorial or a dialog is open. The static arena is its own canvas, drawn on
  resize only; the shake is a CSS transform of the canvas layer; spin meters use `scaleX` (no layout per frame). Do NOT
  use `desynchronized: true` on the canvas (it bypassed the compositor: the tops were missing from screenshots).
  Colour-blind safe sides: player warm (red/amber) with dots and a round knob, computer cool (blue/teal) with stripes
  and a flat knob; the HUD swatches match. Reduced motion: no shake, fewer particles, no haptics (`navigator.vibrate`
  on hits otherwise). Landscape phones (height ≤ 500 px) get the HUD in a side column and compact cards. Tutorial:
  3 steps (Tarik, Arahkan, Lepas), skippable, `localStorage['games.gasing.tutorialSeen.v1']`; settings
  `localStorage['games.gasing.settings.v1']` (mode, level); every access in try/catch.
- **Debug**: `?debug=1` shows fps (2 s average, dpr, canvas size) and exposes `window.__nlGasing` (`stage`, `round`,
  `wins`, `results`, `world`, `throw(t)`, `fps`); `&canvas=cpu` switches to a CPU-backed 2D canvas for comparison.
- **Links**: the `/main` card sits next to Congklak (registry order), game links have `prefetch={false}`;
  `?from=jelajah` / `?from=jelajah-<province>` give congklak's back links. The Jelajah pavilion and the bumper still
  open congklak only (`PavilionDef.game` is typed `'congklak'`): adding gasing there needs a union type, a per-game label
  and href in `GamePrompt` / `GameCard`, and a game-aware `GAME_LINK_PROVINCES` (Phase 20 report).
- **Measured** (Phase 20, production build, headless Chrome with software rendering): the game's own JS 28.0 KB gzip
  (81.7 KB raw, 2 chunks; budget 60 KB); `/main/gasing` all JS 276 KB gzip. Pangkah collision, 2.5 s after the throw:
  phone 390x844 39.7 fps (CPU ×1) / 40.6 fps (×4); desktop 1440x900 21.1 / 21.5 fps (the large canvas is slow to
  composite in software rendering; a CPU-backed canvas gave desktop 40 / 27, phone 52 / 39). Real devices not measured
  yet: use `?debug=1`.

## Brand, navbar and the Jelajah login gate (Phase 18)

- **Brand**: `lib/brand.ts` has `SITE_NAME` ("Nusantara Legacy"), `SITE_TAGLINE`, `SITE_DESCRIPTION` and
  `SITE_NAME_WORDS` (the landing hero's two lines). Navbars, footer, landing page, auth layout and forms, admin
  header and sidebar, calendar, the old `/landing-page/1` and `/2`, metadata (title, description, Open Graph) and
  the bumper all read it. `<html lang="id">`. `tests/config/brand.test.ts` fails if "Nusantara Virtual" appears in
  `app/`, `components/`, `lib/` or `public/`. "Tur Virtual" is a feature name, not the brand. The logo is unchanged.
- **Navbar links** (`components/ui/nav-links.ts`, one list for every menu): app navbar Menu, Kalender, Jelajah, Game
  (desktop from `md`; below `md` a menu button next to the theme toggle opens the same links, closes on a link, Esc
  or an outside click); landing navbar "Tur Virtual" and "Game" from `md` (section anchors from `xl`) and in a
  second row below the bar on phones (`main` starts at 7.5rem there). `prefetch={false}` for `/jelajah`,
  `/calendar`, `/menu` (`NO_PREFETCH_ROUTES`, tested), also for the landing hero links to `/menu` and `/jelajah`
  and the carousel slide. The active link gets `aria-current="page"` (`isActiveLink`: the page or a sub-page).
- **Login gate**: `middleware.ts` `routeDecision(loggedIn, pathname, search)` (pure, tested). `loggedIn` is whatever
  the frontend's login says today (Supabase `updateSession`); when the frontend switches to the self-hosted login,
  only the caller changes (and the Google flow below). Logged out on `/jelajah` or `/jelajah/*` →
  `/login?redirectTo=<path+query>&reason=jelajah`; other protected pages → `/login?redirectTo=…`; logged in on
  `/login`/`/signup` → the valid `redirectTo`, else `/profile`. `/main` and `/main/*` stay public.
- **redirectTo rules** (`components/auth/login-redirect.ts`, `safeRedirectPath`): a same-site path only. Starts with
  exactly one `/`, no `\`, no control characters or whitespace, at most 2048 characters, resolves to the same origin,
  not `/login` or `/signup`; anything else falls back to `/menu`. Attack strings (`//evil.com`, `https://evil.com`,
  `/\evil.com`, `javascript:`, `@evil.com`) are tested.
- **Login paths**: the login and signup pages read `redirectTo`, `reason` (and `error`) from `searchParams` (dynamic
  pages) and pass them to the forms. Email/password → `loginAndRedirect()` → `router.push(target)`. Google → the
  button stores the target in the cookie `np_post_login` (10 minutes, SameSite=Lax) and keeps the Supabase redirect
  URL exactly `/auth/callback` (allowlist unchanged); the callback takes a valid `next` query, else the cookie, else
  `/menu`, clears the cookie, and on failure goes back to `/login?error=auth_callback_error` with the target and the
  notice. (Before Phase 18 the callback followed `next` unvalidated: an open redirect.) The signup page shows the same
  notice and keeps `redirectTo`/`reason` on its links. Signup by email still confirms through Supabase's own link
  (lands on the Supabase Site URL; unchanged).
- **Notice**: `components/auth/LoginNotice.tsx` (`role="status"`) for `reason=jelajah`: "Masuk dulu untuk memulai Tur
  Virtual. Setelah masuk, kamu langsung diarahkan ke peta." Since Phase 19 the login form shows no "Masuk sebagai Tamu"
  for `reason=jelajah`, but "Peta Jelajah memerlukan akun. Game di menu Game tetap bisa dimainkan tanpa akun." with
  "menu Game" linking to `/main` (`JELAJAH_GUEST_NOTE` in `login-redirect.ts`); without the reason it is unchanged. The landing "Mulai Tur Virtual" button still links to
  `/jelajah`; logged-out visitors see "Perlu masuk akun" under it (`aria-describedby`).
- **Landing statistics** (`components/landing/published-stats.ts`): PROT and provinces from published PROT only, with
  the map's own code (`fetchPublicProt` + `shapeProvinceSummaries` over `KNOWN_PROVINCES`, server-side, no login
  token, 60 s cache); events and members from `/stats/landing`. Tiles that are 0 or unknown are hidden; with no tile
  the section is hidden. Production on 2026-11-19: 5 Permainan, 5 Provinsi, 1 Events, 53 Anggota. Since Phase 19 the
  featured PROT cards request `status=ARSIP_NASIONAL` too and filter the result again
  (`components/landing/featured-prot.ts`), so a curator's or admin's token never shows unpublished PROT on `/`.
- **Congklak store totals** (`components/games/congklak/store-label.ts`): a solid pill (#FFF4DF, dark outline, 26 px
  bold) at one end of the store and the owner's name at the other, outside the seed cluster in both orientations
  (tested against the seed spiral's reach for every possible total).

## Public page images (Phase 14)

- **Remote photos** (S3 uploads): `ProtPhoto` only, two display sizes (`cover` 400 px → 640 / 828, `thumb` 80 px →
  96 / 256). Only `https://nusantara-play-storage.s3.ap-southeast-2.amazonaws.com/prot/**` without a query is
  optimized (`images.remotePatterns`, one entry, synced by `tests/prot/prot-photo.test.tsx`); anything else is shown
  unoptimized. Before optimizing another bucket folder (for example NFT images under `/images/nfts/`), generalize
  `ProtPhoto` into a small `RemotePhoto` and add that exact prefix (https, `search: ''`), still at most two sizes.
  Events and NFT pages load no remote images in production today (Phase 14), so they still use plain `<img>`.
- **Cache**: `images.minimumCacheTTL` 31 days (`IMAGE_MINIMUM_CACHE_TTL_SECONDS` in `next.config.ts`). It relies on
  the backend never reusing an S3 key (`<folder>/<uuid>.<ext>`); lower it if that changes.
- **Static images that are not always visible**: use `getImageProps` from `next/image` with a static import inside
  `<picture>`, the optimized srcset on a `<source media=...>` and a data-URI `<img>` fallback, so hidden viewports
  download nothing (`components/ui/HeroCarousel.tsx`, `tests/landing/landing-images.test.tsx`). The slide visible on
  load is eager with `fetchPriority="high"`; others are lazy. File names in `public/images/` use only `a-z0-9.-`
  (tested for `public/images/landing/`).
- **Other landing images** (Phase 18): `nusantara-legacy.webp`, `arsip.webp`, `komunitas.webp`, `sertifikasi.webp` are
  static imports through `next/image` (`fill`, lazy, `sizes` in `components/landing/image-sizes.ts`, computed from
  their boxes); `blockchain.webp` (`hidden lg:block`) goes through `components/landing/DesktopOnlyImage.tsx`
  (`getImageProps` + `<picture>`/`<source media="(min-width: 1024px)">`, data-URI `<img>`), so phones never
  download it. No plain `<img>` is left on `/` (tested). Phone `/` cold load 674 → 433 KB (939 → 765 KB after
  scrolling to the bottom), desktop 801 → 600 KB (production API read-only, headless Chrome, cache off).
- **Measured** (production API read-only, production build, headless Chrome, cache off; phone 390x844 dpr 3):
  `/` phone 1597 → 666 KB cold (893 KB after scrolling to the bottom), desktop 1594 → 754 KB; `/prot` 616 KB;
  `/events` 334 KB, event detail 348 KB, `/nfts` 334 KB, NFT detail 370 KB (unchanged, no images);
  `/jelajah` 669 to 694 KB, `/jelajah/sumatera-selatan` 729 to 761 KB; three.js only on the two /jelajah routes.
- **Fonts**: Plus Jakarta Sans (body, `font-sans`) and Geist Mono (`font-mono`) are really displayed since Phase 14
  (`@theme inline` in `app/globals.css`); before, every page used the system font stack.

## Env Vars

See `.env.example` (copy to `.env.local`). `.env*` files are git-ignored except `.env.example`.

```
NEXT_PUBLIC_BACKEND_API_URL    # Backend base URL incl. /api. Required in development (http://localhost:3000/api); in production used only server-side (the browser uses /backend-api).
BACKEND_ORIGIN                 # Optional, build time. Origin behind the /backend-api rewrite (default https://api.nusantaralegacy.org); https only (http for localhost), no path, no trailing slash.
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Current direction

1. We are building "Jelajah Nusantara": a lightweight 3D virtual world inside Nusantara Play. Users pick a province on a map of Indonesia, walk around a small village scene, interact with PROT objects (only PROT with status ARSIP_NASIONAL), meet other players (multiplayer), and earn rewards.
2. Rewards come in two currencies. XP gives levels and leaderboard rank and is never redeemable. Points will later be redeemable for in-platform rewards (marketplace vouchers, NFT badges). Points can never be cashed out to money and never transferred between accounts.
3. Golden rule for rewards: the browser is never trusted. The client only reports actions; the backend validates them and decides every reward. Every point change goes through an append-only ledger with server-built idempotency keys.
4. Authentication is being migrated away from Supabase to a self-hosted auth module in the NestJS backend (Phase 07 = foundation, Phase 08 = login/register/refresh endpoints and cookies, later Google OAuth). Until the migration is done, do not add any NEW dependency on Supabase. Design (Phase 07):
   - Passwords: Argon2id via `@node-rs/argon2` (prebuilt binaries, no install scripts; works on Windows and node:alpine), memoryCost 19456 KiB, timeCost 2, parallelism 1. Legacy bcrypt hashes from Supabase are verified with `bcryptjs` and rehashed to Argon2id on the next successful login (Phase 08). Unknown emails are verified against a dummy Argon2 hash (`PasswordService.verifyDummy()`) so timing does not reveal accounts. Policy: 8 to 128 characters, not equal to the email (case-insensitive).
   - Access tokens: JWT, RS256, signed with `jose` (5.x, the CJS build that Jest can load), 15 minutes (`ACCESS_TOKEN_TTL_SECONDS`, default 900). Claims `sub` (users.id), `role`, `iss`, `aud`, `iat`, `exp`, `jti`; header `kid`. Public key at `GET /api/auth/jwks.json` (404 while local auth is disabled).
   - Refresh tokens: 32 random bytes, base64url; only the SHA-256 hex hash is stored (`refresh_tokens.token_hash`); 30 days (`REFRESH_TOKEN_TTL_DAYS`); rotated on every use (conditional UPDATE `revoked_at IS NULL` in a transaction). Reuse of a revoked token revokes the whole family (`reuse_detected`) and returns 401, EXCEPT when the token was rotated less than `REFRESH_REUSE_GRACE_SECONDS` (default 20) ago: then 409 `refresh_conflict` without revoking (two tabs refreshing at once; the client retries once with the newer cookie).
   - Browser path: the frontend calls the backend through the same-origin Vercel rewrite `/backend-api/*`, so cookies set by the backend belong to the FRONTEND domain, and the browser-visible path of the auth endpoints is `/backend-api/auth/*` (cookie Path/Domain must be chosen for that; implemented in Phase 08).
   - Transition: `AUTH_ACCEPT_SUPABASE_TOKENS` (default true) keeps accepting Supabase tokens through the legacy strategy (`src/modules/auth/legacy/`). `JwtAuthGuard` tries our `local-jwt` strategy first, then `supabase-jwt`.
   - Safe without config: if any of `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_KEY_ID`, `JWT_ISSUER`, `JWT_AUDIENCE` is missing (or the keys are invalid), local auth is disabled with one startup warning and the backend behaves exactly as before.
   - Endpoints (Phase 08, backend only; the frontend still signs in through Supabase until a later phase): `POST /api/auth/register`, `/login`, `/refresh`, `/logout`, `/logout-all`, and `/change-password` (local accounts locally, Supabase accounts through the unchanged legacy flow). Browser paths: `/backend-api/auth/*` in production, `/api/auth/*` locally. Login returns `{ accessToken, expiresIn, user }` (`user` = `GET /api/users/me`); the refresh token travels ONLY in a cookie. Register always answers 201 with the same body and never touches an existing account. Generic errors never reveal whether an email exists. Backend CLAUDE.md "Architecture" has the details.
   - Cookies (Phase 08): `np_refresh` = raw refresh token, httpOnly, Secure in production (`AUTH_COOKIE_SECURE`), SameSite=Lax, Path=`AUTH_COOKIE_PATH` (`/backend-api/auth` in production, `/api/auth` locally), host-only (no Domain: each frontend domain has its own session), Max-Age 30 days. `np_logged_in=1` = readable marker, same flags, Path=/, no secret; the frontend middleware may use it ONLY to decide redirects, never as proof of a session. Both are cleared with the same attributes.
   - CSRF (Phase 08): the cookie-based endpoints (`/refresh`, `/logout`, `/logout-all`, and `/change-password` when it reads the cookie) require `X-Requested-With: nusantara-play` and an `Origin` that is in `FRONTEND_URLS` or fully matches a regex in `FRONTEND_ORIGIN_PATTERNS` (Vercel previews); otherwise 403. The frontend must send that header on these calls.
   - Email flows (Phase 09): email verification (24 h link) and password reset (1 h link) with one-time tokens in `auth_tokens` (hash only, single use, a new link invalidates the older one), endpoints `POST /api/auth/verify-email`, `/resend-verification`, `/forgot-password`, `/reset-password`; generic answers that never reveal an account; at most 3 emails per address per hour per purpose; Indonesian emails with links to `{APP_PUBLIC_URL}/verify-email?token=...` and `{APP_PUBLIC_URL}/reset-password?token=...` (the frontend pages are built in a later phase). Users may log in without a verified email; `emailVerified` is on `GET /api/users/me` and `@RequireVerifiedEmail()` (403 `EMAIL_NOT_VERIFIED`) is ready for Points. "Verified" lives in `user_credentials.email_verified_at` for accounts with a password and in `email_verifications` for accounts without one (Supabase-only now; Google-only accounts in Phase 10 write a row with method `google`). A password reset clears the lockout, revokes all refresh tokens and makes every access token issued more than 5 s before it invalid (also after change-password; the own session continues through its next refresh).
   - Self-service migration (Phase 09, owner decision): forgot-password works for EVERY account with that email, including Supabase-only accounts without local credentials; completing the reset creates their `user_credentials` (and marks the email verified), so the user can sign in with the self-hosted login from then on. The reset link proves ownership of the address.
   - Brute force (Phase 08): per-account lockout (`LOGIN_MAX_FAILED` 5 wrong passwords → locked `LOGIN_LOCK_MINUTES` 15, atomic counter in SQL), per-email limit (10 login attempts / 15 min, in memory), generous per-IP limits (login and register 30 / min, refresh 60 / min). See Risks.
5. Multiplayer will run on a separate realtime server (Colyseus, Node.js, TypeScript) in nusantara-play-be/realtime/, with one room per province.
6. Hardware target: a mid-range Android phone (4 GB RAM, Chrome). Performance budget: at least 30 fps, initial 3D download max 5 MB, max 8 MB per province, max 100k triangles and 100 draw calls per scene, textures max 1024x1024 and compressed, max 20 visible avatars per room. A 2D fallback must exist for weak devices.
7. Out of scope: open world, vehicles, combat, heavy physics, AI NPCs, day-night cycle, realtime shadows, detailed avatar editors, realistic graphics.
8. Blockchain anchoring is not a priority. Do not change blockchain/ or src/modules/blockchain/ unless a phase asks for it.
9. Visual track first (owner decision, Phase 10): the boss needs something visual soon, so the frontend-only visual phases
   (V1 hub map, V2 province scene, ...) come before the remaining backend work (Google login, deployment), which continues
   afterwards. Visual phases reach users through Vercel only.
   - Pilot province: **Sumatera Selatan** (kode `16`, slug `sumatera-selatan`). It has **0 public PROT** in production
     (Phase 10), so V2 needs PROT content there first.
   - Rewards and multiplayer shown in demo phases are SIMULATED until the backend exists: clearly labelled in the UI
     ("Demo"; simulated rewards "Simulasi · tidak disimpan" since Phase 12) and never sent to or saved on the backend.
   - Demos are built on phase branches and shown to the boss through the Vercel preview link before anything is merged
     to production. Navbar links to /jelajah and /main exist since Phase 18 (owner decision).
   - Jelajah Nusantara V1 (Phase 10): `/jelajah` hub map of Indonesia (3D with three.js / @react-three/fiber /
     @react-three/drei, plus an SVG 2D fallback) and `/jelajah/sumatera-selatan` ("Segera hadir" placeholder). Frontend
     code lives only in `app/jelajah/`, `components/jelajah/`, `lib/jelajah/`, `public/jelajah/`; details in the frontend
     CLAUDE.md "Jelajah Nusantara". Province counts are computed on the client from `GET /prot?status=ARSIP_NASIONAL`
     (all pages); a backend endpoint `GET /api/jelajah/provinces` should replace that later.
   - Jelajah Nusantara V2 (Phase 11): `/jelajah/sumatera-selatan` is a walkable riverside village (procedural raised houses
     "terinspirasi rumah limas", CC0 low-poly nature and player character, 6 procedural PROT stands around a plaza, joystick
     or WASD/arrows, no bots). Stands fill automatically from the province's public PROT; production still has 0 there, so
     every stand shows "Segera hadir". Local development uses the labelled DEMO PROT. The scene is generic: later provinces
     add a scene data file (frontend CLAUDE.md "Province scene engine"). 3D assets are CC0 only, recorded in
     `public/jelajah/assets/ASSET_LICENSES.md`; `pnpm check:jelajah` enforces 8 MB per province and textures <= 1024 px.
   - Jelajah Nusantara V3 (Phase 12, polish): framed follow camera (player in the lower third, closer and wider on
     phones, 1.5 s entry glide), the hidden player's silhouette in the site's primary colour with a light edge, a neutral
     open pavilion in the plaza, larger fitted stand signs, light ambient motion (full tier only, never with reduced
     motion), a banner when the province has no public PROT yet, and a SIMULATED reward HUD (XP, level, Paspor with
     the 35 provinces, Misi). **Simulation only:** the rewards live in `lib/jelajah/demo-rewards.ts`, only in the
     browser tab's sessionStorage, labelled "Simulasi · tidak disimpan", and never reach the backend (a test guards the
     imports). Real rewards still follow item 3. Details in the frontend CLAUDE.md "Camera, polish and simulated rewards".
   - Jelajah Nusantara V4 (Phase 13, finishing the visual track before the backend work resumes): simulated levels start
     at 1 (level L needs 50 × (L − 1) × L total XP; the future backend uses the same curve), site-wide toasts at the top
     centre (kept clear of the Jelajah title bar, HUD and panel close button), a short "Segera hadir" phone stand prompt,
     a `?debug=1` stats overlay for measuring real phones, an automatic full → lite → 2d fallback when the frame rate
     stays low (never over a manual choice), and PROT photos through Vercel Image Optimization (`/prot` phone cold load
     2983 KB → 617 KB). Still no navbar link to /jelajah and no brand rename (both wait for the boss). Details in the
     frontend CLAUDE.md "Finish, real-device measurement and PROT photos".
   - Public page images (Phase 14): the landing page uses the same optimized photo approach as /prot (featured PROT
     through `ProtPhoto`; the desktop-only hero carousel through next/image and never downloaded on phones), so `/` on a
     phone cold load went from 1597 KB to 666 KB. Optimized images stay cached 31 days (`images.minimumCacheTTL`),
     which is safe only because every upload gets a new UUID object key (backend `StorageService.uploadFile()`). The
     site now really displays Plus Jakarta Sans and Geist Mono (separate commit, revertible). Details in the frontend
     CLAUDE.md "Public page images (Phase 14)".
   - Jelajah intro bumper (Phase 16, owner decision): opening `/jelajah` first plays a short animated tour of the
     whole site (6 scenes, 19 s: brand, Arsip PROT with the real public PROT count and photos, the province map with
     the provinces that have PROT, "Segera hadir" traditional games, events and members from `GET /stats/landing`,
     simulated XP and Paspor with "Mulai Jelajah"). Built in React + CSS + framer-motion (no video, no sound, no
     three.js), once per browser session (`sessionStorage`), always skippable ("Lewati", Esc), replayable from
     "Putar intro" in the hub's "Tampilan" menu, never on a province deep link. The hub loads its data and the 3D chunk
     behind it. Only real data or neutral text. The site name it shows is one constant, `SITE_NAME` in
     `nusantara-play-fe/lib/brand.ts` (since Phase 18 "Nusantara Legacy", shared by the whole site). Details in the frontend
     CLAUDE.md "Intro bumper (Phase 16)". Since Phase 17 it plays once per DAY per browser (local date in
     `localStorage['jelajah.bumperLastPlayed.v1']`, falling back to once per session when localStorage is
     unavailable), and its scene 4 has a "Main Congklak" button instead of "Segera hadir".
   - Hosted games (Phase 17, owner decision): the site hosts its own traditional games instead of linking to external
     sites (no files of the old external games exist, so games are built from scratch). The first is congklak in 2D
     (SVG + CSS, no three.js) at the public page `/main/congklak`, listed on `/main`: against the computer (Mudah,
     Sedang, Sulit; the AI runs in a Web Worker) or two players on one device. ONE common ruleset, "Aturan dasar",
     described in the game exactly as implemented and never claimed to be the only correct version; every rule switch
     lives in one config file, `nusantara-play-fe/lib/games/congklak/rules.ts`, for a curator to adjust. The Sumatera
     Selatan scene's plaza pavilion opens the game ("Main Congklak", neutral wording, no claim about where congklak
     comes from); the game page links back ("Kembali ke desa"). The landing page's "Mulai Tur Virtual" button and the
     carousel slide that pointed to external tour sites now open `/jelajah`. No navbar link yet. Details in the
     frontend CLAUDE.md "Games (Phase 17)".
   - Brand, navbar and login gate (Phase 18, owner decisions): the brand is "Nusantara Legacy" everywhere users see
     it, from one constant (`nusantara-play-fe/lib/brand.ts`, `SITE_NAME`); the navbar links to the Jelajah map
     ("Jelajah"; "Tur Virtual" on the landing page) and the games ("Game", `/main`), on phones too. **The Jelajah map
     requires login**: a logged-out visitor of `/jelajah` or `/jelajah/*` is sent to
     `/login?redirectTo=…&reason=jelajah`, sees "Masuk dulu untuk memulai Tur Virtual. …", and after logging in
     (email/password or Google) lands on the page they wanted; `redirectTo` is always a validated same-site path.
     The games under `/main` stay public. The gate uses the frontend's current login (Supabase today) and must move
     with it when the frontend switches to the self-hosted login. Landing statistics count only published content
     (ARSIP_NASIONAL PROT and their provinces), like the map and the bumper; numbers that are 0 are hidden. Details
     in the frontend CLAUDE.md "Brand, navbar and the Jelajah login gate (Phase 18)".
   - Concept video (Phase 19, owner decision): on the first `/jelajah` visit per browser a ≈48 s animated film ("Kenali"
     + the brand; 8 scenes: games in the courtyard, forgotten, Indonesia lights up, the archive, a province village,
     congklak with XP and a Paspor stamp, the community, start) plays after the intro bumper and before the map. Skippable
     ("Lewati", Esc), replayable ("Tonton pengenalan"), still frames with reduced motion, no audio, real data only
     (published PROT names and counts; no Points, prizes or multiplayer promised). Code-driven (React, framer-motion, SVG,
     a particle canvas on the 3D tiers), lazy-loaded, about 38 KB gzip. Every text and timing is in ONE file,
     `nusantara-play-fe/lib/jelajah/concept/script.ts`. The Jelajah login page no longer offers "Masuk sebagai Tamu"
     (the map needs an account; the games stay open) and the landing page's featured PROT are published only. Details
     in the frontend CLAUDE.md "Concept video (Phase 19)".
   - Gasing (Phase 20): the second self-hosted game, `/main/gasing` (public, listed on `/main` next to Congklak), 2D
     canvas, against the computer (Mudah, Sedang, Sulit) in two modes based on the published archive record "Gasing"
     (Kepulauan Riau): Uri (longest spin wins) and Pangkah (strike the opponent's spinning top; roles swap). Slingshot
     throw by touch/mouse or keyboard, best of 3, records nothing (item 11). ONE ruleset "Aturan dasar" in
     `nusantara-play-fe/lib/games/gasing/rules.ts` and every text in `texts.ts`, awaiting curator review. Not yet linked
     from the Jelajah pavilion or the bumper (they support one game only). Details in the frontend CLAUDE.md
     "Gasing (Phase 20)".
10. Real rewards, part 1 (Phase 15, backend only): `nusantara-play-be/src/modules/rewards/`. `RewardsService` is the
    ONLY code that changes XP and Points. Every change is one transaction: `pg_advisory_xact_lock` per user, server-built
    idempotency keys (`PROVINCE_ENTER:{userId}:{provinsiKode}`, `PROT_VIEW:{userId}:{protId}`,
    `PASPOR_STAMP:{userId}:{provinsiKode}`; a repeated request is answered with `duplicate: true` and no error), rows in the
    append-only `reward_ledger` (a database trigger refuses UPDATE, DELETE and TRUNCATE; corrections are new compensating
    rows), and atomic increments of `reward_balances` (XP, Points, level) in the same transaction.
    - Two currencies: XP (levels, leaderboard, never redeemable) and Points (redeemable later for in-platform rewards;
      never cashed out, never transferable).
    - **Browser-reported actions give XP only, never Points** (a script can fake them). Points will come only from
      server-verified actions (server-graded quizzes, organizer-confirmed event check-ins, realtime-verified mini-games).
      Phase 15 has no rule that grants Points; only `ADMIN_ADJUST` can change them. Points need a verified email (otherwise
      only the XP part is granted) and stay on hold for `POINTS_HOLD_DAYS` (default 7) before they become redeemable.
    - Rules and every reward number live in ONE file, `src/modules/rewards/rewards.rules.ts` (same numbers as the Jelajah
      simulation): PROVINCE_ENTER +25 XP once per province; PROT_VIEW +10 XP once per PROT, ARSIP_NASIONAL only;
      PASPOR_STAMP +50 XP once per province, granted automatically when the user has viewed min(3, the province's
      ARSIP_NASIONAL PROT count) PROT there and the province has at least one. Levels: level L needs 50 × (L − 1) × L
      total XP (`levelForXp()` in `level.ts`).
    - Endpoints (login required, local and legacy Supabase tokens): `POST /api/rewards/activities {type, refId}` (only
      PROVINCE_ENTER and PROT_VIEW; the PROT's province comes from the database; 60 / min per user), `GET /api/rewards/me`,
      `/me/ledger`, `/me/paspor`, `/leaderboard?scope=national|province&provinsiKode=` (top 50 + own rank, public user
      shape, 60 s in-memory cache), `POST /api/admin/rewards/adjust` (admin_kpoti, audited, reason >= 5 characters).
    - Reconciliation: `npm run rewards:reconcile` recomputes balances and levels from the ledger and reports differences;
      `-- --fix` rewrites them. Manual walk-through: `nusantara-play-be/docs/rewards-local-testing.md`.
    - The Jelajah HUD keeps its SIMULATION (item 9) until the frontend switches to the self-hosted login in a later phase;
      only then may it call these endpoints.
11. Games record nothing yet (owner decision, Phase 17): games are played without logging in, and nothing about a game
    (moves, results, scores, XP) is recorded or sent to the backend. Only local settings (difficulty, animation speed,
    last mode) are kept in `localStorage['games.congklak.settings.v1']` (try/catch). A test fails if a game file calls
    the network or imports API code. Gasing (Phase 20) follows the same rule: `localStorage['games.gasing.settings.v1']`
    (mode, level) and `localStorage['games.gasing.tutorialSeen.v1']` only. A later phase may add rewards for games, but only through server-verified results
    (item 10: browser-reported results never give Points, and a game result reported by the browser is not proof).

## Deployment facts

- Frontend: Vercel. **The product uses only https://nusantaralegacy.org** (owner decision, Phase 10). `nusantaravirtual.org` is
  retired: `next.config.ts` `redirects()` sends every request whose Host is `nusantaravirtual.org` or
  `www.nusantaravirtual.org` to `https://nusantaralegacy.org` with a 308, same path and query, `/backend-api` included.
  `www.nusantaralegacy.org` is redirected by Vercel itself (307 to the apex, Phase 10 check), so the app has no rule
  for it; never add one for the apex (loop risk). Phase 10 finding: the TLS certificate covers only the apex, so
  `https://www.nusantaralegacy.org` and `https://www.nusantaravirtual.org` fail with a certificate error in browsers
  (fix in the Vercel domain settings). All domains point to the same Vercel IP.
- Production database: PostgreSQL, most likely on Supabase. Never connect to it from a dev machine.
- Production backend: **confirmed** (Phase 01) at `https://api.nusantaralegacy.org` (API under `/api`; IP 103.235.72.203, nginx/1.24.0 on Ubuntu in front of the NestJS app). The live frontend bundle has `NEXT_PUBLIC_BACKEND_API_URL=https://api.nusantaralegacy.org/api` baked in. Hosting provider of that server is unknown. `nginx/nginx.conf` in this repo still uses `server_name api-nusantaraplay.kpoti.id`, which no longer resolves, so the repo nginx config does not match production.
- Production backend CORS: its allowlist contains `https://nusantaravirtual.org` but **not** `nusantaralegacy.org` (Phase 03: `Access-Control-Allow-Origin` is returned only for `Origin: https://nusantaravirtual.org`). **Nobody currently has access to that server**, so its CORS config, nginx config and env cannot be changed or inspected.
- Browser → backend: browser calls go to the same-origin path `/backend-api/*`, which a Vercel rewrite (frontend `next.config.ts`) proxies to `https://api.nusantaralegacy.org/api/*` (Phase 03). Server-side calls (server components, route handlers) go directly to `NEXT_PUBLIC_BACKEND_API_URL`.
- Local development database: PostgreSQL 15 in Docker (`nusantara-play-be/docker-compose.dev.yml`, container `nusantara-dev-db`, `127.0.0.1:5432`), databases `nusantara_play_dev` and `nusantara_play_test` (Phase 05). See "Local development".

### Pending deployment (backend, not yet on the production server)

Nobody has access to the production backend server yet. These backend changes are merged-ready but
NOT deployed. Frontend changes reach production through Vercel and are not listed here.

**Order matters: run the migration on the production database BEFORE the new backend code starts.**
The new `VerifikasiQueue` entity selects `verifikasi_queue.catatan_kurator`; old code ignores the
column, so running the migration first is safe for the old code too.

1. Migration `1795000000000-AddCatatanKuratorToVerifikasiQueue` (Phase 06, B7): adds one nullable
   `text` column `verifikasi_queue.catatan_kurator` (`ADD COLUMN IF NOT EXISTS`; down drops it).
2. Set `TRUST_PROXY` in the server env (Phase 06, P3). Default `loopback` fits Nest running directly on
   the host behind a host nginx. If production runs `docker-compose.prod.yml` (Nest in Docker, port
   published on `127.0.0.1:3000`), the peer is the Docker bridge gateway, so use `loopback, uniquelocal`.
3. Phase 06 backend fixes (all in the same release):
   - B1: PROT media routes (add/remove foto/video kegiatan, dokumen kurikulum, foto alat) check owner or
     admin_kpoti and status DRAFT/REVISI before any S3 call; removes save the DB before deleting from S3;
     media routes are audited.
   - B7: `POST /prot/:id/submit-kurasi` stores `catatan` as `catatan_kurator` on the queue entry; queue
     endpoints return it.
   - B4: race-safe marketplace stock (conditional UPDATEs in `create()` and `batalkan()`).
   - B5: race-safe verification queue claim/release (conditional UPDATEs).
   - P1: public endpoints return only the public user shape (events list/featured/detail, calendar
     item detail); other users' records lose `supabase_user_id` and `last_login_at`.
   - P2: no personal data in logs (PROT findAll, exception filter, SMTP errors); audit_log no longer
     stores passwords from `POST /auth/change-password`.
   - P3: rate limit per user id (anonymous per IP) and `trust proxy` from `TRUST_PROXY`.
   - P4: `avatar_url` must be an https URL of max 500 characters (null or empty clears it).
4. Migration `1795100000000-CreateSelfHostedAuthTables` (Phase 07): makes `users.supabase_user_id`
   nullable (unique constraint kept) and creates `user_credentials`, `refresh_tokens`, `auth_identities`
   (`IF NOT EXISTS`; down drops the tables and restores NOT NULL only if no user lacks a Supabase id).
   Run it before the Phase 07 code starts; the old code is unaffected by it.
5. Self-hosted auth env (Phase 07): `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_KEY_ID`, `JWT_ISSUER`,
   `JWT_AUDIENCE`, optionally `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`,
   `REFRESH_REUSE_GRACE_SECONDS`, `AUTH_ACCEPT_SUPABASE_TOKENS` (keep `true`). Generate the key pair ON the
   server (`npm run auth:generate-keys`); never reuse dev or test keys; never commit the private key.
   Without these vars the Phase 07 backend still starts and behaves as before (local auth disabled).
6. Phase 08 (no migration; `npm ci` installs the new dependency `cookie-parser`): self-hosted register, login,
   refresh, logout, logout-all and local change-password endpoints, refresh cookies, CSRF check, lockout,
   `JwtAuthGuard` runs once per request, unused `JwtModule` removed. Env on the server:
   - `JWT_ISSUER=https://api.nusantaralegacy.org`, `JWT_AUDIENCE=nusantara-play` (owner decision; part of item 5).
   - `AUTH_COOKIE_PATH=/backend-api/auth` (the default; may be omitted). `AUTH_COOKIE_SECURE` unset (true because
     `NODE_ENV=production`; check that the server really runs with `NODE_ENV=production`, otherwise set `true`).
   - `FRONTEND_ORIGIN_PATTERNS` empty, unless login must work on Vercel preview deployments (then a full-match regex
     for the preview host names of the frontend project).
   - `LOGIN_MAX_FAILED=5`, `LOGIN_LOCK_MINUTES=15` (the defaults; may be omitted).
   - **`FRONTEND_URLS` must contain `https://nusantaralegacy.org`**: the CSRF check compares the browser's `Origin` with
     it, and the production allowlist currently lacks nusantaralegacy.org (Deployment facts), so refresh/logout would
     answer 403. See item 9 for the final value.
   - Before the frontend switches to these endpoints, verify on a Vercel preview that the `/backend-api` rewrite
     forwards `Origin`, `Cookie` and `X-Requested-With` and passes `Set-Cookie` back unchanged.
7. audit_log cleanup (Phase 06 finding, still open): production `audit_log.changes` still contains plain-text
   passwords from old `POST /auth/change-password` requests. Redact them in the database (replace the
   values of `currentPassword`, `newPassword`, `confirmPassword` with `[REDACTED]`) after a backup.
   Until then the admin audit page hides secret-looking values on display (frontend, Phase 07).
8. Phase 09 (run the migration BEFORE the new code; the old code never reads the new tables):
   - Migration `1795200000000-CreateEmailAuthTokens`: creates `auth_tokens` and `email_verifications`
     (`IF NOT EXISTS`, explicit names; down drops both tables).
   - Env: `APP_PUBLIC_URL=https://nusantaralegacy.org` (required: without it no verification or reset email is
     sent), optionally `EMAIL_VERIFICATION_TTL_HOURS=24`, `PASSWORD_RESET_TTL_MINUTES=60`.
   - **Real SMTP credentials** (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` with
     a sender address of the production domain, ideally with SPF/DKIM). Until then emails fail and are only logged
     (error name/code); the endpoints still answer normally. Never point production at Mailpit.
   - Effects: access tokens issued before a password change are rejected; `/users/me`, login and refresh carry
     `emailVerified`; a daily cleanup job deletes old refresh and email tokens.
9. Single domain (Phase 10): production **`FRONTEND_URLS=https://nusantaralegacy.org`** (add
   `https://www.nusantaralegacy.org` only if `www.` is ever served as its own host instead of redirecting; today Vercel
   redirects it). `nusantaravirtual.org` no longer needs to be listed: the frontend redirects it before any page or
   `/backend-api` call runs. Also `APP_PUBLIC_URL=https://nusantaralegacy.org` (item 8).
10. Phase 15 rewards (run the migration BEFORE the new code; the old code never reads the new tables):
   - Migration `1795300000000-CreateRewardsLedger`: creates `reward_ledger`, `reward_balances`, `user_prot_views`,
     `user_province_stamps` (`IF NOT EXISTS`, explicit names), the function `reward_ledger_append_only()` and the triggers
     `TRG_reward_ledger_append_only` / `TRG_reward_ledger_no_truncate` (refuse UPDATE, DELETE, TRUNCATE; a DELETE cascaded
     from a deleted `users` row is allowed). Needs `uuid_generate_v4()` (uuid-ossp, already used by the Phase 07 and 09
     migrations). down() drops the triggers, the function and the four tables.
   - Env: optionally `POINTS_HOLD_DAYS` (default 7). Nothing else.
   - After deployment: `npm run rewards:reconcile` should report 0 differences (read-only).
11. Phase 18 landing statistics (no migration, no env): `GET /api/stats/landing` counts `totalProt` and
   `totalProvinsi` from PROT with status ARSIP_NASIONAL only (`src/modules/stats/stats.service.ts`); events and
   users unchanged. The frontend already computes the published counts itself, so the order does not matter.

## Local development

Both repos run fully locally against a disposable PostgreSQL (Phase 05). **The frontend still cannot log in
locally**: it signs in through Supabase, and the local Supabase values are fake
(`https://supabase-placeholder.invalid`). The backend's own login works since Phase 08 (register, login,
refresh, logout under `http://localhost:3000/api/auth/`; walk-through with curl in
`nusantara-play-be/docs/auth-local-testing.md`) once a dev key pair is in `.env.local`. Public pages and
public endpoints work.

1. Database (in `nusantara-play-be`): `npm run db:up` starts `postgres:15-alpine` (container
   `nusantara-dev-db`, port bound to `127.0.0.1:5432`, volume `nusantara-dev-db-data`, local-only
   password `localdev`) and creates `nusantara_play_dev` and `nusantara_play_test` on first start. Since Phase 09
   it also starts Mailpit (`axllent/mailpit:v1.33.1`, container `nusantara-dev-mailpit`, SMTP `127.0.0.1:1025`,
   web UI http://localhost:8025, no volume): every email the backend sends locally lands there; nothing is
   delivered. `.env.local.example` has the matching `SMTP_*` lines and `APP_PUBLIC_URL=http://localhost:3001`.
   Walk-through: `nusantara-play-be/docs/auth-local-testing.md`. Tests never use Mailpit (capturing double,
   `SMTP_HOST` forced empty in `test/test-env.ts`).
2. Backend env: `cp .env.local.example .env.local` (fake placeholders only; never put real secrets there).
   Then run `npm run auth:generate-keys` and paste the printed `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_KEY_ID`
   lines into `.env.local` (DEV-ONLY keys; `.env.local` is git-ignored). Without them local auth stays disabled.
   Phase 08: also copy the cookie lines (`AUTH_COOKIE_PATH=/api/auth`, `AUTH_COOKIE_SECURE=false`) from
   `.env.local.example`; with the default `/backend-api/auth` the refresh cookie is never sent to `/api/auth/refresh`.
   Set them in `.env.local`, not with a Git Bash `export` (Git Bash turns `/api/auth` into a Windows path).
3. Schema and seed: `npm run db:setup` (`src/scripts/db-local-setup.ts`; `npm run seed` is an alias).
   Refuses unless the host is `localhost`/`127.0.0.1` and the database name ends with `_dev` or `_test`.
   Builds the schema from the entities, records all `src/migrations/` as applied, seeds daerah (34 provinsi,
   416 kabupaten, 98 kota, 7230 kecamatan, 74952 desa, 8487 kelurahan) and DEMO data (user
   `demo-kurator@example.test`, 3 PROT with status ARSIP_NASIONAL, 1 published event; names start with
   "DEMO"; since Phase 11 also `DEMO PROT Sumsel 1` to `4` in Sumatera Selatan (provinsi 16, ARSIP_NASIONAL, fixed UUIDs
   `…de31` to `…de34`, neutral placeholder text) for the Jelajah scene; since Phase 13 "DEMO PROT Sumsel 1" has one photo,
   `http://localhost:3001/jelajah/demo/foto-contoh.svg`, a neutral placeholder served by the local frontend). Idempotent. Flags: `-- --database=<name>`, `-- --no-demo`.
   Since Phase 15 it also installs the reward ledger trigger and the `(user_id, created_at DESC)` index after
   `synchronize()` (which cannot create them), through the migration's static
   `CreateRewardsLedger1795300000000.installDbObjects()`.
4. Backend: `npm run start:dev` → http://localhost:3000/api. Blockchain vars stay empty, so
   BlockchainService logs a warning and is inactive.
5. Frontend (in `nusantara-play-fe`): `.env.local` with `NEXT_PUBLIC_BACKEND_API_URL=http://localhost:3000/api`
   and placeholder Supabase values (see `.env.example`), then `pnpm dev` → http://localhost:3001
   (`/prot` shows the DEMO PROT).
6. Tests (backend): `npm test` (unit, no database), `npm run test:int` (`*.int-spec.ts`, real
   `nusantara_play_test`), `npm run test:e2e` (full AppModule on `nusantara_play_test`). Integration and
   e2e run the same setup logic as `db:setup` in a Jest global setup and force every env var to local test
   values (`test/test-env.ts`, which also generates a fresh RS256 key pair per test process, in memory only).
   E2E tests that need a session register and log in through the real endpoints; `test/e2e-app.ts` builds the
   app like `main.ts` (cookie parser, trust proxy, pipes, filter). Two events e2e tests stay skipped for
   reasons unrelated to login (see the comment in `test/events.e2e-spec.ts`).
7. Reset: `npm run db:reset -- --yes` deletes the volume and starts an empty database; then `npm run db:setup`.
   `npm run db:down` stops the container and keeps the data; `npm run db:logs` follows the logs.

## Risks

- `/backend-api` proxy (Phase 03): Vercel runs external rewrites in its CDN/router, not in a Function. The proxied request timeout is **120 s** (`ROUTER_EXTERNAL_TARGET_ERROR` after that). Vercel documents **no request body limit** for external rewrites (the documented 4.5 MB limit is for Functions). Uploads above 4.5 MB through the proxy are therefore unverified on Vercel until a large upload is tested on a preview deployment. Locally `next start` proxied a 6 MB multipart body intact. The backend (repo nginx) allows 50 MB and has `proxy_read_timeout 60s`, so a slow large upload can still fail on that side.
- All browser API traffic now reaches the backend from Vercel's IP addresses. Vercel sets `X-Forwarded-For`/`X-Real-IP` to the visitor's IP, but whether production nginx/NestJS use them is unknown (no server access; the repo nginx has `limit_req` 10 r/s burst 20 per `$binary_remote_addr`). Since Phase 06 (not yet deployed) the NestJS throttler limits logged-in users per user id; anonymous requests are still limited per `req.ip`, which behind Vercel is a Vercel egress IP shared by many visitors (Vercel IPs are not a stable published list, so they cannot be trusted as proxies). Per-IP limits (nginx `limit_req`, anonymous throttling) can therefore still hit many users at once (HTTP 429 or 503).
- Vercel CDN caching of proxied responses: projects created on or after 2026-04-06 honor upstream cache headers on external rewrites by default. `next.config.ts` sends `x-vercel-enable-rewrite-caching: 0` for `/backend-api/:path*` to turn that off. The backend currently sends no `Cache-Control` header.
- Login throttling (Phase 08): behind Vercel, anonymous requests may all share a few Vercel egress IPs, so the
  per-IP limits are deliberately generous (login and register 30 / min, refresh 60 / min per tracker) and can
  still hit many visitors at once if `req.ip` turns out to be a Vercel IP in production. The real brute-force
  protection is per account: (1) the database lockout (5 wrong passwords → 15 minutes, shared by every backend
  instance) and (2) the per-email limit of 10 login attempts per 15 minutes. The per-email limit lives in the
  process memory (the throttler's in-memory storage): with N backend instances an attacker gets up to N × 10
  attempts per window, and a restart resets it. **Trade-off:** anyone who knows an email address can lock that
  account for 15 minutes (5 wrong passwords) and keep it locked by repeating; the per-email 429 also blocks the
  real owner for up to 15 minutes. Accepted for now; a later phase could add CAPTCHA or email-based unlock.
- Access tokens (15 minutes) stay valid after logout and logout-all until they expire; only refresh tokens are
  revoked. Since Phase 09 a password change or reset rejects every access token issued more than 5 s before it
  (clock skew allowance; a token issued in those 5 s stays valid until it expires). A suspended or inactive user
  is rejected at once (the `local-jwt` strategy checks the status on every request). Legacy Supabase tokens of a
  Supabase-only account stay valid after that account resets its password through the self-hosted flow (the
  legacy strategy does not look at `password_changed_at`) until `AUTH_ACCEPT_SUPABASE_TOKENS` is turned off.
- Email limits (Phase 09): the 3-emails-per-address-per-hour limit lives in process memory like the login limit
  (N instances → N × 3, a restart resets it). Anyone can make the backend send up to 3 verification / "akun sudah
  ada" and 3 reset emails per hour to any address (generous per-IP limit only). The emails contain no account data
  and the links only work for the mailbox owner. A later phase could add CAPTCHA.
- Email delivery (Phase 09): production has no SMTP credentials yet; until they are set, verification and reset
  emails are not delivered (logged as failures) while the endpoints still answer 200.
- Same-origin cookies (including Supabase `sb-*` auth cookies) are now forwarded to the backend with every browser API call. Large cookie headers could exceed nginx header buffer limits (unknown production config).
- Rewards (Phase 15): browser-reported XP can still be earned by a script with a valid login, but only up to the rule
  caps (each province and each public PROT counts once per account, 60 activity requests / min per user), and it is XP
  only, never Points. The leaderboard cache (60 s) lives in each backend instance's memory, so N instances can show
  slightly different boards for up to a minute.

## Engineering rules

- Before writing code, show a short plan and the list of files you will touch.
- Every phase ends with passing tests and a successful build. Add or update unit tests for every service you change.
- Lint rule: a phase must not add new lint errors in the files it touches.
- Ownership and permission checks live in the service layer and throw ForbiddenException.
- Any multi-table write that must be atomic uses a TypeORM transaction.
- Any read-then-write on a shared counter or claim (stock, queue claims, points) must be race-safe: use a conditional UPDATE or a pessimistic lock.
- XP and Points change ONLY through `RewardsService` (Phase 15): never write `reward_ledger` or `reward_balances` anywhere
  else, never edit or delete ledger rows (insert a compensating row), never build an idempotency key from client input,
  and never give Points for a browser-reported action.
- Never log secrets, tokens, or passwords. Never log personal data either (email, phone, user ids next to them, request bodies with personal data); log through the Nest `Logger`, not `console`.
- Public endpoints only return the public user shape: a `@Public()` route returns other users ONLY as `{ id, full_name, avatar_url, institution }` (`toPublicUser()` in `src/common/serializers/user-shape.ts`). Logged-in endpoints that return OTHER users' records never include `supabase_user_id` or `last_login_at` (`stripPrivateUserFields()`); admin_kpoti user management keeps `last_login_at`. Add a test for every new endpoint that returns users.
- If a requirement is ambiguous or conflicts with existing code, stop and ask instead of guessing.

### Migration rules (Phase 06)

The local schema is built from the entities and differs from production (enum type names,
constraints, extra legacy tables), so migrations must not assume anything about existing objects.

- New migrations are hand-written raw SQL in `src/migrations/<timestamp>-<Name>.ts`. Never use
  `migration:generate`, and never run `synchronize` against anything except a local `_dev` or `_test` database.
- Migrations only ADD things (new tables, new nullable columns or columns with defaults, new indexes)
  and use `IF NOT EXISTS` where PostgreSQL allows it. They must not depend on the names of existing
  enum types or constraints, and must not alter or drop existing columns, types or constraints
  unless a phase explicitly asks for it.
- Every migration has a working `down()`.
- Every migration is tested locally: run it with `npm run migration:run` on the dev database after
  `npm run db:setup`, and revert it with `npm run migration:revert`. Note: `db:setup` records every
  migration in `src/migrations/` as already applied (and `synchronize()` has already created the
  column), so test in this order: `migration:revert` (down), `migration:run` (up), `migration:revert`,
  `migration:run`, checking the schema after each step.
- The entity is updated in the same commit, so local `synchronize()` and the migration produce the same column.

## Lint baseline (after Phase 02)

Phases must not add lint errors in the files they touch. Counts below are the whole-repo baseline.

- Backend `npm run lint`: 406 errors, 30 warnings; `prettier/prettier` 0. Per rule: no-unsafe-member-access 174, no-unsafe-call 88, no-unsafe-assignment 84, no-unused-vars 29, no-unsafe-argument 27 (warn), unbound-method 13, no-unsafe-return 10, require-await 4, no-floating-promises 3 (warn), no-unsafe-enum-comparison 2, no-unnecessary-type-assertion 2 (all `@typescript-eslint/`).
- Backend after Phase 05: 240 errors, 30 warnings (`test/events.e2e-spec.ts` went from 214 to 48 errors; all new files are clean).
- Backend after Phase 06: 237 errors, 30 warnings (no touched file gained errors; all new files are clean).
- Frontend after Phase 06: unchanged, 44 errors, 87 warnings.
- Backend after Phase 07: 221 errors, 29 warnings (`jwt-auth.guard.ts` went from 17 errors + 1 warning to 0; the moved legacy strategy is clean; no touched file gained errors; all new files are clean).
- Frontend after Phase 07: unchanged, 44 errors, 87 warnings (touched files clean).
- Backend after Phase 08: 220 errors, 29 warnings (`auth.module.ts` went from 1 error to 0; no touched file gained errors; all new files are clean).
- Frontend after Phase 08: unchanged (only CLAUDE.md changed).
- Backend after Phase 09: unchanged, 220 errors, 29 warnings (every touched and new file is clean; `users.controller.spec.ts` and the
  rewritten `local-jwt.strategy.spec.ts` have 0 problems).
- Frontend after Phase 09: unchanged (only CLAUDE.md changed).
- Frontend after Phase 10: unchanged, 44 errors, 87 warnings (every new and touched file is clean).
- Backend after Phase 10: unchanged (only CLAUDE.md and the phase report changed).
- Frontend after Phase 11: unchanged, 44 errors, 87 warnings (every new and touched file is clean).
- Backend after Phase 11: unchanged, 220 errors, 29 warnings (`src/scripts/db-local-setup.ts` is clean).
- Frontend after Phase 12: unchanged, 44 errors, 87 warnings (every new and touched file is clean, including `app/layout.tsx`
  and `components/ui/AnimatedThemeToggler.tsx`).
- Backend after Phase 12: unchanged (only CLAUDE.md and the phase report changed).
- Frontend after Phase 13: 44 errors, 82 warnings (@next/next/no-img-element 26 → 21: the five warnings in the touched PROT
  photo files are gone; every new and touched file is clean). Per rule: no-unused-vars 47 (warn), no-explicit-any 39,
  no-img-element 21 (warn), exhaustive-deps 14 (warn), no-empty-object-type 4, set-state-in-effect 1.
- Backend after Phase 13: unchanged, 220 errors, 29 warnings (`src/scripts/db-local-setup.ts` is clean).
- Frontend after Phase 14: unchanged, 44 errors, 82 warnings (every new and touched file is clean except the existing
  unused `LandingStats` import warning in `app/page.tsx`, also on main; no-img-element stays 21: the replaced `<img>`
  elements already had disable comments).
- Backend after Phase 14: unchanged (only CLAUDE.md and the phase report changed).
- Backend after Phase 15: unchanged, 220 errors, 29 warnings (every new and touched file is clean).
- Frontend after Phase 15: unchanged (only CLAUDE.md changed).
- Frontend after Phase 16: unchanged, 44 errors, 82 warnings (every new and touched file is clean).
- Backend after Phase 16: unchanged (only CLAUDE.md and the phase report changed).
- Frontend after Phase 17: unchanged, 44 errors, 82 warnings (every new and touched file is clean except the existing
  unused `LandingStats` import warning in `app/page.tsx`).
- Backend after Phase 17: unchanged (only CLAUDE.md and the phase report changed).
- Frontend after Phase 18: 44 errors, 80 warnings (two warnings fewer in touched files: the unused `LandingStats`
  import in `app/page.tsx` and the unused `router` in `components/auth/SignupForm.tsx`; every new and touched file
  has 0 errors; the remaining warnings in touched files existed before: `UserNav.tsx` and `AdminHeader.tsx`
  no-img-element, two unused imports in the admin dashboard page).
- Backend after Phase 18: unchanged, 220 errors, 29 warnings (`src/modules/stats/` is clean).
- Frontend after Phase 19: unchanged, 44 errors, 80 warnings (all 42 new and touched source files are clean).
- Backend after Phase 19: unchanged (only CLAUDE.md and the phase report changed).
- Frontend after Phase 20: unchanged, 44 errors, 80 warnings (every new and touched source file is clean).
- Backend after Phase 20: unchanged (only CLAUDE.md and the phase report changed).
- Frontend `pnpm lint`: 44 errors, 87 warnings. Per rule: @typescript-eslint/no-unused-vars 47 (warn), @typescript-eslint/no-explicit-any 39, @next/next/no-img-element 26 (warn), react-hooks/exhaustive-deps 14 (warn), @typescript-eslint/no-empty-object-type 4, react-hooks/set-state-in-effect 1.

## Decisions log

- 2026-11-17: Blockchain work is deprioritized.
- 2026-11-17: Line endings are LF in both repos, enforced by `.gitattributes` (`* text=auto eol=lf`, common binary types marked `binary`). The working tree is LF even with a global `core.autocrlf=true` (Phase 02).
- 2026-11-17: Prettier was applied once to the backend (`src/`, `test/`) in Phase 02. Backend `npm run lint` is read-only; `npm run lint:fix` fixes. The frontend has no Prettier setup.
- 2026-11-17: The app and the migration CLI build their DB connection from one function, `src/config/data-source-options.ts` (DATABASE_* names, `.env.local` then `.env`). Deprecated `DB_*` names are a CLI-only fallback with a warning, so the app's behavior did not change (Phase 02, finding B9).
- 2026-11-17: pnpm build scripts (frontend): `pnpm-workspace.yaml` allows sharp and unrs-resolver with both `allowBuilds` (pnpm >= 10.26, 11, 12) and `onlyBuiltDependencies` (pnpm 10.x), plus `packages: ['.']` so pnpm 9 accepts the file. Verified `pnpm install --frozen-lockfile` with pnpm 9.15.9, 10.25.0, 10.34.9 and 12.14.0. Lockfile stays `lockfileVersion: '9.0'` (Vercel uses pnpm 9 or 10 for it). No `packageManager` field for now (Phase 02).
- 2026-11-17: Frontend tests use Vitest 5 (`pnpm test` = `vitest run`, config `vitest.config.ts` with the `@/` alias, tests in `tests/**/*.test.ts`) (Phase 02).
- 2026-11-17: .superpowers/ and .claude/settings.local.json are no longer tracked and are git-ignored in both repos (Phase 02).
- 2026-11-17: Frontend dev server runs on port 3001 (`next dev -p 3001`), matching the backend's default CORS origin; the backend uses 3000 (Phase 02).
- 2026-11-17: Browser API calls in production go through the same-origin Vercel rewrite `/backend-api/:path*` → `<BACKEND_ORIGIN>/api/:path*` (default `https://api.nusantaralegacy.org`), because the production backend's CORS allowlist lacks nusantaralegacy.org and nobody has server access. This replaces the `https://api.<hostname>/api` derivation (finding F3). Keep the proxy even after the server's CORS is fixed, unless a later phase decides otherwise (Phase 03).
- 2026-11-17: `/api/proxy-image` (finding F1) was hardened in Phase 04 (allowlist, DNS pinning, no redirects, size and type limits; details in the Phase 04 report). Removed in Phase 06 together with its only caller `components/dashboard/ProfileCard.tsx`, `lib/security/image-proxy.ts` and its tests, because nothing used them any more.
- 2026-11-17: NFT `about` is rendered as plain text (`whitespace-pre-line`), never as HTML (finding F2). Do not reintroduce `dangerouslySetInnerHTML` for API data; the only allowed use is the static theme script in `app/layout.tsx` (Phase 04).
- 2026-11-17: `/about` is no longer a public route in `middleware.ts` (finding F5): no such page exists, so logged-out visitors are redirected to `/login` like any other unknown path. `isPublicPath` is exported for tests (Phase 04).
- 2026-11-17: Until a production schema dump is available, the TypeORM entities are the source of truth for the LOCAL schema (dev and test databases): `npm run db:setup` builds it with `DataSource.synchronize()`. A later phase compares a production dump with the entities. The production database is never touched (Phase 05).
- 2026-11-17: Migration baseline for local databases: after `synchronize()`, every migration in `src/migrations/` is inserted into the TypeORM `migrations` table as already applied (without running it), so `npm run migration:run` reports nothing pending and only NEW migrations run on top (Phase 05).
- 2026-11-17: Local PostgreSQL is pinned to `postgres:15-alpine` (README says PostgreSQL 15) until the production version is known (Phase 05).
- 2026-11-18: Migration rules (see "Migration rules"): hand-written, additive-only raw SQL with `IF NOT EXISTS`, a working `down()`, tested locally with run/revert, entity updated in the same commit. Never `migration:generate`; `synchronize` only on local `_dev`/`_test` (Phase 06).
- 2026-11-18: The kurator's submission note (`POST /prot/:id/submit-kurasi`, `catatan`) is stored on the queue entry as `verifikasi_queue.catatan_kurator` (no existing column fit: `verifikasi.catatan` is the pakar's review note) (Phase 06, B7).
- 2026-11-18: Media edit rules for a PROT live in one helper, `PROTService.assertCanEditMedia()`, which `update()` also uses: owner or admin_kpoti (403), status DRAFT or REVISI (400). S3 objects are deleted only after the DB save; a failed S3 delete is logged (error name only) and the request still succeeds (Phase 06, B1).
- 2026-11-18: Shared counters and claims use conditional UPDATEs: stock (`stok >= :qty`), order cancel (`status IN (...)`), queue claim (`assigned_pakar_id IS NULL`), queue release (`assigned_pakar_id = :pakarId`). Order lines are merged per produk and processed in produk id order to avoid deadlocks (Phase 06, B4/B5).
- 2026-11-18: `assigned_at` on a queue claim is the app clock (a JS `Date` parameter), not SQL `now()`, to keep the existing `timestamp without time zone` convention (Phase 06, B5).
- 2026-11-18: Public user shape = `{ id, full_name, avatar_url, institution }`. Admin user management (GET/POST /users, GET /users/:id, PATCH role/status) hides `supabase_user_id` but keeps `last_login_at` for admin_kpoti (the admin user table shows it); kurator_daerah on GET /users/:id sees neither (owner decision, Phase 06, P1).
- 2026-11-18: Rate limiting: `UserThrottlerGuard` (global, after `JwtAuthGuard`) tracks `user:<id>` or `ip:<req.ip>`; Express `trust proxy` comes from `TRUST_PROXY` (default `loopback`) (Phase 06, P3).
- 2026-11-18: `audit_log.changes` stores the request body with secret-looking keys (password, token, secret, api key, authorization) replaced by `[REDACTED]` (Phase 06, P2).
- 2026-11-18: B2, B3, B6, B8 and B10 are deferred: blockchain is deprioritized, and B6/B10 are replaced by the self-hosted auth phase (Phase 06).
- 2026-11-18: Self-hosted auth lives in a new module `src/modules/auth-core/` (passwords, keys/tokens, refresh tokens, JWKS, `local-jwt` strategy, entities) with no Supabase dependency. The Supabase strategy moved to `src/modules/auth/legacy/supabase-jwt.strategy.ts` (passport name `supabase-jwt`, registered only while `AUTH_ACCEPT_SUPABASE_TOKENS` is true), so a later phase can delete the legacy path in one step (Phase 07).
- 2026-11-18: `JwtAuthGuard` no longer extends `AuthGuard('jwt')`; it calls passport with `['local-jwt', 'supabase-jwt']` (or only `local-jwt`) and keeps the old semantics: protected routes get 401 "Authentication required" or the strategy's error rethrown; `@Public()` routes set `req.user` to the user or `false`, and leave it unset on a strategy error (Phase 07).
- 2026-11-18: The `local-jwt` strategy does one read-only `users` lookup per request (status must be `active`), never calls Supabase and never writes (no `last_login_at` update; Phase 08 sets it on login). The role comes from the database, not from the token (Phase 07).
- 2026-11-18: Auth config is a pure parser `readAuthConfig()` in `src/config/auth.config.ts` (same pattern as `data-source-options.ts`). `KeyService` loads the keys once at startup and cross-checks them (RSA >= 2048 bits, public key matches private key); invalid keys disable local auth like missing ones (Phase 07).
- 2026-11-18: `jose` is pinned to 5.x because jose 6 is ESM-only and Jest (ts-jest, CommonJS) cannot load it without extra transform config (Phase 07).
- 2026-11-18: New auth tables use `timestamptz` (as specified), unlike the older `timestamp without time zone` columns. Every constraint and index has an explicit name shared by the entity and the migration, so a migrated database and a `synchronize()`d one are identical (verified with `pg_dump`) (Phase 07).
- 2026-11-18: The admin audit page redacts secret-looking keys (password, token, secret, apikey/api_key/api-key, authorization; case-insensitive, any depth) on display with `components/audit/redact-secrets.ts` (Phase 07).
- 2026-11-18: Owner decisions for Phase 08: production `JWT_ISSUER=https://api.nusantaralegacy.org`, `JWT_AUDIENCE=nusantara-play`; the refresh cookie is host-only (no Domain attribute), so each frontend domain has its own session; `last_login_at` is updated on successful login AND on successful refresh (Phase 08).
- 2026-11-18: The self-hosted endpoints live in `auth-core` (`LocalAuthController`, `LocalAuthService`, no Supabase dependency). `POST /auth/change-password` stays in `AuthController` (one route for both kinds of account) and branches on "has `user_credentials`": local change → 204; otherwise the legacy Supabase flow unchanged (201 `{success, message}`, old validation incl. required `confirmPassword` and the upper/lower/digit rule, applied with `LegacyChangePasswordDto`). The shared DTO makes `confirmPassword` optional (the current frontend still sends it; when sent it must match) (Phase 08).
- 2026-11-18: Generic answers (Phase 08): register always 201 `{success, message}` (new account, existing account, Supabase-only account, lost race); login 401 "Invalid email or password" for unknown email, wrong password, locked account, no password and several matching users; 403 "This account cannot sign in" only after a correct password on a suspended/inactive account; register hashes the password in every branch so timing does not depend on the branch.
- 2026-11-18: Lockout counter (Phase 08): one conditional SQL UPDATE (`failed_login_count + 1`, `locked_until = now() + LOGIN_LOCK_MINUTES` when the new count reaches `LOGIN_MAX_FAILED`). The count is reset only by a correct password, so after a lock expires the next wrong password locks again at once. A locked account is refused before the password is verified. Change-password uses the same counter.
- 2026-11-18: Per-email login limit (Phase 08): `LoginEmailLimiter` uses the existing in-memory `ThrottlerStorage` (no new store, entries already expire), key = SHA-256 of the normalized email, counts EVERY attempt (known or unknown email, success or failure), 429 after 10 per 15 minutes. Per-IP limits use `@Throttle` overrides of the default throttler on the auth routes (they replace the global 100 / min there).
- 2026-11-18: CSRF (Phase 08): custom header `X-Requested-With: nusantara-play` plus Origin allowlist; a missing Origin fails. `FRONTEND_ORIGIN_PATTERNS` entries are compiled as `^(?:pattern)$`, case-insensitive; invalid ones are skipped with a warning (index only). Change-password checks CSRF only when the request carries `np_refresh` (otherwise it is a plain bearer-token call).
- 2026-11-18: Refresh errors keep their machine-readable code: `AuthErrorFilter` (scoped to `LocalAuthController`) answers `{statusCode, error, message, timestamp, path, method}` for `refresh_conflict` and `invalid_refresh_token`; the global `HttpExceptionFilter` would drop `error` (Phase 08).
- 2026-11-18: Login and refresh answer 503 while local auth is disabled; register still works without keys (it needs none). Refresh also revokes the family and answers 401 when the user is gone, suspended or inactive. Login and refresh responses send `Cache-Control: no-store` (Phase 08).
- 2026-11-18: `JwtAuthGuard` marks the request (a symbol) after authenticating; a second run in the same request reuses `req.user` instead of running the strategies again. A `req.user` set by anything else is not trusted (Phase 08).
- 2026-11-18: The unused `JwtModule` (configured with `SUPABASE_JWT_SECRET`) was removed from `auth.module.ts`; nothing injected `JwtService`. The `@nestjs/jwt` package stays in package.json for now (Phase 08).
- 2026-11-18: No migration in Phase 08: `user_credentials` (Phase 07) already has `failed_login_count`, `locked_until`, `password_changed_at`.
- 2026-11-18: Owner decisions for Phase 09: users may log in without a verified email (earning Points, a later phase, will require one; Phase 09 only provides `emailVerified` and `@RequireVerifiedEmail()`); a successful password reset also clears the login lockout; access tokens issued before the last password change are rejected; password reset works for every account with that email, Supabase-only accounts included, and completing it creates their local credentials (self-service migration; the link proves ownership of the address).
- 2026-11-18: Where "email verified" lives (Phase 09): `user_credentials.email_verified_at` for accounts with a password; a new table `email_verifications` (user_id PK, method `email_link` | `google`, verified_at) for accounts WITHOUT one, because `user_credentials.password_hash` is NOT NULL and the `users` entity was outside the phase's allowed files. `emailVerified = credentials.email_verified_at IS NOT NULL OR an email_verifications row`. Phase 10: a Google-only account whose Google `email_verified` is true writes a row with method `google`; when such an account later gets a password (reset), the reset also sets `email_verified_at`. Both tables are created by the one Phase 09 migration.
- 2026-11-18: Email work runs in the background (Phase 09): registration hooks, resend-verification, forgot-password and the "password changed" email are queued after the response, so neither body nor timing depends on whether an account exists. Failures are logged with the error name only. `EmailFlowsService.whenIdle()` (also called on shutdown) waits for queued tasks.
- 2026-11-18: Per-address email limit (Phase 09): `EmailSendLimiter`, same in-memory throttler storage and SHA-256 keys as the login limit, 3 per hour per address and purpose (`verification` = registration emails + resend-verification; `password_reset` = forgot-password). Counted for every request (known or unknown address); over the limit the email is silently skipped and the endpoint still answers 200 ("always 200" wins over a 429). verify-email and reset-password only have the per-tracker limit (30 / min).
- 2026-11-18: Email tokens (Phase 09): consuming includes the token `type`, so a verification link never resets a password. A new token DELETES the user's older unused tokens of that type, serialized with `pg_advisory_xact_lock` per (user, type). reset-password checks the length policy, then the token read-only, then "not the email" (needs the user), hashes, and only then consumes the token inside the write transaction, so a policy error or a failed write never burns the link. `password_changed_at` uses the app clock (like change-password), compared with the token's `iat` (also app clock) with a 5 s skew.
- 2026-11-18: After a local change-password the own session continues through its next refresh (the kept refresh family issues a new access token); the change-password response stays 204 (Phase 09). The "password telah diubah" email is sent after a reset and after a LOCAL change-password, not after the legacy Supabase change-password (unchanged).
- 2026-11-18: `emailVerified` is added to the `user` object of login and refresh as well, so it stays the same object as `GET /api/users/me` (Phase 08 contract) (Phase 09).
- 2026-11-18: Without `APP_PUBLIC_URL` (or with an invalid one) no email with a link is sent (warning per attempt, without the address) instead of falling back to a guessed URL; the "akun sudah ada" email is still sent, without the login link (Phase 09).
- 2026-11-18: Visual track first; pilot province Sumatera Selatan; demo rewards and multiplayer are simulated, labelled
  "Demo" and never sent to the backend; demos are reviewed on the Vercel preview before merging (owner decisions, Phase 10).
- 2026-11-18: Single product domain https://nusantaralegacy.org. `next.config.ts` redirects (308, same path and query,
  `/backend-api` included) every request whose Host is `nusantaravirtual.org` or `www.nusantaravirtual.org`. No rule for
  `www.nusantaralegacy.org` (Vercel already redirects it, 307) and never one for the apex (Phase 10).
- 2026-11-18: 3D stack for Jelajah: three 0.187.0, @react-three/fiber 9.8.2, @react-three/drei 10.7.9 (React 19 peers),
  dev: @types/three 0.187.0. No other 3D, physics or animation libraries. three.js is loaded only through `next/dynamic`
  with `ssr: false` from the /jelajah hub; a test guards the import graph (Phase 10).
- 2026-11-18: Province boundaries: geoBoundaries gbHumanitarian IDN ADM1 (OCHA ROAP/HDX, 2019, CC BY 3.0 IGO) instead of
  gbOpen (ODbL), simplified with mapshaper 0.6.18 (last release without native build scripts) to 225 KB in
  `public/jelajah/geo/`. The 2019 data has 34 provinces; Papua Selatan (93) has no own shape (accepted by the owner, Phase 10).
- 2026-11-18: The pilot province is always clickable on the hub map (own soft colour, card with "no PROT yet" and the
  Masuk button) even without public PROT; every other province without public PROT is muted and not clickable
  (accepted deviation, Phase 10).
- 2026-11-18: Device tiers for 3D pages: full (antialias, pixel ratio up to 2), lite (no antialias, pixel ratio up to
  1.5), 2d (SVG, no three.js). Automatic choice from WebGL2, deviceMemory, hardwareConcurrency and a short fps probe,
  cached; the user's override is stored in localStorage (`jelajah.tier`). Budgets live in `lib/jelajah/budget.ts` (Phase 10).
- 2026-11-18: Everything that uses disk space goes to D:, never C:; Docker Desktop data moved to D:\DockerData\wsl by the
  owner (see "Local machine").
- 2026-11-18: Owner decisions for Phase 11 (visual track V2): 3D assets come from free CC0 low-poly packs (Kenney Nature
  Kit 2.1 and Mini Characters 2.0 chosen); traditional buildings are built procedurally in code because no free pack has
  Indonesian architecture, and are described only as "terinspirasi rumah limas"; no simulated other players (bots); the
  scene must look good on phones (first test device iPhone 11; target stays a 4 GB mid-range Android); production has 0 public
  PROT in Sumatera Selatan, so the scene must look intentional when empty ("Segera hadir" stands) and fill itself when real
  PROT are published; local development uses clearly labelled DEMO data; no invented cultural facts (scene text comes only
  from PROT data or neutral UI text).
- 2026-11-18: Asset licence rule: only CC0 assets in `public/jelajah/assets/`, each pack recorded in `ASSET_LICENSES.md` (name,
  author, source URL, licence as checked in the pack, files used). Raw packs are downloaded to D: and never committed; the
  committed files are built by `scripts/optimize-jelajah-assets.mjs` (meshopt, WebP <= 1024 px, no KTX2). Dev dependency
  `@gltf-transform/cli` 4.5.1 (its core/extensions/functions packages are resolved through it; lockfile stays 9.0, no new
  build scripts) (Phase 11).
- 2026-11-18: Province scenes are data files (`lib/jelajah/scenes/<slug>.ts`) rendered by one engine; collision is circles and
  turned boxes with push-out (no physics library); stands get PROT in name order, the last stand turns into a notice board when
  a province has more PROT than stands; signs are canvas sprites (not drei `<Html>`); no realtime shadows (blob shadows), one
  directional + one ambient light; the player stays visible behind roofs through a silhouette pass (Phase 11).
- 2026-11-18: Phase 11 was interrupted by a usage limit after the verification run and resumed; the resume finished the
  player-silhouette fix, the dev-overlay measurements, fresh screenshots and the docs (Phase 11 report, "Deviations").
- 2026-11-18: Owner decisions for Phase 12 (visual track V3, from the Phase 11 screenshots): the phone camera was too far
  behind the player (empty grass below, side stands cut off); the hidden player's silhouette must read as the character in
  the site's primary colour; the plaza gets one neutral centrepiece; stand signs must be larger and never cut off; rewards
  stay SIMULATED (frontend only, labelled "Simulasi, tidak disimpan", never sent to the backend, only for the current
  browser tab via sessionStorage in try/catch); no simulated other players yet; no invented cultural facts (new objects are
  neutral or worded "terinspirasi").
- 2026-11-18: Camera (Phase 12): fixed 40° pitch, no rotation; the player's chest sits at 40 % below the screen centre
  (lower third); the field of view goes from 62° (portrait phone) to 44° (landscape); the distance is the smallest one at
  which the player, the two stands nearest to the spawn point and every sign top fit inside 92 % of the screen; follow
  with a critically damped spring (0.16 s); 1.5 s entry glide only on the full tier and never with reduced motion, skipped
  by any key, pointer, wheel or touch. Pure math in `lib/jelajah/engine/camera.ts`.
- 2026-11-18: Silhouette (Phase 12): primary colour #9E3C24 (light-theme `--color-primary`; the 3D scene keeps one look in
  both site themes) at a fixed 0.82 opacity, blended in the opaque pass (CustomBlending, stencil so every pixel blends
  once), plus a light #FFF1DC edge from the same skinned meshes pushed out 5.5 cm along their normals. The canvas now
  requests a stencil buffer. +2 draw calls.
- 2026-11-18: Plaza centrepiece (Phase 12): a procedural open pavilion (two-tier pyramid roof on four posts, low
  platform), merged into the village mesh (0 extra draw calls), box collider; the UI never names it.
- 2026-11-18: Demo reward rules (Phase 12): entering a province scene +25 XP once per tab; opening the panel of a PROT
  +10 XP once per PROT (stand or notice-board entry, 3D and 2d); 3 different PROT of a province (all of them when it has
  fewer, at least 1) = that province's Paspor stamp +50 XP; level n needs 50 × n × (n + 1) total XP, read literally: the
  simulation starts at level 0 and reaches level 1 at 100 XP. Constants in `DEMO_REWARD_RULES`. Key
  `sessionStorage['jelajah.demoRewards.v1']`; anything unexpected in it means an empty simulation. The Paspor has an
  "Atur ulang simulasi" button for repeated demos.
- 2026-11-18: Theme (Phase 12, Phase 10 finding #418): the inline script in `app/layout.tsx` only sets the `dark` class on
  `<html>` (try/catch, still the only allowed `dangerouslySetInnerHTML`); components read the theme after mount with
  `useSyncExternalStore` and a light server snapshot (`AnimatedThemeToggler`, `lib/jelajah/use-theme-mode.ts`). Never read
  `localStorage` or the `dark` class during the first render.
- 2026-11-18: Icons (Phase 12): `app/favicon.ico` (258 KB, 9 sizes) replaced by `app/icon.png` (48 px), `app/apple-icon.png`
  (180 px, 128-colour palette) and `public/favicon.ico` (16 and 32 px PNG entries): 11.6 KB in total, generated with the sharp
  already in node_modules from the logo's own 256 px PNG (same design).
- 2026-11-18: C: fell to 2.9 GB during the Phase 12 verification (builds, `next dev` and headless Chrome at the same time):
  Windows grew `C:\pagefile.sys` to 11 GB. Run one heavy process at a time and check C: again after each.
- 2026-11-19: Owner decisions for Phase 13 (visual track V4): the boss approved continuing; this phase finishes the visual
  track before the backend work resumes. Levels start at 1: level L needs 50 × (L − 1) × L total XP (L1 = 0, L2 = 100,
  L3 = 300); the future backend uses the same curve (replaces the Phase 12 "level 0" reading). Site-wide toasts appear
  at the top centre. No navbar link to /jelajah and no brand rename yet (both still wait for the boss).
- 2026-11-19: Toast placement (Phase 13): one global sonner Toaster, `top-center`, 72 px from the top (below the 64 px
  navbar) through `--toast-top`; Jelajah pages move it below the overlays marked `data-toast-avoid` (title bar,
  "Tampilan", HUD, stand panel close button). Messages such as the empty-province banner and the help hint are not
  avoided: a toast may cover them for its 2 to 4 seconds.
- 2026-11-19: Simulated reward state key `sessionStorage['jelajah.demoRewards.v2']` (version 2) for the level-1 curve;
  v1 state is ignored (Phase 13).
- 2026-11-19: Real-device measurement (Phase 13): `?debug=1` overlay with the 2 s average fps, draw calls, triangles,
  tier, devicePixelRatio and canvas size; nothing is mounted without the flag. Automatic fallback in the province scene
  only (the hub map renders on demand): full → lite below 24 fps for 5 s, lite → 2d below 20 fps for another 5 s, after
  the intro, paused while the tab is hidden, cached like the measured automatic tier, never over a manual choice.
- 2026-11-19: PROT photos (Phase 13): option (a), next/image + Vercel Image Optimization, because plain lazy `<img>`
  (option b) cannot meet the `/prot` < 1 MB target (the 2.1 MB PNG is the second card on phones, inside the lazy-load
  distance) and leaves the detail page at 4.6 MB. Kept inside the Hobby limits (5K transformations, 300K cache reads,
  100K cache writes per month; over the limit new images answer 402): only the PROT bucket under `/prot/**` (https, no
  query) in `images.remotePatterns`, two display sizes (two variants per photo and size), Next 16 defaults otherwise
  (webp only, quality 75, `minimumCacheTTL` 4 h), and the original URL as fallback when optimization fails. No
  third-party image service. Real fix for the source sizes: resize at upload time in the backend (later phase).
- 2026-11-19: Jelajah photo rule (Phase 13): https only; an http URL on a loopback host is accepted only while the page
  itself runs on a loopback host (local `next dev` or `next start`), so the local DEMO placeholder also shows in a local
  production build while the deployed site stays https-only.
- 2026-11-19: Page file (owner, before Phase 13): `D:\pagefile.sys` system managed; a fixed 2 GB page file remains on C:.
- 2026-11-19: Fonts are self-hosted (Phase 13, after the PR #12 Vercel preview failed): `app/layout.tsx` loads Plus Jakarta
  Sans (variable, weights 300–800) and Geist Mono (variable, 100–900) with `next/font/local` from
  `app/fonts/*-latin.woff2` (latin subset, downloaded once from the Google Fonts CSS API, OFL files next to them, sources
  and SHA-256 in `app/fonts/README.md`); same CSS variables `--font-jakarta-sans` / `--font-geist-mono`, swap, preload. No
  build downloads fonts any more; `tests/config/fonts.test.ts` fails on a `next/font/google` import. Finding, not changed:
  `globals.css` sets `--font-sans: var(--font-jakarta-sans)` in a plain `@theme` block (emitted on `:root`, where the
  next/font variable does not exist), so the site actually renders in Tailwind's system font stack, before and after.
  Fixed in Phase 14 (see below).
- 2026-11-19: Owner decisions for Phase 14: the landing page `/` uses the same optimized photo approach as /prot;
  `images.minimumCacheTTL` may be raised to 31 days only if every upload gets a new file name; the Phase 13 http-photo
  rule (http only when both the photo and the page are on a loopback host) is accepted.
- 2026-11-19: Image cache TTL (Phase 14): `images.minimumCacheTTL` = 2678400 (31 days). Checked in the backend: every
  upload path (PROT foto/video/dokumen/peralatan, NFT image, `/upload/image|avatar|document|video`) goes through
  `StorageService.uploadFile()`, which builds the key `<folder>/<randomUUID()>.<ext>` (unchanged since the first
  commit); `getPresignedUrl(key)` takes a caller key but has no caller; nothing else writes to S3. A replaced photo is
  a new upload with a new URL, so no cache entry can go stale. Rule: S3 object keys are never reused; if that ever
  changes, lower the TTL again. Effect: each variant (source URL × width) is transformed at most about once per
  31 days instead of once per 4 hours of being requested.
- 2026-11-19: Landing carousel (Phase 14): shown only from `lg` (1024 px), so its photos are static imports passed
  through `getImageProps` into a `<picture>` whose `<source media="(min-width: 1024px)">` carries the optimized srcset;
  below `lg` the `<img>` shows a 1x1 data URI and downloads nothing. The first slide (the one visible on load,
  `hero.webp`) is eager with high fetch priority; `nusland.webp` (renamed from `nusland (1).webp`) is the second slide
  and lazy. The featured PROT on `/` use `ProtPhoto` `cover` (the /prot variants, no extra transformations).
- 2026-11-19: Events and NFT pages (Phase 14): no `RemotePhoto` and no new `remotePatterns`, because in production the
  only event has no banner and the only NFT has no image or gallery, so these pages load no remote images. Revisit when
  they get images (likely prefixes `/images/nfts/` for NFT uploads; event banners are a free-text URL).
- 2026-11-19: Fonts displayed (Phase 14, own commit so it can be reverted alone): the two font lines moved to
  `@theme inline` in `app/globals.css` and the `body` rule uses `var(--font-jakarta-sans)` directly (with the
  Arial/Helvetica fallbacks), so Plus Jakarta Sans and Geist Mono are used as intended
  (`tests/config/fonts.test.ts`). Jakarta is wider: the landing navbar's right-hand group got tighter spacing below
  `sm` (it overflowed by 1 px at 390 px); nothing else overflowed on `/`, `/prot`, a PROT detail and the Jelajah pages.
- 2026-11-19: Owner decisions for Phase 15 (real rewards, part 1): two currencies, XP (levels, leaderboard, never
  redeemable) and Points (redeemable later for in-platform rewards; never cashed out, never transferable). Actions
  reported by the browser give XP only, never Points; Points come only from server-verified actions (server-graded
  quizzes, organizer-confirmed event check-ins, later realtime-verified mini-games), and Phase 15 has no rule that grants
  them except admin adjustments. Levels: L needs 50 × (L − 1) × L XP. First rules PROVINCE_ENTER +25, PROT_VIEW +10
  (ARSIP_NASIONAL only), PASPOR_STAMP +50 at min(3, province PROT count) views, constants in one file. Points need a
  verified email when granted. No frontend changes until the frontend switches to the new auth.
- 2026-11-19: Local databases get the ledger trigger from `db:setup` (owner decision, Phase 15): `synchronize()` cannot
  create triggers or DESC indexes and the migration baseline only records migrations as applied, so `db-local-setup.ts`
  calls the migration's idempotent static `installDbObjects()` after `synchronize()`. It is a static method, not a second
  export, because TypeORM loads every exported function of a migration file as a migration ("someClass is not a
  constructor"). The migrated and the synchronized schema were compared with `pg_dump` and are identical.
- 2026-11-19: Leaderboard `scope=province` ranks by the XP a user earned IN that province (ledger rows tagged with its
  `provinsi_kode`: PROVINCE_ENTER, PROT_VIEW, PASPOR_STAMP), not by a home province (owner decision, Phase 15). The
  national board uses `reward_balances.xp_total`. Both list only `active` users with more than 0 XP, ranked with
  `RANK()` (ties share a rank, then user id order), show the user's overall level, and return users only as
  `toPublicUser()`. Only the top 50 is cached (60 s, per scope, in memory); the caller's own rank is computed live.
- 2026-11-19: Ledger design details (Phase 15): `currency` is text + CHECK; the XP row of a grant uses the base key, a
  Points row `{base}:POINTS`; a grant is a duplicate when any of its keys exists, so Points withheld for an unverified
  email are not granted later by repeating the action (the XP row records `points_withheld`). `created_at` is
  `clock_timestamp()` so the rows of one transaction keep their order (a PROT_VIEW before the stamp it earns). The
  append-only trigger allows exactly one kind of DELETE: the cascade from a deleted `users` row (the user row is already
  gone), otherwise accounts could never be deleted. `user_prot_views` has no foreign key to `prot` (a recorded view
  survives unpublishing). The Paspor counts only views of PROT that are ARSIP_NASIONAL now, and a repeated PROT_VIEW
  re-checks the stamp (a province whose PROT count dropped may have become complete).
- 2026-11-19: Grant response (Phase 15): `{ granted: {xp, points}, balance: {xp, points, pointsAvailable}, level, levelUp,
  stamp, duplicate, pointsWithheld }`. `granted` is what THIS request added (a PROT_VIEW that earns the stamp reports
  60 XP, `stamp.xp` 50); a duplicate returns `granted` 0 and the current balance with HTTP 200. Invalid references (a
  province code that is not a two-digit province in `daerah`, a PROT that does not exist or is not ARSIP_NASIONAL,
  including drafts) all answer 400 with the same message per type, so drafts cannot be probed.
- 2026-11-19: Admin adjustments (Phase 15): one ADMIN_ADJUST row per request (key `ADMIN_ADJUST:{userId}:{random uuid}`,
  `source_id` = admin id, reason in `metadata`), refused when the balance would go below 0; added Points need a verified
  email and are held like any Points, removed Points count at once. The response carries the new row `id`, which
  `AuditInterceptor` stores as `entity_id`. `points_available_cache` is refreshed on every grant; the endpoints compute
  the live value from the ledger, and the reconciliation reports a stale cache separately (not an error). Exit codes of
  `rewards:reconcile`: 0 clean or fixed, 1 differences without `--fix`, 2 failure.
- 2026-11-19: Existing e2e failure found in Phase 15, not changed: `test/email-flows.e2e-spec.ts` "registering an
  existing email" expects the emails in the order verification, account_exists, but the background queue sometimes
  delivers them the other way round (failed 2 of 2 full runs on main, about half of the full runs on the Phase 15 branch).
- 2026-11-19: Owner decisions for Phase 16 (Jelajah intro bumper): a short animated intro on `/jelajah` that shows
  what the whole site offers before the map; built in code (React + CSS + the existing framer-motion), not a video;
  plays automatically once per browser session (sessionStorage, try/catch), always skippable, replayable from
  "Putar intro"; the hub data and the 3D chunk load behind it; no sound; only real data or neutral text; the site
  name comes from one constant (default: the navbar's "Nusantara Virtual"), so a rename is a one-line change.
- 2026-11-19: Bumper details (Phase 16): 6 scenes of 3 s (the last 4 s), 19 s in total; "Lewati" and Esc skip;
  tap, click or Enter go to the next scene (Enter always means "next", so Lewati is pressed with Space, a click or
  Esc); the bumper is a full-screen `role="dialog"` above the navbar with focus on "Lewati", Tab kept inside, page
  scrolling locked and the hub `inert` behind it; focus goes to the hub's "Tampilan" button afterwards. The
  "session" is the browser tab (sessionStorage); when storage is unavailable an in-memory flag limits it to once
  per page load. Opening a province page also marks the intro as seen, so a visitor who arrived through a deep link
  does not get it on "Kembali ke peta". Number tiles of the community scene show only numbers above 0 (a 0 says
  nothing); while a number is unknown (loading, error) the scene shows its text without it.
- 2026-11-19: Bumper and the tier probe (Phase 16): the first-visit automatic tier probe (0.7 s of frame timing,
  cached in localStorage) measured the bumper's animations and chose lower tiers (headless check: 6 of 6 runs lower,
  3 of them 2d). The auto-played bumper therefore waits on its plain cover until the automatic tier is known (at most
  3 s); afterwards 6 of 6 runs chose full, as without the bumper. On later visits the tier is cached and the bumper
  starts right after hydration.
- 2026-11-19: Bumper logo (Phase 16): the site icon `app/apple-icon.png` (180 px, 6 KB, served at
  `/apple-icon.png`), shown unoptimized next to the accent diamond of the navbar mark; no new image files.
- 2026-11-19: Owner decisions for Phase 17 (first self-hosted game): the website hosts its own games instead of
  linking to external sites; no files of the old external games exist, so games are built from scratch; the first is
  congklak in 2D, light enough for mid-range phones. Games are played without logging in and record nothing (no XP,
  no scores, nothing sent to the backend); only local settings are kept in localStorage (try/catch). Congklak rules
  differ between regions: ONE common ruleset ("Aturan dasar") is implemented and described exactly as implemented,
  without claiming it is the only correct version, with every rule switch in one config file. The landing page's
  external "virtual tour" links are replaced with `/jelajah`. The Jelajah bumper now plays once per day per browser
  (local date in localStorage, versioned key; once per session as the fallback when localStorage is unavailable);
  "Putar intro" and the deep-link rule are unchanged.
- 2026-11-19: Congklak "Aturan dasar" (Phase 17): 2 rows of 7 holes, 7 seeds each (98), one store per player;
  sowing anticlockwise towards the own store, skipping the opponent's store; last seed in the own store = move
  again; in a non-empty small hole (either side) = pick up and keep sowing; in an empty own hole = capture the opposite
  hole plus that seed when the opposite has seeds (switch `captureRequiresLap`, default off), turn ends; in an empty
  opponent hole = turn ends; the game ends when the player to move has no seeds in their small holes, and the
  opponent sweeps their own side into their own store; more seeds wins, equal is a draw. Safety limit 10,000 seeds
  sown per move (never reached in 1,000 random games; longest move 272 seeds).
- 2026-11-19: Congklak AI worker (Phase 17): Next 16.1's Turbopack copies `new Worker(new URL('./x.ts',
  import.meta.url))` files as raw `.ts` assets instead of bundling them (found in the production build; in development
  the worker failed silently and the AI ran on the main thread). The engine and AI therefore live in one
  self-contained function (`lib/games/congklak/core.ts`, type-only imports, no classes, async code or generators) and
  the worker is started from a Blob of its source plus a small handler; a test runs that source in isolation. Without
  Blob workers (old browser, strict CSP) the move is computed on the main thread with a 40 ms limit. Revisit when
  Turbopack bundles worker files (then a plain `ai.worker.ts` can replace the Blob).
- 2026-11-19: Congklak page details (Phase 17): the board is horizontal on landscape and desktop and vertical on
  portrait phones up to 767 px wide ("Kamu" / "Pemain 1" on the right with their store at the top); hole numbers 1 to 7
  follow the sowing order; reduced motion and "Tanpa animasi" show the move at once with a short highlight (no hand,
  no movement); the computer waits at least 250 to 550 ms (by speed) before playing so its moves are readable;
  `from=` on the game page is allowlisted (`jelajah` → "Kembali ke peta", `jelajah-<enterable slug>` → "Kembali ke
  desa"), never an open redirect. The bumper's "Main Congklak" opens `/main/congklak?from=jelajah`.
- 2026-11-19: Owner decisions for Phase 18: the brand is renamed from "Nusantara Virtual" to "Nusantara Legacy"
  everywhere users see it; navbar links to the Jelajah map and the games are shown now; the Jelajah map requires login
  (a logged-out visitor of `/jelajah` or `/jelajah/*` sees a notice, logs in and lands on the page they wanted);
  the games under `/main` stay public; "Mulai Tur Virtual" goes straight to the map for logged-in users (the daily
  bumper rules still apply); landing statistics count only published content (ARSIP_NASIONAL PROT and their
  provinces); the gate uses whatever the frontend uses to know a user is logged in (Supabase today) and moves with it
  when the frontend switches to the self-hosted login.
- 2026-11-19: Login gate details (Phase 18): the static files under `public/jelajah/geo|assets|demo/` stay public (data,
  not pages); `redirectTo` keeps the query (`/jelajah?debug=1`), is a validated same-site path, never `/login` or
  `/signup`, and falls back to `/menu` (the old default); a logged-in visitor on `/login` with a valid `redirectTo`
  goes there instead of `/profile`. Google sign-in carries the target in a 10-minute `np_post_login` cookie instead of
  a query on the Supabase redirect URL, so the Supabase redirect allowlist needs no change. The OAuth callback's
  `next` parameter is validated (it was an open redirect, e.g. `next=@evil.com`). Existing `/login?redirectTo=…`
  links (events, menu) now work too.
- 2026-11-19: Navbar on phones (Phase 18): app navbar = a menu button (below `md`) with the same four links, the brand
  one size smaller and the account chevron hidden below `sm` (fits 360 px with 16 px to spare); landing navbar = a
  second row with "Tur Virtual" and "Game" below `md`, because its bar (brand, theme, Masuk, Daftar) is already full.
- 2026-11-19: Landing statistics (Phase 18): computed in the frontend from the public PROT list with the Jelajah map's
  own code, so they agree with the map and the bumper before the backend change is deployed; the backend
  `/stats/landing` change (published-only PROT and province counts) waits in "Pending deployment". A province
  counts when a published PROT has its code and the code is one of the 35 known provinces (the map's rule).
- 2026-11-19: Concept video (Phase 19, owner decision): a code-driven film, not an mp4 in the app. It plays by itself
  only on the first `/jelajah` visit per browser (`localStorage['np_concept_seen_v1']`), after the intro bumper's daily
  play; `?concept=1` forces it; "Tonton pengenalan" replays it. It counts as seen after 1 s of playing or when it ends, so a
  navigation away in the first second (for example the bumper's "Main Congklak") does not use it up; province pages do not
  mark it (open question in the Phase 19 report). All copy and timings live in `lib/jelajah/concept/script.ts`, except the
  map button's label, which lives in `gate.ts` so the captions stay out of `/jelajah`'s initial JS.
- 2026-11-19: Concept video performance (Phase 19): the first version ran at 3 to 15 fps in headless Chrome (software
  rendering) because moving SVG elements repainted full-screen backgrounds and SVG camera moves re-rasterised the map
  every frame. Rules since then: static backgrounds and moving parts on separate compositor layers (`will-change`), camera
  moves as CSS transforms, the lit map painted once and revealed by a transform-only wipe (the provinces still light west
  to east), the hub not painted under the film. The particles are dropped only when the 2 s average stays below 30 fps for
  3 s (a single first-paint stall had dropped them for the whole film). The dive into Sumatera Selatan stops at 6x (a
  compositor layer keeps its first raster scale, so deeper zooms turn blurry).
- 2026-11-19: Local checks of login-gated pages (Phase 19): the frontend cannot log in locally, so the Phase 19 browser
  checks used a fake Supabase auth endpoint on localhost (`/auth/v1/user` answering a test user) and a matching session
  cookie, in scratch files on D: only (never committed); requests to `/backend-api` had their Authorization header removed,
  so production saw only plain public read-only GETs.
- 2026-11-19: Gasing (Phase 20): the published archive record "Gasing" (Kepulauan Riau) describes Gasing Uri and Gasing
  Pangkah, so the game implements both, paraphrasing and crediting the record (linked to its `/prot` page). Decisions:
  both tops are identical (a heavier "pemangkah" striker made the striker win ~90 % of rounds); the Pangkah round is
  decided like Uri, by spin time measured from each top's own landing, plus out = loss (so a waiting striker gains
  nothing and a hit pays off by shortening the target's spin); a shaky release scatters the landing point so release
  quality also means accuracy; the computer's Sulit search is cheap enough for the main thread (no worker).
- 2026-11-19: Gasing canvas (Phase 20): the browser's default (GPU-backed) 2D canvas, static arena on its own canvas,
  compositor-only shake and meters. `desynchronized: true` is forbidden (frames bypassed the compositor and the tops
  were missing from screenshots, while the fps looked high).
- 2026-11-19: Phase 18 follow-ups (owner answers): the Supabase redirect allowlist needs no query variants; removing
  `/landing-page/1` and `/2` waits for the cleanup phase. Phase 19: the Jelajah login page shows a note and a link to the
  games instead of "Masuk sebagai Tamu"; the landing page's featured PROT are requested with `status=ARSIP_NASIONAL` and
  filtered again.
- 2026-11-17: Local daerah seed reuses `src/database/migrations/002_replace_daerah_data.sql` (34 provinsi + 514 kab/kota, Kemendagri codes) and the `up()` of `src/migrations/1740500100000-SeedKecamatanKelurahanDesa.ts`; `1738826000000-SeedDaerahBPS.ts` is not used (12 provinces only, codes that do not match the kecamatan CSV) (Phase 05).

## Phase workflow

- Work happens in numbered phases. Each phase uses its own branch phase-XX-<short-slug>, created from the latest main.
- Do only what the phase prompt asks. Anything else you notice goes under "Out-of-scope observations" in the report.
- Every phase ends with a report at nusantara-play-be/docs/phase-reports/phase-XX.md that follows nusantara-play-be/docs/phase-reports/TEMPLATE.md, and the full report is printed as the final message.
- Commit after each completed step of a phase on the phase branch, so an interruption loses as little work as possible.

## Local machine

Windows 11; repos live on drive D: (`D:/Project/Nusantara Legacy/`). C: is small. **Standing rule (owner, 2026-11-18):
everything that uses disk space goes to D:, never C:.** Every cache, temp folder, build output, browser profile,
screenshot, Docker image, volume and container lives on D:; nothing new may be written to C:.

- Before heavy work, check free space on C: and D:. **Stop and tell the owner if C: has less than 3 GB free** or D:
  has less than 10 GB free. Check again after builds, test runs and browser automation.
- Detect the shell first (Git Bash: `export`, PowerShell: `$env:`, cmd: `set`) and set these **session-only** variables for every command. Use forward slashes (`D:/...`):
  - npm cache (also used by npx): `npm_config_cache=D:/dev-cache/npm`
  - Temp files: `TEMP`, `TMP` and `TMPDIR` = `D:/dev-cache/tmp`
- pnpm: always pass `--store-dir D:/.pnpm-store` and a D: cache dir, otherwise pnpm writes its metadata cache to C:. **pnpm 12 has no `--cache-dir` flag** (it fails with a misleading "unexpected argument" error); use `--config.cache-dir=D:/dev-cache/pnpm-cache` (or env `pnpm_config_cache_dir=D:/dev-cache/pnpm-cache`). Also pass `--state-dir D:/dev-cache/pnpm-state`. Example:
  `pnpm install --frozen-lockfile --store-dir D:/.pnpm-store --config.cache-dir=D:/dev-cache/pnpm-cache --state-dir D:/dev-cache/pnpm-state`
  If pnpm complains that node_modules was linked from a different store, the frontend `node_modules` folder may be deleted and reinstalled. Delete nothing else.
- Jest: `npm test -- --cacheDirectory D:/dev-cache/jest`
- Browser automation (headless Chrome): always `--user-data-dir=D:/dev-cache/tmp/<phase>/chrome-profile`; screenshots go to
  `D:/dev-cache/screens/<phase>/`. Downloads and scratch data go to `D:/dev-cache/tmp/<phase>/`.
- Git Bash rewrites arguments that start with `/` into Windows paths (`/prot` → `C:/Program Files/Git/prot`); set
  `MSYS_NO_PATHCONV=1` when passing URL paths to scripts.
- Create these folders if they do not exist.
- Do not change global settings (no `npm config set`, no `pnpm config set --global`, no edits to system or user environment variables) unless the owner asks.
- Docker Desktop's data lives on D: since 2026-11-18 (owner moved it; Docker setting `CustomWslDistroDir` =
  `D:\DockerData\wsl\DockerDesktopWSL`): images, containers and volumes are in
  `D:\DockerData\wsl\DockerDesktopWSL\disk\docker_data.vhdx` (the distro itself in `...\main\ext4.vhdx`). Nothing Docker-related
  remains under `%LOCALAPPDATA%\Docker\wsl`. Phases may pull images and start containers when the phase asks for it (for example
  `npm run db:up`); the volume `nusantara-dev-db-data` survived the move.
- Never connect to the production database. Local PostgreSQL uses port 5432 (Docker container `nusantara-dev-db`, bound to 127.0.0.1).
- Drive letter case (Phase 13 finding): run backend `npm run db:setup` and the e2e tests from a working directory that
  starts with an upper-case `D:\` (for example PowerShell `Set-Location 'D:\Project\Nusantara Legacy\nusantara-play-be'`).
  From a lower-case `d:\` working directory Node loads the entity classes twice (once per path spelling) and the DEMO
  seed fails with "this.subQuery is not a function".
