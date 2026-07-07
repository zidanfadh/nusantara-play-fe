# Task 4 Report: Make PROT Public Browse UI Guest-Safe

## Status

Completed in the `guest-public-access` worktree.

## Changes

### 1. PROT list is guest-readable again

- Removed the local auth redirect and auth-loading/redirect placeholder branches from [app/prot/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/page.tsx:3).
- Switched the page to `useCurrentUser()` and fetches list data regardless of auth state via `fetchData()` in a `useCallback` + `useEffect` flow at [app/prot/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/page.tsx:34).
- Added role gating for the create CTA so only `kurator_daerah` and `admin_kpoti` see `Tambah Data Baru` at [app/prot/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/page.tsx:31) and [app/prot/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/page.tsx:122).

### 2. PROT detail actions are guest-safe

- Added explicit management booleans in [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:128):
  - `canManageProt`
  - `ownsProt`
  - `canEditProt`
  - `canSubmitProt`
- Restricted the History link to authenticated users only at [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:189).
- Restricted Edit and Ajukan Verifikasi to eligible managers/owners at [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:202) and [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:215).
- Existing `isPublishable` and `isDeletable` admin-only guards remained in place, which keeps Publish/Delete hidden from guests.

### 3. PROT tab bar matches role gating

- Added a dedicated `canCreateProt` check in [components/prot/ProtTabBar.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/components/prot/ProtTabBar.tsx:28).
- `Tambah PROT` now only appears for `kurator_daerah` and `admin_kpoti` at [components/prot/ProtTabBar.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/components/prot/ProtTabBar.tsx:42).

### 4. Middleware re-opens public `/prot/:id` safely

- Added a public matcher for single-segment PROT detail routes in [middleware.ts](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/middleware.ts:17).
- The regex keeps `/prot` and `/prot/:id` public while still excluding:
  - `/prot/create`
  - `/prot/verifikasi/...`
  - any multi-segment path like `/prot/:id/edit` or `/prot/:id/history`

## Verification

Ran:

```bash
pnpm exec eslint app/prot/page.tsx "app/prot/[id]/page.tsx" components/prot/ProtTabBar.tsx middleware.ts
```

Result:

- 0 errors
- 4 warnings
- Remaining warnings are pre-existing `@next/next/no-img-element` warnings in [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:271), [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:290), [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:374), and [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:415).

## Self-review

- The list page now relies on backend visibility and no longer blocks guest reads in the client.
- The detail page still renders public content, but guest users do not get navigational exposure to protected workflow routes or protected mutation actions.
- The middleware regex is intentionally narrow: it only matches `/prot/<single-segment>` and does not create openings for create, verification, edit, or history routes.
- I did not modify unrelated files or revert existing worktree changes outside the owned file set.

## Commit

Planned commit message:

`feat(prot): allow guest public browsing`
