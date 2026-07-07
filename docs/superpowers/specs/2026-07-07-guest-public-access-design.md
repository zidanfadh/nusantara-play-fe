# Guest Public Access Design

## Goal

Allow unauthenticated visitors to open public browsing pages for menu, PROT, events, and calendar while keeping private profile and write-oriented workflows behind login.

## Scope

This design covers:

- Frontend route access for `/menu`, `/prot`, `/events`, and `/calendar`.
- Guest-aware navbar behavior.
- Public-only data behavior for guest users.
- Login redirects for menu cards and actions that require authentication.
- Backend access hardening for public PROT detail reads.

This design does not change role permissions for creating, editing, verifying, publishing, registering, or managing private calendar data.

## Current Findings

Frontend currently blocks guest users in two layers:

- `middleware.ts` only allows `/`, `/login`, `/signup`, `/auth/callback`, `/about`, and `/unauthorized`.
- `app/(protected)/layout.tsx` redirects any unauthenticated user in the protected route group to `/login`.

Some pages also have local auth assumptions:

- `app/prot/page.tsx` redirects unauthenticated users to login and fetches data only when `user` exists.
- `components/ui/UserNav.tsx` renders profile/logout UI even when `/users/me` fails and `user` is null.
- Calendar item detail calls protected invite endpoints even when opened from the public calendar.

Backend public-read support already exists for several list/detail routes:

- `GET /prot` is public and limits guest/public users to `ARSIP_NASIONAL`.
- `GET /events` and `GET /events/:id` are public and hide draft events from guests.
- `GET /calendar`, `GET /calendar/agenda`, and `GET /calendar/:id` are public and apply visibility rules.

Backend gap:

- `GET /prot/:id` is public but does not currently apply the same role-aware visibility check as `GET /prot`, so a guest who knows a draft ID may be able to read nonpublic PROT data.

## Recommended Approach

Use clean public route boundaries rather than treating protected route exceptions as public pages.

Public browsing routes:

- `/menu`
- `/prot`
- `/prot/:id`, with backend visibility protection
- `/events`
- `/events/:id`
- `/calendar`
- `/nfts`

Protected routes remain protected:

- `/profile`
- `/change-password`
- `/sertifikat`
- `/events/create`
- `/events/my-events`
- `/events/my-registrations`
- `/events/:id/edit`
- `/events/:id/registrations`
- `/calendar/my`
- `/calendar/invites`
- Admin routes
- PROT create/edit/verification/history routes that expose workflow-private data

## Frontend Design

### Middleware

Update `middleware.ts` public routes to include browsing routes:

- `/menu`
- `/prot`
- `/events`
- `/calendar`
- `/nfts`

The middleware must still redirect guest users to login for profile, admin, create/edit, personal calendar, private event management, and certification routes. Redirects should preserve `redirectTo`.

### Route Organization

Move public event browsing and menu pages out of `app/(protected)` where needed:

- `app/(protected)/menu/page.tsx` becomes public `/menu`.
- `app/(protected)/events/page.tsx` becomes public `/events`.
- `app/(protected)/events/[id]/page.tsx` becomes public `/events/[id]`.

Private event pages remain login-only:

- `/events/create`
- `/events/my-events`
- `/events/my-registrations`
- `/events/[id]/edit`
- `/events/[id]/registrations`

Calendar already has a public `/calendar` page. `/calendar/my` and `/calendar/invites` remain protected.

### Navbar

`UserNav` must support a guest state.

For authenticated users:

- Show avatar/name.
- Show profile, personal calendar, calendar invites, admin panel if admin, and logout.

For guests:

- Do not show profile, personal calendar, calendar invites, admin panel, or logout.
- Show a compact `Guest` dropdown with `Masuk` and `Daftar` links.

`useCurrentUser()` should avoid calling `/users/me` when there is no Supabase session. Guest state should be treated as normal, not as an error state.

### Menu

All cards remain visible for guests.

Cards for public browsing routes open directly:

- PROT -> `/prot`
- Events -> `/events`
- Calendar -> `/calendar`
- NFT catalog -> `/nfts`

Cards that require login redirect to login with the intended destination preserved:

- Sertifikat -> `/login?redirectTo=/sertifikat`
- Any future private destination should follow the same pattern.

### PROT

`app/prot/page.tsx` must become public-readable:

- Remove the unauthenticated redirect.
- Fetch `protApi.getAll(filters)` even when user is null.
- Keep the guest result public-only by relying on backend filtering.
- Hide create/edit/submit/publish/delete actions unless the user and role allow them.

`app/prot/[id]/page.tsx` can stay public, but UI actions must be role-gated:

- Guest can read public archive data only.
- Guest must not see edit, submit verification, publish, or delete actions.
- Workflow history should remain protected unless it is explicitly designed as public later.

### Events

`/events` and `/events/:id` become public-readable.

Guest behavior:

- Event list and public event details render normally.
- Private action links are hidden or redirect to login.
- Registration CTA for guest should say `Masuk untuk Daftar` and link to `/login?redirectTo=/events/:id`.

Authenticated behavior:

- Public users can register for events as before.
- Kurator/admin can see create and management actions according to existing role checks.

### Calendar

Public `/calendar` behavior:

- Guest can view public calendar items and public events.
- Guest sees only `Kalender Publik` tab.
- Guest can open public item details.
- Guest must not fetch invites, render invite lists, or show invite forms.

Authenticated behavior:

- Existing personal calendar and invite tabs remain available.
- Existing private invite/detail behavior remains unchanged.

## Backend Design

### PROT Detail Access

Change `PROTController.findOne` to accept optional current user:

- `findOne(@Param('id') id: string, @CurrentUser() user?: User)`
- Call `protService.findOne(id, user)`.

Update `PROTService.findOne` to enforce read visibility:

- Guest or `publik`: only `ARSIP_NASIONAL`.
- `kurator_daerah`: own PROT or `ARSIP_NASIONAL`.
- `pakar`: `DIKURASI`, `DIVERIFIKASI`, or `ARSIP_NASIONAL`.
- `admin_kpoti`: all statuses.

If a PROT exists but is not readable by a guest or `publik` user, return `NotFoundException` to avoid exposing draft IDs. If an authenticated nonpublic role cannot read the PROT, return `ForbiddenException`.

### Existing Public Endpoints

No backend changes are required for Events or Calendar public browsing unless implementation reveals a mismatch.

Events already hide draft events from guests.

Calendar already limits guest reads to public visibility and public event entries.

## Error Handling

Guest access should not show authentication error states for public pages.

Expected guest outcomes:

- Public list loads successfully.
- Empty public data shows normal empty state.
- Private detail or action link redirects to login or returns a clear access message.
- Protected pages redirect to `/login?redirectTo=<original-path>`.

API failures should continue to use existing page-level error UI.

## Testing Plan

Frontend verification:

- Guest can open `/menu`.
- Guest can open `/prot` and sees only backend-public PROT results.
- Guest can open `/events` and `/events/:id` for published events.
- Guest can open `/calendar` and sees only public calendar data.
- Guest cannot open `/profile`; they are redirected to login.
- Guest navbar does not show profile/logout/private calendar links.
- Menu login-only card redirects to `/login?redirectTo=/sertifikat`.

Backend verification:

- `GET /prot` without auth returns only `ARSIP_NASIONAL`.
- `GET /prot/:id` without auth returns data only for `ARSIP_NASIONAL`.
- `GET /prot/:id` without auth rejects draft/nonpublic statuses.
- Role-specific PROT detail reads match `findAll` visibility rules.

Commands:

- Frontend: `pnpm lint`
- Frontend: `pnpm build`
- Backend: `npm test -- --testPathPattern=prot.service`
- Backend: `npm run build`

## Open Decisions

Resolved:

- Menu cards remain visible for guests.
- Login-only menu destinations redirect to login with `redirectTo`.

No unresolved product decisions remain for this implementation scope.
