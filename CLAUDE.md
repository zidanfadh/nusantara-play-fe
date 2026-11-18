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
- `app/jelajah/` — Jelajah Nusantara (public): hub map `/jelajah`, province pages `/jelajah/[provinsi]` (Phase 10)
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

## Key Conventions

- All backend calls go through `apiClient` — never use raw `fetch` directly (except multipart file uploads where the browser must set the `Content-Type` boundary automatically). Files that currently call `fetch` directly (some of them for uploads): `app/page.tsx`, `hooks/useMarketplace.ts`, `lib/api/stats.ts`, `lib/api/nfts.ts`, `lib/api/prot.ts`.
- API modules live in `lib/api/` and return typed responses matching `types/*.ts`.
- Hooks follow the pattern: `useState` + `useEffect` with `isMounted` guard + optional `refetch` via a `refresh` counter. See `hooks/useEvents.ts` as the canonical example.
- Pages are mostly `'use client'` components that compose hooks + components. Keep pages thin.
- Use `useCurrentUser()` to get the authenticated user and check roles (`user.role`).
- Admin role is `'admin_kpoti'`. Check via `user.role === 'admin_kpoti'` or `['kurator_daerah', 'admin_kpoti'].includes(user.role)`.
- Audit log `changes` are always displayed through `redactSecrets()` (`components/audit/redact-secrets.ts`): values of secret-looking keys (password, token, secret, api key, authorization) show as `[REDACTED]` at any depth (Phase 07).
- Components are grouped by domain: `components/events/`, `components/prot/`, `components/marketplace/`, etc.

## Feature Modules

| Domain | Types | API | Hooks | Components | Pages |
|--------|-------|-----|-------|------------|-------|
| PROT | `types/prot.ts` | `lib/api/prot.ts` | `hooks/useBlockchainProof.ts` | `components/prot/` | `app/prot/` |
| Events | `types/events.ts` | `lib/api/events.ts` | `hooks/useEvents.ts` | `components/events/` | `app/(protected)/events/` |
| Calendar | `types/calendar.ts` | `lib/api/calendar.ts` | `hooks/useCalendar.ts` | `components/calendar/` | `app/(protected)/calendar/` |
| Marketplace | `types/marketplace.ts` | `lib/api/marketplace.ts` | `hooks/useMarketplace.ts` | `components/marketplace/` | `app/(protected)/marketplace/` |
| Jelajah | `lib/jelajah/data.ts` | `lib/jelajah/data.ts` (via `apiClient`) | `lib/jelajah/use-*.ts` | `components/jelajah/` | `app/jelajah/` |

## Jelajah Nusantara (Phases 10 and 11)

Feature code lives only in `app/jelajah/`, `components/jelajah/`, `lib/jelajah/`, `public/jelajah/` (and `scripts/build-jelajah-geo.mjs`,
`scripts/optimize-jelajah-assets.mjs`, `scripts/check-jelajah-budget.mjs`).

- `app/jelajah/page.tsx` (static) renders `JelajahHub` (client). `app/jelajah/[provinsi]/page.tsx`: `generateStaticParams` +
  `dynamicParams = false`, so only `ENTERABLE_PROVINCES` (`sumatera-selatan`) exist; every other slug is a 404.
  `/jelajah` and `/jelajah/*` are public in `middleware.ts` (that also covers the static geo file). No navbar link yet.
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
- Budgets (`lib/jelajah/budget.ts`): 30 fps, 5 MB cold download for /jelajah, 100 draw calls, 100k triangles. In
  development `Map3D` shows an fps / draw calls / triangles overlay and warns in the console when the set of exceeded
  budgets changes.
- Colours (`lib/jelajah/palette.ts`) are derived from the `app/globals.css` tokens; the theme comes from the `dark` class on
  `<html>` (`use-theme-mode.ts`, `useSyncExternalStore`), so the map recolours live when the navbar toggle is used.
- Everything simulated is labelled "Demo" in the UI and never sent to the backend.

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
  `lib/jelajah/data.ts` → plain-text `SceneProt`, https photos only, shortened texts), `help-hint.ts` (controls hint shown once,
  `localStorage['jelajah.sceneHelpSeen.v1']`, try/catch).
- **Views**: `ProvinceExperience.tsx` (client: data, tiers, overlays: Demo label, back to the map, help hint, loading screen with
  progress, "Lihat" button, `StandPanel` side panel / bottom sheet with Esc and focus return, screen-reader stand list),
  `three/VillageScene3D.tsx` (full/lite), `ProvinceScene2D.tsx` (2d: illustrated header + PROT card grid, same panel, no three).
- **3D build-up** (`lib/jelajah/three/`): `village-geometry.ts` merges ground, plaza, paths, river banks, the procedural raised
  houses ("terinspirasi rumah limas", never described otherwise) and the stand pavilions into ONE vertex-coloured mesh;
  `model-bake.ts` bakes the Nature Kit materials to vertex colours for one `InstancedMesh` per model; `canvas-textures.ts` draws
  the stand signs (canvas sprites, not drei `<Html>`) and the blob shadow. One directional + one ambient light, no realtime
  shadows. The player (Kenney mini character, idle/walk) has a fixed-pitch follow camera and a silhouette pass (opaque render
  order scene 0 → silhouette 1 → player 2, `depthFunc: GreaterDepth`) so it stays visible behind roofs. Lite tier drops
  decor marked `detail` and the water streaks. Measured (Phase 11, dev overlay): full 43 draw calls / 17.7k triangles, lite 34 / 9.2k.
- **Assets** (`public/jelajah/assets/v1/`, versioned folder; bump to `v2/` instead of changing files in place): `nature.glb` and
  `player.glb`, built by `pnpm jelajah:assets --nature <dir> --characters <dir>` from packs downloaded to D: (never committed
  raw): meshopt (decoded by drei `useGLTF`), textures <= 1024 px as WebP, no KTX2. **Only CC0 packs**; every pack and the exact
  files used are recorded in `public/jelajah/assets/ASSET_LICENSES.md` (licence checked in the pack's own licence file).
- **Budget**: `pnpm check:jelajah` fails if a scene's asset files exceed 8 MB in total (or are missing) or any texture in
  `public/jelajah/assets/` (also inside .glb files) exceeds 1024 px. Phase 11: 195.6 KB of assets; cold load of the scene
  about 0.74 to 0.97 MB (3D) and 0.39 MB (2d).
- Scene text comes only from PROT data or neutral UI text; no cultural facts are invented.

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
   - Rewards and multiplayer shown in demo phases are SIMULATED until the backend exists: clearly labelled "Demo" in the
     UI and never sent to or saved on the backend.
   - Demos are built on phase branches and shown to the boss through the Vercel preview link before anything is merged
     to production. No navbar link to /jelajah until the boss has reviewed it.
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
   `…de31` to `…de34`, neutral placeholder text) for the Jelajah scene). Idempotent. Flags: `-- --database=<name>`, `-- --no-demo`.
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

## Engineering rules

- Before writing code, show a short plan and the list of files you will touch.
- Every phase ends with passing tests and a successful build. Add or update unit tests for every service you change.
- Lint rule: a phase must not add new lint errors in the files it touches.
- Ownership and permission checks live in the service layer and throw ForbiddenException.
- Any multi-table write that must be atomic uses a TypeORM transaction.
- Any read-then-write on a shared counter or claim (stock, queue claims, points) must be race-safe: use a conditional UPDATE or a pessimistic lock.
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
