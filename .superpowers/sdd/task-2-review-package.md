# Task 2 Review Package

Base: 5cf4ceb
Head: b4d05cf

## Commits
```
b4d05cf feat(auth): support guest public browsing state
```

## Stat
```
 .superpowers/sdd/task-2-report.md | 40 +++++++++++++++++++++
 components/ui/UserNav.tsx         | 38 ++++++++++++++++++++
 hooks/useCurrentUser.ts           | 73 ++++++++++++++++++++++-----------------
 middleware.ts                     | 29 ++++++++++++++--
 4 files changed, 147 insertions(+), 33 deletions(-)
```

## Diff
```diff
diff --git a/.superpowers/sdd/task-2-report.md b/.superpowers/sdd/task-2-report.md
new file mode 100644
index 0000000..ac6f7db
--- /dev/null
+++ b/.superpowers/sdd/task-2-report.md
@@ -0,0 +1,40 @@
+## Task 2 Report: Make Auth State and Middleware Guest-Aware
+
+### Status
+
+Completed.
+
+### Changes
+
+1. `middleware.ts`
+   - Replaced the buggy `pathname.startsWith('/')`-style public-route matching with explicit exact routes plus regex-based public detail routes.
+   - Added guarded event and prot detail matching so guest access covers public detail pages but does not open private paths such as `/events/create`, `/events/my-events`, `/events/my-registrations`, `/prot/create`, or `/prot/verifikasi/...`.
+
+2. `hooks/useCurrentUser.ts`
+   - Added Supabase client session lookup before calling `getCurrentUser()`.
+   - Treats missing session as normal guest state by returning `user: null` without setting an error.
+   - Memoized the client and callback so the hook passes focused lint without introducing an effect dependency warning.
+
+3. `components/ui/UserNav.tsx`
+   - Added a compact guest dropdown that renders when `useCurrentUser()` resolves with `user === null`.
+   - Guest menu includes `Masuk` and `Daftar` links and preserves the existing authenticated dropdown behavior.
+
+### Verification
+
+Ran:
+
+```bash
+pnpm exec eslint middleware.ts hooks/useCurrentUser.ts components/ui/UserNav.tsx
+```
+
+Result:
+- Passes with `0` errors.
+- One pre-existing warning remains in `components/ui/UserNav.tsx` for the existing authenticated avatar `<img>` (`@next/next/no-img-element`).
+
+I did not broaden this into unrelated lint cleanup.
+
+### Self-review
+
+- Route matching now follows the task brief exactly and avoids the root-path false positive that made every route public.
+- Guest auth state is handled intentionally rather than by exception flow, which should prevent unnecessary `/users/me` failures for anonymous users.
+- The `UserNav` guest branch is narrowly scoped and does not change authenticated navigation behavior.
diff --git a/components/ui/UserNav.tsx b/components/ui/UserNav.tsx
index df9fba8..ad79919 100644
--- a/components/ui/UserNav.tsx
+++ b/components/ui/UserNav.tsx
@@ -30,20 +30,58 @@ export function UserNav() {
     await signOut();
     router.push('/login');
   };
 
   if (isLoading) {
     return (
       <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
     );
   }
 
+  if (!user) {
+    return (
+      <div className="relative" ref={dropdownRef}>
+        <button
+          onClick={() => setIsOpen(!isOpen)}
+          className="flex items-center gap-2 focus:outline-none group"
+        >
+          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border group-hover:border-primary/50 transition-colors">
+            <User className="w-4 h-4 text-foreground/70" />
+          </div>
+          <span className="hidden sm:inline text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
+            Guest
+          </span>
+          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
+        </button>
+
+        {isOpen && (
+          <div className="absolute right-0 mt-2 w-44 bg-card rounded-md shadow-lg py-1 border border-border z-50 ring-1 ring-black/5">
+            <Link
+              href="/login"
+              className="block px-4 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors"
+              onClick={() => setIsOpen(false)}
+            >
+              Masuk
+            </Link>
+            <Link
+              href="/signup"
+              className="block px-4 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors"
+              onClick={() => setIsOpen(false)}
+            >
+              Daftar
+            </Link>
+          </div>
+        )}
+      </div>
+    );
+  }
+
   const isAdmin = user?.role === 'admin_kpoti';
 
   return (
     <div className="relative" ref={dropdownRef}>
       <button
         onClick={() => setIsOpen(!isOpen)}
         className="flex items-center gap-2 focus:outline-none group"
       >
         <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden border border-border group-hover:border-primary/50 transition-colors">
           {user?.avatar_url ? (
diff --git a/hooks/useCurrentUser.ts b/hooks/useCurrentUser.ts
index 0fc8333..d2b3170 100644
--- a/hooks/useCurrentUser.ts
+++ b/hooks/useCurrentUser.ts
@@ -1,38 +1,49 @@
 'use client';
 
-import { useState, useEffect } from 'react';
+import { useState, useEffect, useMemo, useCallback } from 'react';
+import { createClient } from '@/lib/supabase/client';
 import { getCurrentUser } from '@/lib/api/users';
 import type { UserProfile } from '@/types/user';
 
 export function useCurrentUser() {
-    const [user, setUser] = useState<UserProfile | null>(null);
-    const [isLoading, setIsLoading] = useState(true);
-    const [error, setError] = useState<Error | null>(null);
-
-    const fetchUser = async () => {
-        setIsLoading(true);
-        setError(null);
-
-        try {
-            const userData = await getCurrentUser();
-            setUser(userData);
-        } catch (err) {
-            setError(err instanceof Error ? err : new Error('Failed to fetch user'));
-            setUser(null);
-        } finally {
-            setIsLoading(false);
-        }
-    };
-
-    useEffect(() => {
-        fetchUser();
-    }, []);
-
-    return {
-        user,
-        isLoading,
-        error,
-        refresh: fetchUser,
-        setUser, // For updating after edit
-    };
+  const [user, setUser] = useState<UserProfile | null>(null);
+  const [isLoading, setIsLoading] = useState(true);
+  const [error, setError] = useState<Error | null>(null);
+  const supabase = useMemo(() => createClient(), []);
+
+  const fetchUser = useCallback(async () => {
+    setIsLoading(true);
+    setError(null);
+
+    try {
+      const {
+        data: { session },
+      } = await supabase.auth.getSession();
+
+      if (!session?.access_token) {
+        setUser(null);
+        return;
+      }
+
+      const userData = await getCurrentUser();
+      setUser(userData);
+    } catch (err) {
+      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
+      setUser(null);
+    } finally {
+      setIsLoading(false);
+    }
+  }, [supabase]);
+
+  useEffect(() => {
+    fetchUser();
+  }, [fetchUser]);
+
+  return {
+    user,
+    isLoading,
+    error,
+    refresh: fetchUser,
+    setUser,
+  };
 }
diff --git a/middleware.ts b/middleware.ts
index 877743f..2e5ea80 100644
--- a/middleware.ts
+++ b/middleware.ts
@@ -1,20 +1,45 @@
 import { NextResponse, type NextRequest } from 'next/server';
 import { updateSession } from '@/lib/supabase/middleware';
 
-const publicRoutes = ['/', '/login', '/signup', '/auth/callback', '/about', '/unauthorized'];
+const publicExactRoutes = [
+  '/',
+  '/login',
+  '/signup',
+  '/auth/callback',
+  '/about',
+  '/unauthorized',
+  '/menu',
+  '/events',
+  '/calendar',
+  '/nfts',
+];
+
+const publicPrefixes = [
+  /^\/events\/(?!create$|my-events$|my-registrations$)[^/]+$/,
+  /^\/prot$/,
+  /^\/prot\/(?!create$|verifikasi$)[^/]+$/,
+  /^\/nfts\/[^/]+$/,
+];
+
+function isPublicPath(pathname: string) {
+  return (
+    publicExactRoutes.includes(pathname) ||
+    publicPrefixes.some((pattern) => pattern.test(pathname))
+  );
+}
 
 export async function middleware(request: NextRequest) {
   const { supabaseResponse, user } = await updateSession(request);
   const { pathname } = request.nextUrl;
 
-  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route));
+  const isPublicRoute = isPublicPath(pathname);
 
   // Redirect ke login jika belum login dan bukan public route
   if (!user && !isPublicRoute) {
     const url = request.nextUrl.clone();
     url.pathname = '/login';
     url.searchParams.set('redirectTo', pathname);
     return NextResponse.redirect(url);
   }
 
   // Redirect user yang sudah login dari halaman login/signup
```
