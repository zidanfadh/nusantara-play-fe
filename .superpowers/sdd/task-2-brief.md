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

