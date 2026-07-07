# Guest Public Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow guest users to browse public menu, PROT, events, and calendar pages while preserving login gates for profile and private workflows.

**Architecture:** Public browsing pages live outside the protected route group and consume backend public endpoints without requiring Supabase session state. Private actions remain protected by route placement, middleware matching, role-gated UI, and backend authorization checks.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase auth, NestJS 11, TypeORM, Jest.

## Global Constraints

- Frontend and backend are separate git repositories; run git commands from the correct repo directory.
- Do not expose profile, admin, create/edit, personal calendar, registration management, or verification workflows to guest users.
- Guest users may browse only public data.
- Menu cards remain visible for guests; login-only cards redirect to `/login?redirectTo=<destination>`.
- `GET /prot/:id` must not leak nonpublic PROT data to guests.
- Use existing API modules and hooks; do not introduce a new data-fetching framework.
- Use ASCII for code and documentation changes.

---

## File Structure

Frontend repo: `nusantara-play-frontend/`

- Modify: `middleware.ts`  
  Defines explicit public and protected route matching.
- Modify: `hooks/useCurrentUser.ts`  
  Treats no Supabase session as normal guest state and avoids `/users/me` calls for guests.
- Modify: `components/ui/UserNav.tsx`  
  Renders authenticated dropdown or guest dropdown.
- Modify: `app/(protected)/menu/page.tsx` and create/move to `app/menu/page.tsx`  
  Makes `/menu` public and redirects login-only cards.
- Delete: `app/(protected)/menu/page.tsx` after move.
- Modify: `app/(protected)/events/page.tsx` and create/move to `app/events/page.tsx`  
  Makes `/events` public.
- Modify: `app/(protected)/events/[id]/page.tsx` and create/move to `app/events/[id]/page.tsx`  
  Makes event detail public and adjusts guest registration CTA.
- Delete: `app/(protected)/events/page.tsx` and `app/(protected)/events/[id]/page.tsx` after move.
- Modify: `app/prot/page.tsx`  
  Removes local login redirect and fetches public data for guests.
- Modify: `app/prot/[id]/page.tsx`  
  Hides private workflow actions for guests and public users without permissions.
- Modify: `components/calendar/CalendarItemDetail.tsx`  
  Avoids protected invite calls and invite UI for guests.
- Modify: `components/calendar/CalendarTabBar.tsx`  
  Keeps personal calendar tabs hidden for guests after guest auth state changes.
- Modify: `components/prot/ProtTabBar.tsx`  
  Keeps create and verification tabs hidden for guests after guest auth state changes.

Backend repo: `nusantara-play-backend/`

- Modify: `src/modules/prot/prot.controller.ts`  
  Passes optional current user to public detail read.
- Modify: `src/modules/prot/prot.service.ts`  
  Enforces role-aware detail visibility.
- Modify: `src/modules/prot/prot.service.spec.ts`  
  Adds tests for guest/public detail access.

## Task 1: Harden Backend PROT Detail Access

**Files:**

- Modify: `../nusantara-play-backend/src/modules/prot/prot.controller.ts`
- Modify: `../nusantara-play-backend/src/modules/prot/prot.service.ts`
- Test: `../nusantara-play-backend/src/modules/prot/prot.service.spec.ts`

**Interfaces:**

- Consumes: Existing `PROTService.findAll(query, user?)` role visibility behavior.
- Produces: `PROTService.findOneForRead(id: string, user?: User): Promise<EnrichedPROT>` with read access enforcement while preserving existing internal `findOne(id)` behavior.

- [ ] **Step 1: Add failing service tests for guest/public detail reads**

In `../nusantara-play-backend/src/modules/prot/prot.service.spec.ts`, add tests near existing `findAll` tests:

```ts
it('allows guest users to read ARSIP_NASIONAL PROT detail', async () => {
  const prot = {
    id: 'published-id',
    nama: 'Gasing',
    status: PROTStatus.ARSIP_NASIONAL,
  };
  mockProtRepository.findOne.mockResolvedValue(prot);

  const result = await service.findOneForRead('published-id');

  expect(result.id).toBe('published-id');
});

it('hides draft PROT detail from guest users', async () => {
  const prot = {
    id: 'draft-id',
    nama: 'Gasing',
    status: PROTStatus.DRAFT,
  };
  mockProtRepository.findOne.mockResolvedValue(prot);

  await expect(service.findOneForRead('draft-id')).rejects.toThrow(NotFoundException);
});

it('allows kurator to read own draft PROT detail', async () => {
  const user = {
    id: 'user-1',
    role: UserRole.KURATOR_DAERAH,
  } as any;
  const prot = {
    id: 'own-draft-id',
    nama: 'Gasing',
    status: PROTStatus.DRAFT,
    created_by: user.id,
  };
  mockProtRepository.findOne.mockResolvedValue(prot);

  const result = await service.findOneForRead('own-draft-id', user);

  expect(result.id).toBe('own-draft-id');
});

it('forbids kurator from reading another user draft PROT detail', async () => {
  const user = {
    id: 'user-1',
    role: UserRole.KURATOR_DAERAH,
  } as any;
  const prot = {
    id: 'other-draft-id',
    nama: 'Gasing',
    status: PROTStatus.DRAFT,
    created_by: 'other-user-id',
  };
  mockProtRepository.findOne.mockResolvedValue(prot);

  await expect(service.findOneForRead('other-draft-id', user)).rejects.toThrow(ForbiddenException);
});
```

- [ ] **Step 2: Run test and confirm failure**

Run from `nusantara-play-backend/`:

```bash
npm test -- --testPathPattern=prot.service
```

Expected: FAIL because `findOneForRead` does not exist yet.

- [ ] **Step 3: Update controller to pass optional current user**

Change `findOne` in `../nusantara-play-backend/src/modules/prot/prot.controller.ts`:

```ts
  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string, @CurrentUser() user?: User) {
    return this.protService.findOneForRead(id, user);
  }
```

- [ ] **Step 4: Implement role-aware detail visibility**

In `../nusantara-play-backend/src/modules/prot/prot.service.ts`, keep existing `findOne(id)` unchanged and add a private helper plus a new public read method:

```ts
  private canReadProtDetail(prot: PROT, user?: User): boolean {
    if (!user || user.role === UserRole.PUBLIK) {
      return prot.status === PROTStatus.ARSIP_NASIONAL;
    }

    if (user.role === UserRole.KURATOR_DAERAH) {
      return prot.created_by === user.id || prot.status === PROTStatus.ARSIP_NASIONAL;
    }

    if (user.role === UserRole.PAKAR) {
      return [
        PROTStatus.DIKURASI,
        PROTStatus.DIVERIFIKASI,
        PROTStatus.ARSIP_NASIONAL,
      ].includes(prot.status);
    }

    return user.role === UserRole.ADMIN_KPOTI;
  }

  async findOneForRead(id: string, user?: User): Promise<PROT & {
    provinsiName: string | null;
    kabkotaName: string | null;
    kecamatanName: string | null;
    desaName: string | null;
  }> {
    const prot = await this.protRepository.findOne({ where: { id } });
    if (!prot) {
      throw new NotFoundException(`PROT with ID ${id} not found`);
    }

    if (!this.canReadProtDetail(prot, user)) {
      if (!user || user.role === UserRole.PUBLIK) {
        throw new NotFoundException(`PROT with ID ${id} not found`);
      }
      throw new ForbiddenException('Anda tidak memiliki akses untuk melihat PROT ini');
    }

    return this.enrichWithDaerahNames(prot);
  }
```

- [ ] **Step 5: Run backend tests**

Run from `nusantara-play-backend/`:

```bash
npm test -- --testPathPattern=prot.service
```

Expected: PASS.

- [ ] **Step 6: Commit backend hardening**

Run from `nusantara-play-backend/`:

```bash
git add src/modules/prot/prot.controller.ts src/modules/prot/prot.service.ts src/modules/prot/prot.service.spec.ts
git commit -m "fix(prot): enforce public detail visibility"
```

## Task 2: Make Auth State and Middleware Guest-Aware

**Files:**

- Modify: `middleware.ts`
- Modify: `hooks/useCurrentUser.ts`
- Modify: `components/ui/UserNav.tsx`

**Interfaces:**

- Consumes: Existing Supabase client and `getCurrentUser()`.
- Produces: Guest-safe user state where `user: null` is not an error and guest routes are matched explicitly.

- [ ] **Step 1: Update middleware route matching**

Replace the current `publicRoutes` logic in `middleware.ts` with exact public and blocked private prefixes:

```ts
const publicExactRoutes = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/about',
  '/unauthorized',
  '/menu',
  '/events',
  '/calendar',
  '/nfts',
];

const publicPrefixes = [
  /^\/events\/(?!create$|my-events$|my-registrations$)[^/]+$/,
  /^\/prot$/,
  /^\/prot\/(?!create$|verifikasi$)[^/]+$/,
  /^\/nfts\/[^/]+$/,
];

function isPublicPath(pathname: string) {
  return (
    publicExactRoutes.includes(pathname) ||
    publicPrefixes.some((pattern) => pattern.test(pathname))
  );
}
```

Then replace:

```ts
const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route));
```

with:

```ts
const isPublicRoute = isPublicPath(pathname);
```

- [ ] **Step 2: Make `useCurrentUser()` skip `/users/me` for guests**

Update `hooks/useCurrentUser.ts`:

```ts
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/api/users';
import type { UserProfile } from '@/types/user';

export function useCurrentUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchUser = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setUser(null);
        return;
      }

      const userData = await getCurrentUser();
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return {
    user,
    isLoading,
    error,
    refresh: fetchUser,
    setUser,
  };
}
```

- [ ] **Step 3: Add guest dropdown to `UserNav`**

In `components/ui/UserNav.tsx`, after loading state and before authenticated dropdown rendering, add:

```tsx
  if (!user) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 focus:outline-none group"
        >
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border group-hover:border-primary/50 transition-colors">
            <User className="w-4 h-4 text-foreground/70" />
          </div>
          <span className="hidden sm:inline text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
            Guest
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-44 bg-card rounded-md shadow-lg py-1 border border-border z-50 ring-1 ring-black/5">
            <Link
              href="/login"
              className="block px-4 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Masuk
            </Link>
            <Link
              href="/signup"
              className="block px-4 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Daftar
            </Link>
          </div>
        )}
      </div>
    );
  }
```

- [ ] **Step 4: Run frontend lint**

Run from `nusantara-play-frontend/`:

```bash
pnpm lint
```

Expected: PASS or only pre-existing warnings unrelated to these files.

- [ ] **Step 5: Commit frontend auth shell changes**

Run from `nusantara-play-frontend/`:

```bash
git add middleware.ts hooks/useCurrentUser.ts components/ui/UserNav.tsx
git commit -m "feat(auth): support guest public browsing state"
```

## Task 3: Move Menu and Event Browsing Routes Out of Protected Group

**Files:**

- Create: `app/menu/page.tsx`
- Delete: `app/(protected)/menu/page.tsx`
- Create: `app/events/page.tsx`
- Delete: `app/(protected)/events/page.tsx`
- Create: `app/events/[id]/page.tsx`
- Delete: `app/(protected)/events/[id]/page.tsx`

**Interfaces:**

- Consumes: Existing page implementations.
- Produces: Public browse pages that are no longer wrapped by `app/(protected)/layout.tsx`.

- [ ] **Step 1: Move menu page**

Run from `nusantara-play-frontend/`:

```powershell
New-Item -ItemType Directory -Force -Path 'app/menu' | Out-Null
Move-Item -LiteralPath 'app/(protected)/menu/page.tsx' -Destination 'app/menu/page.tsx'
```

- [ ] **Step 2: Update menu private card redirects**

In `app/menu/page.tsx`, change the Marketplace and Sertifikat links because both destinations are still inside protected route groups:

```tsx
<Link
  href="/login?redirectTo=/marketplace"
  className="md:col-span-4 group relative overflow-hidden rounded-xl bg-muted min-h-[320px] flex flex-col justify-end p-8 hover:shadow-lg transition-all"
>
```

```tsx
<Link
  href="/login?redirectTo=/sertifikat"
  className="md:col-span-4 group bg-muted/50 border-b-4 border-primary rounded-xl p-8 flex flex-col justify-between hover:bg-muted transition-all duration-300"
>
```

Leave public cards pointing directly to `/prot`, `/events`, `/calendar`, and `/nfts`.

- [ ] **Step 3: Move public events list page**

Run from `nusantara-play-frontend/`:

```powershell
New-Item -ItemType Directory -Force -Path 'app/events' | Out-Null
Move-Item -LiteralPath 'app/(protected)/events/page.tsx' -Destination 'app/events/page.tsx'
```

- [ ] **Step 4: Move public event detail page**

Run from `nusantara-play-frontend/`:

```powershell
New-Item -ItemType Directory -Force -LiteralPath 'app/events/[id]' | Out-Null
Move-Item -LiteralPath 'app/(protected)/events/[id]/page.tsx' -Destination 'app/events/[id]/page.tsx'
```

- [ ] **Step 5: Adjust guest registration CTA**

In `app/events/[id]/page.tsx`, replace the registration CTA conditional with:

```tsx
                {!isOwner && event.status === EventStatus.PUBLISHED && (
                  !user ? (
                    <Link
                      href={`/login?redirectTo=/events/${eventId}`}
                      className="block w-full py-4 bg-[#9e3c24] dark:bg-[#D65C2E] text-white rounded-xl font-black text-lg text-center shadow-lg shadow-[#9e3c24]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      MASUK UNTUK DAFTAR
                    </Link>
                  ) : event.is_registered || userRegistration ? (
                    <button
                      disabled
                      className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg shadow-lg opacity-80 cursor-not-allowed flex items-center justify-center gap-2 disabled:opacity-80 transition-all"
                    >
                      <CheckCircleIcon className="h-6 w-6" />
                      TERDAFTAR
                    </button>
                  ) : (
                    !isFullyBooked && (
                      <button
                        onClick={handleRegister}
                        disabled={actionLoading}
                        className="w-full py-4 bg-[#9e3c24] dark:bg-[#D65C2E] text-white rounded-xl font-black text-lg shadow-lg shadow-[#9e3c24]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {actionLoading ? 'MENDAFTAR...' : 'DAFTAR SEKARANG'}
                      </button>
                    )
                  )
                )}
```

- [ ] **Step 6: Verify no duplicate public route files remain**

Run from `nusantara-play-frontend/`:

```powershell
Test-Path -LiteralPath 'app/(protected)/menu/page.tsx'
Test-Path -LiteralPath 'app/(protected)/events/page.tsx'
Test-Path -LiteralPath 'app/(protected)/events/[id]/page.tsx'
```

Expected:

```text
False
False
False
```

- [ ] **Step 7: Run frontend lint**

Run from `nusantara-play-frontend/`:

```bash
pnpm lint
```

Expected: PASS or only unrelated pre-existing warnings.

- [ ] **Step 8: Commit route moves**

Run from `nusantara-play-frontend/`:

```bash
git add app/menu/page.tsx app/events/page.tsx app/events/[id]/page.tsx app/(protected)/menu/page.tsx app/(protected)/events/page.tsx app/(protected)/events/[id]/page.tsx
git commit -m "feat(routes): expose menu and event browsing to guests"
```

If PowerShell treats parentheses or brackets specially during `git add`, use quoted paths:

```powershell
git add 'app/menu/page.tsx' 'app/events/page.tsx' 'app/events/[id]/page.tsx' 'app/(protected)/menu/page.tsx' 'app/(protected)/events/page.tsx' 'app/(protected)/events/[id]/page.tsx'
```

## Task 4: Make PROT Public Browse UI Guest-Safe

**Files:**

- Modify: `app/prot/page.tsx`
- Modify: `app/prot/[id]/page.tsx`
- Modify: `components/prot/ProtTabBar.tsx`

**Interfaces:**

- Consumes: Backend public `GET /prot` and hardened `GET /prot/:id`.
- Produces: Guest-readable PROT list/detail with private actions hidden.

- [ ] **Step 1: Remove local auth redirect from PROT list**

In `app/prot/page.tsx`, remove these imports:

```ts
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
```

Remove these variables:

```ts
const router = useRouter();
const { user, isLoading: authLoading } = useAuth();
```

Replace them with:

```ts
import { useCurrentUser } from '@/hooks/useCurrentUser';
```

and inside the component:

```ts
const { user } = useCurrentUser();
```

- [ ] **Step 2: Remove guest redirect and auth-loading UI**

Delete the `useEffect` block that redirects to `/login?redirectTo=/prot`.

Delete the auth-loading and unauthenticated redirect render branches.

- [ ] **Step 3: Fetch data regardless of auth**

Replace:

```ts
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [filters, user]);
```

with:

```ts
  useEffect(() => {
    fetchData();
  }, [filters]);
```

- [ ] **Step 4: Gate create button by role**

Add:

```ts
  const canCreateProt =
    user && ['kurator_daerah', 'admin_kpoti'].includes(user.role);
```

Wrap the `Tambah Data Baru` link:

```tsx
            {canCreateProt && (
              <Link href="/prot/create" className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md font-medium shadow hover:bg-primary/90 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Data Baru
              </Link>
            )}
```

- [ ] **Step 5: Gate PROT detail actions**

In `app/prot/[id]/page.tsx`, replace the action booleans with:

```ts
  const canManageProt =
    user && ['kurator_daerah', 'admin_kpoti'].includes(user.role);
  const ownsProt = user && item.created_by === user.id;
  const canEditProt = Boolean(
    canManageProt &&
      isEditable &&
      (user?.role === 'admin_kpoti' || ownsProt)
  );
  const canSubmitProt = Boolean(
    canManageProt &&
      isSubmittable &&
      (user?.role === 'admin_kpoti' || ownsProt)
  );
  const isPublishable = item.status === PROTStatus.DIVERIFIKASI && user?.role === 'admin_kpoti';
  const isDeletable = user?.role === 'admin_kpoti';
```

Then replace usages:

```tsx
{isEditable && ( ... )}
{isSubmittable && ( ... )}
```

with:

```tsx
{canEditProt && ( ... )}
{canSubmitProt && ( ... )}
```

- [ ] **Step 6: Hide protected PROT history link from guests**

Wrap the history link with:

```tsx
              {user && (
                <Link
                  href={`/prot/${item.id}/history`}
                  className="px-3 py-2 bg-background border border-border text-foreground rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
                >
                  ...
                  History
                </Link>
              )}
```

- [ ] **Step 7: Run frontend lint**

Run from `nusantara-play-frontend/`:

```bash
pnpm lint
```

Expected: PASS or only unrelated pre-existing warnings.

- [ ] **Step 8: Commit PROT guest browsing changes**

Run from `nusantara-play-frontend/`:

```bash
git add app/prot/page.tsx app/prot/[id]/page.tsx components/prot/ProtTabBar.tsx
git commit -m "feat(prot): allow guest public browsing"
```

Use quoted paths in PowerShell for paths that contain parentheses or brackets.

## Task 5: Make Calendar Public Detail Guest-Safe

**Files:**

- Modify: `components/calendar/CalendarItemDetail.tsx`
- Modify: `components/calendar/CalendarTabBar.tsx`

**Interfaces:**

- Consumes: Public calendar item detail endpoint.
- Produces: Guest calendar detail modal without invite API calls or invite UI.

- [ ] **Step 1: Import current user hook**

In `components/calendar/CalendarItemDetail.tsx`, add:

```ts
import { useCurrentUser } from '@/hooks/useCurrentUser';
```

Inside the component, add:

```ts
  const { user } = useCurrentUser();
```

- [ ] **Step 2: Avoid invite refetch for guests**

Replace:

```ts
  useEffect(() => {
    refetch();
    refetchInvites();
  }, [itemId]);
```

with:

```ts
  useEffect(() => {
    refetch();
    if (user) {
      refetchInvites();
    }
  }, [itemId, user]);
```

- [ ] **Step 3: Hide invite list and invite form from guests**

Replace invite list condition:

```tsx
          {item.invites && item.invites.length > 0 && (
```

with:

```tsx
          {user && item.invites && item.invites.length > 0 && (
```

Replace invite form condition:

```tsx
        {item.visibility !== 'public' && (
```

with:

```tsx
        {user && item.visibility !== 'public' && (
```

- [ ] **Step 4: Run frontend lint**

Run from `nusantara-play-frontend/`:

```bash
pnpm lint
```

Expected: PASS or only unrelated pre-existing warnings.

- [ ] **Step 5: Commit calendar guest changes**

Run from `nusantara-play-frontend/`:

```bash
git add components/calendar/CalendarItemDetail.tsx components/calendar/CalendarTabBar.tsx
git commit -m "feat(calendar): support guest public details"
```

## Task 6: Full Verification

**Files:**

- No code files required unless verification exposes defects.

**Interfaces:**

- Consumes: All previous tasks.
- Produces: Verified frontend/backend builds and route behavior.

- [ ] **Step 1: Run backend targeted tests**

Run from `nusantara-play-backend/`:

```bash
npm test -- --testPathPattern=prot.service
```

Expected: PASS.

- [ ] **Step 2: Run backend build**

Run from `nusantara-play-backend/`:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run frontend lint**

Run from `nusantara-play-frontend/`:

```bash
pnpm lint
```

Expected: PASS or only unrelated pre-existing warnings that are documented in the final response.

- [ ] **Step 4: Run frontend build**

Run from `nusantara-play-frontend/`:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Manual guest route smoke test**

Start local services if not already running:

```bash
npm run start:dev
```

from `nusantara-play-backend/`, and:

```bash
pnpm dev
```

from `nusantara-play-frontend/`.

In a logged-out browser session, verify:

- `/menu` opens.
- `/prot` opens.
- `/events` opens.
- `/calendar` opens.
- `/profile` redirects to `/login?redirectTo=/profile`.
- `/login?redirectTo=/sertifikat` appears when opening the Sertifikat menu card as guest.
- Navbar shows guest UI and no logout/profile link.

- [ ] **Step 6: Final git status check**

Run from both repos:

```bash
git status --short
```

Expected: no unintended untracked or unstaged files. Any remaining changes should be intentional and reported.
