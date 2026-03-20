# CLAUDE.md — Nusantara Play Frontend

> **Full project context:** see `../CLAUDE.md` in the root repo.

## Project Overview

Next.js 16 + React 19 + TypeScript + Tailwind v4 frontend for Nusantara Play — a digital
archive platform for Indonesian traditional games and sports (PROT). Uses Supabase for auth
and a NestJS backend (http://localhost:3000) for all data.

## Commands

```bash
pnpm dev          # Start dev server (http://localhost:3001)
pnpm build        # Production build
pnpm lint         # ESLint
```

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
- `app/api/` — Next.js API routes

**Data flow**: Page/component → domain hook (`hooks/use*.ts`) → API module (`lib/api/*.ts`) →
`apiClient` (`lib/api/client.ts`) → NestJS backend. `apiClient` auto-attaches the Supabase
JWT as `Authorization: Bearer <token>`.

**Auth**: `contexts/AuthContext.tsx` exposes `user`, `session`, `signIn`, `signOut`,
`getAccessToken`. `middleware.ts` handles session refresh and redirects unauthenticated users
to `/login`.

## Key Conventions

- All backend calls go through `apiClient` — never use raw `fetch` directly (except multipart file uploads where the browser must set the `Content-Type` boundary automatically).
- API modules live in `lib/api/` and return typed responses matching `types/*.ts`.
- Hooks follow the pattern: `useState` + `useEffect` with `isMounted` guard + optional `refetch` via a `refresh` counter. See `hooks/useEvents.ts` as the canonical example.
- Pages are `'use client'` components that compose hooks + components. Keep pages thin.
- Use `useCurrentUser()` to get the authenticated user and check roles (`user.role`).
- Admin role is `'admin_kpoti'`. Check via `user.role === 'admin_kpoti'` or `['kurator_daerah', 'admin_kpoti'].includes(user.role)`.
- Components are grouped by domain: `components/events/`, `components/prot/`, `components/marketplace/`, etc.

## Feature Modules

| Domain | Types | API | Hooks | Components | Pages |
|--------|-------|-----|-------|------------|-------|
| PROT | `types/prot.ts` | `lib/api/prot.ts` | `hooks/useBlockchainProof.ts` | `components/prot/` | `app/prot/` |
| Events | `types/events.ts` | `lib/api/events.ts` | `hooks/useEvents.ts` | `components/events/` | `app/(protected)/events/` |
| Calendar | `types/calendar.ts` | `lib/api/calendar.ts` | `hooks/useCalendar.ts` | `components/calendar/` | `app/(protected)/calendar/` |
| Marketplace | `types/marketplace.ts` | `lib/api/marketplace.ts` | `hooks/useMarketplace.ts` | `components/marketplace/` | `app/(protected)/marketplace/` |

## Env Vars

```
NEXT_PUBLIC_BACKEND_API_URL    # NestJS backend base URL (http://localhost:3000/api)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
