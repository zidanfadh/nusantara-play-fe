## Task 2 Report: Make Auth State and Middleware Guest-Aware

### Status

Completed.

### Changes

1. `middleware.ts`
   - Replaced the buggy `pathname.startsWith('/')`-style public-route matching with explicit exact routes plus regex-based public detail routes.
   - Added guarded event and prot detail matching so guest access covers public detail pages but does not open private paths such as `/events/create`, `/events/my-events`, `/events/my-registrations`, `/prot/create`, or `/prot/verifikasi/...`.

2. `hooks/useCurrentUser.ts`
   - Added Supabase client session lookup before calling `getCurrentUser()`.
   - Treats missing session as normal guest state by returning `user: null` without setting an error.
   - Memoized the client and callback so the hook passes focused lint without introducing an effect dependency warning.

3. `components/ui/UserNav.tsx`
   - Added a compact guest dropdown that renders when `useCurrentUser()` resolves with `user === null`.
   - Guest menu includes `Masuk` and `Daftar` links and preserves the existing authenticated dropdown behavior.

### Verification

Ran:

```bash
pnpm exec eslint middleware.ts hooks/useCurrentUser.ts components/ui/UserNav.tsx
```

Result:
- Passes with `0` errors.
- One pre-existing warning remains in `components/ui/UserNav.tsx` for the existing authenticated avatar `<img>` (`@next/next/no-img-element`).

I did not broaden this into unrelated lint cleanup.

### Self-review

- Route matching now follows the task brief exactly and avoids the root-path false positive that made every route public.
- Guest auth state is handled intentionally rather than by exception flow, which should prevent unnecessary `/users/me` failures for anonymous users.
- The `UserNav` guest branch is narrowly scoped and does not change authenticated navigation behavior.
