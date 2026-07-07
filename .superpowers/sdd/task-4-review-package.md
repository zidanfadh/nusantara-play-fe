# Task 4 Review Package

Base: b3ff927
Head: f333492

## Commits
```
f333492 feat(prot): allow guest public browsing
```

## Stat
```
 .superpowers/sdd/task-4-report.md | 64 +++++++++++++++++++++++++++++++++++++++
 app/prot/[id]/page.tsx            | 37 +++++++++++++++-------
 app/prot/page.tsx                 | 64 +++++++++++----------------------------
 components/prot/ProtTabBar.tsx    |  4 ++-
 middleware.ts                     |  1 +
 5 files changed, 111 insertions(+), 59 deletions(-)
```

## Diff
```diff
diff --git a/.superpowers/sdd/task-4-report.md b/.superpowers/sdd/task-4-report.md
new file mode 100644
index 0000000..2c43ed1
--- /dev/null
+++ b/.superpowers/sdd/task-4-report.md
@@ -0,0 +1,64 @@
+# Task 4 Report: Make PROT Public Browse UI Guest-Safe
+
+## Status
+
+Completed in the `guest-public-access` worktree.
+
+## Changes
+
+### 1. PROT list is guest-readable again
+
+- Removed the local auth redirect and auth-loading/redirect placeholder branches from [app/prot/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/page.tsx:3).
+- Switched the page to `useCurrentUser()` and fetches list data regardless of auth state via `fetchData()` in a `useCallback` + `useEffect` flow at [app/prot/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/page.tsx:34).
+- Added role gating for the create CTA so only `kurator_daerah` and `admin_kpoti` see `Tambah Data Baru` at [app/prot/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/page.tsx:31) and [app/prot/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/page.tsx:122).
+
+### 2. PROT detail actions are guest-safe
+
+- Added explicit management booleans in [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:128):
+  - `canManageProt`
+  - `ownsProt`
+  - `canEditProt`
+  - `canSubmitProt`
+- Restricted the History link to authenticated users only at [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:189).
+- Restricted Edit and Ajukan Verifikasi to eligible managers/owners at [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:202) and [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:215).
+- Existing `isPublishable` and `isDeletable` admin-only guards remained in place, which keeps Publish/Delete hidden from guests.
+
+### 3. PROT tab bar matches role gating
+
+- Added a dedicated `canCreateProt` check in [components/prot/ProtTabBar.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/components/prot/ProtTabBar.tsx:28).
+- `Tambah PROT` now only appears for `kurator_daerah` and `admin_kpoti` at [components/prot/ProtTabBar.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/components/prot/ProtTabBar.tsx:42).
+
+### 4. Middleware re-opens public `/prot/:id` safely
+
+- Added a public matcher for single-segment PROT detail routes in [middleware.ts](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/middleware.ts:17).
+- The regex keeps `/prot` and `/prot/:id` public while still excluding:
+  - `/prot/create`
+  - `/prot/verifikasi/...`
+  - any multi-segment path like `/prot/:id/edit` or `/prot/:id/history`
+
+## Verification
+
+Ran:
+
+```bash
+pnpm exec eslint app/prot/page.tsx "app/prot/[id]/page.tsx" components/prot/ProtTabBar.tsx middleware.ts
+```
+
+Result:
+
+- 0 errors
+- 4 warnings
+- Remaining warnings are pre-existing `@next/next/no-img-element` warnings in [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:271), [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:290), [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:374), and [app/prot/[id]/page.tsx](C:/Users/muhfa/Documents/Work/Freelance/Sainstext/nusantara-play/Nusantara%20Play/nusantara-play-frontend/.worktrees/guest-public-access/app/prot/[id]/page.tsx:415).
+
+## Self-review
+
+- The list page now relies on backend visibility and no longer blocks guest reads in the client.
+- The detail page still renders public content, but guest users do not get navigational exposure to protected workflow routes or protected mutation actions.
+- The middleware regex is intentionally narrow: it only matches `/prot/<single-segment>` and does not create openings for create, verification, edit, or history routes.
+- I did not modify unrelated files or revert existing worktree changes outside the owned file set.
+
+## Commit
+
+Planned commit message:
+
+`feat(prot): allow guest public browsing`
diff --git a/app/prot/[id]/page.tsx b/app/prot/[id]/page.tsx
index c081d8e..da5d50c 100644
--- a/app/prot/[id]/page.tsx
+++ b/app/prot/[id]/page.tsx
@@ -120,20 +120,33 @@ export default function ProtDetailPage() {
             <Link href="/prot" className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors">
               Kembali ke Daftar
             </Link>
           </div>
       </div>
     );
   }
 
   const isEditable = item.status === PROTStatus.DRAFT || item.status === PROTStatus.REVISI;
   const isSubmittable = item.status === PROTStatus.DRAFT || item.status === PROTStatus.REVISI;
+  const canManageProt =
+    user && ['kurator_daerah', 'admin_kpoti'].includes(user.role);
+  const ownsProt = user && item.created_by === user.id;
+  const canEditProt = Boolean(
+    canManageProt &&
+      isEditable &&
+      (user?.role === 'admin_kpoti' || ownsProt)
+  );
+  const canSubmitProt = Boolean(
+    canManageProt &&
+      isSubmittable &&
+      (user?.role === 'admin_kpoti' || ownsProt)
+  );
   const isPublishable = item.status === PROTStatus.DIVERIFIKASI && user?.role === 'admin_kpoti';
   const isDeletable = user?.role === 'admin_kpoti';
 
   return (
     <>
       {/* Breadcrumb & Title Section */}
       <div className="bg-muted/30 border-b border-border">
         <div className="container mx-auto px-4 py-4">
           <div className="flex items-center gap-2 text-sm mb-2">
             <Link href="/" className="text-muted-foreground hover:text-foreground">Beranda</Link>
@@ -166,45 +179,47 @@ export default function ProtDetailPage() {
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                   </svg>
                   {item.kabkotaName || item.kabkotaKode}, {item.provinsiName || item.provinsiKode}
                 </span>
               </div>
             </div>
 
             <div className="flex flex-wrap items-center gap-2">
               {/* View History */}
-              <Link
-                href={`/prot/${item.id}/history`}
-                className="px-3 py-2 bg-background border border-border text-foreground rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
-              >
-                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
-                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
-                </svg>
-                History
-              </Link>
+              {user && (
+                <Link
+                  href={`/prot/${item.id}/history`}
+                  className="px-3 py-2 bg-background border border-border text-foreground rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
+                >
+                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
+                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
+                  </svg>
+                  History
+                </Link>
+              )}
 
               {/* Edit Button */}
-              {isEditable && (
+              {canEditProt && (
                 <Link
                   href={`/prot/${item.id}/edit`}
                   className="px-3 py-2 bg-background border border-border text-foreground rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
                 >
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                   </svg>
                   Edit
                 </Link>
               )}
 
               {/* Submit for Verification */}
-              {isSubmittable && (
+              {canSubmitProt && (
                 <button
                   onClick={handleSubmitVerification}
                   disabled={submitting}
                   className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                 >
                   {submitting ? 'Memproses...' : 'Ajukan Verifikasi'}
                   {!submitting && (
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
diff --git a/app/prot/page.tsx b/app/prot/page.tsx
index 3843641..97bd8cb 100644
--- a/app/prot/page.tsx
+++ b/app/prot/page.tsx
@@ -1,115 +1,83 @@
 'use client';
 
-import { useState, useEffect } from 'react';
-import { useRouter } from 'next/navigation';
+import { useState, useEffect, useCallback } from 'react';
 import Link from 'next/link';
-import { useAuth } from '@/hooks/useAuth';
+import { useCurrentUser } from '@/hooks/useCurrentUser';
 import { protApi } from '@/lib/api/prot';
 import { ProtCard } from '@/components/prot/ProtCard';
 import { ProtFilter } from '@/components/prot/ProtFilter';
 import { PROTEntity, PROTFilters } from '@/types/prot';
 
 export default function ProtModulePage() {
-  const router = useRouter();
-  const { user, isLoading: authLoading } = useAuth();
+  const { user } = useCurrentUser();
   const [items, setItems] = useState<PROTEntity[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [showFilters, setShowFilters] = useState(false);
   const [filters, setFilters] = useState<PROTFilters>({
     page: 1,
     limit: 12,
   });
   const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
   const [pagination, setPagination] = useState({
     total: 0,
     page: 1,
     limit: 12,
     totalPages: 1,
     hasNext: false,
     hasPrev: false,
   });
 
-  // Redirect to login if not authenticated
-  useEffect(() => {
-    if (!authLoading && !user) {
-      router.push('/login?redirectTo=/prot');
-    }
-  }, [authLoading, user, router]);
+  const canCreateProt =
+    user && ['kurator_daerah', 'admin_kpoti'].includes(user.role);
 
-  const fetchData = async () => {
+  const fetchData = useCallback(async () => {
     setLoading(true);
     setError(null);
     try {
       const response = await protApi.getAll(filters);
       if (response && response.data) {
         setItems(response.data);
         if (response.pagination) {
            setPagination(response.pagination);
         }
       } else {
         setItems([]);
       }
     } catch (err) {
       console.error('Error fetching PROT data:', err);
       setError('Gagal memuat data. Silakan coba lagi nanti.');
     } finally {
       setLoading(false);
     }
-  };
+  }, [filters]);
 
   useEffect(() => {
-    if (user) {
-      fetchData();
-    }
-  }, [filters, user]);
+    fetchData();
+  }, [fetchData]);
 
   const handleFilterChange = (newFilters: PROTFilters) => {
     setFilters((prev) => ({ ...prev, ...newFilters }));
   };
 
   const handleResetFilter = () => {
     setFilters({
       page: 1,
       limit: 12,
     });
   };
 
   const handlePageChange = (newPage: number) => {
       setFilters(prev => ({ ...prev, page: newPage }));
   };
 
-  // Show loading state while checking authentication
-  if (authLoading) {
-    return (
-      <div className="flex items-center justify-center py-20">
-        <div className="text-center">
-          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
-          <p className="text-muted-foreground">Memeriksa autentikasi...</p>
-        </div>
-      </div>
-    );
-  }
-
-  // Don't render content if not authenticated (will redirect)
-  if (!user) {
-    return (
-      <div className="flex items-center justify-center py-20">
-        <div className="text-center">
-          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
-          <p className="text-muted-foreground">Mengalihkan ke halaman login...</p>
-        </div>
-      </div>
-    );
-  }
-
   return (
     <>
         {/* Breadcrumb */}
         <div className="flex items-center gap-2 text-sm mb-6">
           <Link href="/" className="text-muted-foreground hover:text-foreground">
             Beranda
           </Link>
           <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
           </svg>
@@ -144,26 +112,28 @@ export default function ProtModulePage() {
                   viewMode === 'list'
                     ? 'bg-primary text-primary-foreground'
                     : 'bg-white text-gray-600 hover:bg-gray-50'
                 }`}
               >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                 </svg>
               </button>
             </div>
-            <Link href="/prot/create" className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md font-medium shadow hover:bg-primary/90 transition-colors">
-              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
-                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
-              </svg>
-              Tambah Data Baru
-            </Link>
+            {canCreateProt && (
+              <Link href="/prot/create" className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md font-medium shadow hover:bg-primary/90 transition-colors">
+                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
+                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
+                </svg>
+                Tambah Data Baru
+              </Link>
+            )}
           </div>
         </div>
 
         {/* Filter Toggle Button */}
         <div className="mb-6">
           <button
             onClick={() => setShowFilters(!showFilters)}
             className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
           >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
diff --git a/components/prot/ProtTabBar.tsx b/components/prot/ProtTabBar.tsx
index 3422588..f4d19e5 100644
--- a/components/prot/ProtTabBar.tsx
+++ b/components/prot/ProtTabBar.tsx
@@ -18,33 +18,35 @@ export function ProtTabBar() {
       isActive(href)
         ? 'border-primary text-primary'
         : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
     }`;
 
   const canVerify =
     user &&
     (user.role === 'pakar' ||
       user.role === 'admin_kpoti' ||
       user.role === 'kurator_daerah');
+  const canCreateProt =
+    user && ['kurator_daerah', 'admin_kpoti'].includes(user.role);
 
   return (
     <div className="sticky top-16 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <nav className="flex overflow-x-auto gap-1 scrollbar-none">
           <Link href="/prot" className={tabClass('/prot')}>
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
             </svg>
             Daftar PROT
           </Link>
 
-          {user && (
+          {canCreateProt && (
             <Link href="/prot/create" className={tabClass('/prot/create')}>
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
               </svg>
               Tambah PROT
             </Link>
           )}
 
           {canVerify && (
             <>
diff --git a/middleware.ts b/middleware.ts
index bfdfb75..1dad1be 100644
--- a/middleware.ts
+++ b/middleware.ts
@@ -10,20 +10,21 @@ const publicExactRoutes = [
   '/unauthorized',
   '/menu',
   '/events',
   '/calendar',
   '/nfts',
 ];
 
 const publicPrefixes = [
   /^\/events\/(?!create$|my-events$|my-registrations$)[^/]+$/,
   /^\/prot$/,
+  /^\/prot\/(?!create$|verifikasi(?:\/.*)?$)[^/]+$/,
   /^\/nfts\/[^/]+$/,
 ];
 
 function isPublicPath(pathname: string) {
   return (
     publicExactRoutes.includes(pathname) ||
     publicPrefixes.some((pattern) => pattern.test(pathname))
   );
 }
 
```
