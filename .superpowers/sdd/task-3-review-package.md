# Task 3 Review Package

Base: 7c9fa01
Head: b3ff927

## Commits
```
b3ff927 feat(routes): expose menu and event browsing to guests
```

## Stat
```
 .superpowers/sdd/task-3-report.md          | 88 ++++++++++++++++++++++++++++++
 app/{(protected) => }/events/[id]/page.tsx | 65 ++++++++++++----------
 app/{(protected) => }/events/page.tsx      |  8 ++-
 app/{(protected) => }/menu/page.tsx        |  4 +-
 4 files changed, 130 insertions(+), 35 deletions(-)
```

## Diff
```diff
diff --git a/.superpowers/sdd/task-3-report.md b/.superpowers/sdd/task-3-report.md
new file mode 100644
index 0000000..d41047f
--- /dev/null
+++ b/.superpowers/sdd/task-3-report.md
@@ -0,0 +1,88 @@
+# Task 3 Report: Move Menu and Event Browsing Routes Out of Protected Group
+
+## Status
+
+Completed.
+
+## Requirements Checked
+
+1. Moved `app/(protected)/menu/page.tsx` to `app/menu/page.tsx`.
+2. Moved `app/(protected)/events/page.tsx` to `app/events/page.tsx`.
+3. Moved `app/(protected)/events/[id]/page.tsx` to `app/events/[id]/page.tsx`.
+4. Updated menu private cards so:
+   - Marketplace points to `/login?redirectTo=/marketplace`
+   - Sertifikat points to `/login?redirectTo=/sertifikat`
+5. Preserved public browse URLs:
+   - `/menu`
+   - `/events`
+   - `/events/[id]`
+6. Updated event detail guest CTA to send unauthenticated users to `/login?redirectTo=/events/${eventId}`.
+7. Verified the protected browse route files no longer exist.
+8. Ran focused lint on touched files.
+9. Created a commit in the frontend worktree.
+
+## Files Changed
+
+- `app/menu/page.tsx`
+- `app/events/page.tsx`
+- `app/events/[id]/page.tsx`
+- deleted `app/(protected)/menu/page.tsx`
+- deleted `app/(protected)/events/page.tsx`
+- deleted `app/(protected)/events/[id]/page.tsx`
+
+## Implementation Notes
+
+- Menu public card redirects were updated at:
+  - `app/menu/page.tsx:118`
+  - `app/menu/page.tsx:145`
+- Event list route is now public at `app/events/page.tsx`.
+- Event detail guest registration CTA now shows:
+  - login redirect CTA for guests at `app/events/[id]/page.tsx:338`
+  - existing registered state for signed-in attendees
+  - existing register button for signed-in eligible attendees
+
+## Verification
+
+### Duplicate protected browse files removed
+
+Commands run:
+
+```powershell
+Test-Path -LiteralPath 'app/(protected)/menu/page.tsx'
+Test-Path -LiteralPath 'app/(protected)/events/page.tsx'
+Test-Path -LiteralPath 'app/(protected)/events/[id]/page.tsx'
+```
+
+Observed output:
+
+```text
+False
+False
+False
+```
+
+### Focused lint
+
+Command run:
+
+```powershell
+pnpm exec eslint app/menu/page.tsx app/events/page.tsx "app/events/[id]/page.tsx"
+```
+
+Observed result:
+
+```text
+Exit code 0
+```
+
+## Commit
+
+- `feat(routes): expose menu and event browsing to guests`
+
+## Self-Review
+
+- Route ownership stayed within the requested files.
+- Public URLs are preserved exactly as required.
+- Marketplace and Sertifikat remain gated through login redirects until later tasks.
+- Event management routes under `(protected)` were left in place.
+- No issues found in the final diff after focused lint passed.
diff --git a/app/(protected)/events/[id]/page.tsx b/app/events/[id]/page.tsx
similarity index 91%
rename from app/(protected)/events/[id]/page.tsx
rename to app/events/[id]/page.tsx
index 4b63420..c9828b4 100644
--- a/app/(protected)/events/[id]/page.tsx
+++ b/app/events/[id]/page.tsx
@@ -1,132 +1,129 @@
 'use client';
 
 import { useState } from 'react';
 import { useParams, useRouter } from 'next/navigation';
 import Link from 'next/link';
 import { useEvent } from '@/hooks/useEvents';
 import { useCurrentUser } from '@/hooks/useCurrentUser';
-import { EventStatusBadge } from '@/components/events/EventStatusBadge';
-import { EVENT_JENIS_LABELS, EventStatus } from '@/types/events';
+import { EVENT_JENIS_LABELS, EventRegistration, EventStatus } from '@/types/events';
 import {
   CalendarIcon,
   MapPinIcon,
   UsersIcon,
   PhoneIcon,
   EnvelopeIcon,
   PencilIcon,
   TrashIcon,
   CheckCircleIcon,
   XCircleIcon,
   ClipboardDocumentListIcon,
   ArrowLeftIcon,
 } from '@heroicons/react/24/outline';
 import {
   publishEvent,
   cancelEvent,
   deleteEvent,
   registerForEvent,
-  cancelRegistration,
 } from '@/lib/api/events';
 
 export default function EventDetailPage() {
   const params = useParams();
   const router = useRouter();
   const eventId = params.id as string;
   const { user } = useCurrentUser();
   const { data: event, loading, error } = useEvent(eventId);
   const [actionLoading, setActionLoading] = useState(false);
   const [actionError, setActionError] = useState<string | null>(null);
-  const [userRegistration, setUserRegistration] = useState<any>(null);
+  const [userRegistration, setUserRegistration] = useState<EventRegistration | null>(null);
+
+  const getErrorMessage = (err: unknown, fallback: string) => {
+    if (
+      typeof err === 'object' &&
+      err !== null &&
+      'response' in err &&
+      typeof (err as { response?: unknown }).response === 'object' &&
+      (err as { response?: { data?: unknown } }).response !== null &&
+      'data' in ((err as { response?: { data?: unknown } }).response ?? {}) &&
+      typeof ((err as { response?: { data?: { message?: unknown } } }).response?.data?.message) === 'string'
+    ) {
+      return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
+    }
+
+    return err instanceof Error ? err.message : fallback;
+  };
 
   const formatDate = (dateString: string) => {
     const date = new Date(dateString);
     return new Intl.DateTimeFormat('id-ID', {
       day: 'numeric',
       month: 'long',
       year: 'numeric',
       hour: '2-digit',
       minute: '2-digit',
     }).format(date);
   };
 
   const isOwner = user && event && user.id === event.created_by;
   const isFullyBooked = event && event.kuota_peserta && event.jumlah_peserta >= event.kuota_peserta;
-  const canRegister = user && event && event.status === EventStatus.PUBLISHED && !isFullyBooked;
-
   const handlePublish = async () => {
     if (!confirm('Apakah Anda yakin ingin mempublikasikan event ini?')) return;
     try {
       setActionLoading(true);
       setActionError(null);
       await publishEvent(eventId);
       window.location.reload();
-    } catch (err: any) {
-      setActionError(err.response?.data?.message || 'Gagal mempublikasikan event');
+    } catch (err: unknown) {
+      setActionError(getErrorMessage(err, 'Gagal mempublikasikan event'));
     } finally {
       setActionLoading(false);
     }
   };
 
   const handleCancel = async () => {
     if (!confirm('Apakah Anda yakin ingin membatalkan event ini?')) return;
     try {
       setActionLoading(true);
       setActionError(null);
       await cancelEvent(eventId);
       window.location.reload();
-    } catch (err: any) {
-      setActionError(err.response?.data?.message || 'Gagal membatalkan event');
+    } catch (err: unknown) {
+      setActionError(getErrorMessage(err, 'Gagal membatalkan event'));
     } finally {
       setActionLoading(false);
     }
   };
 
   const handleDelete = async () => {
     if (!confirm('Apakah Anda yakin ingin menghapus event ini? Tindakan ini tidak dapat dibatalkan.')) return;
     try {
       setActionLoading(true);
       setActionError(null);
       await deleteEvent(eventId);
       router.push('/events/my-events');
-    } catch (err: any) {
-      setActionError(err.response?.data?.message || 'Gagal menghapus event');
+    } catch (err: unknown) {
+      setActionError(getErrorMessage(err, 'Gagal menghapus event'));
     } finally {
       setActionLoading(false);
     }
   };
 
   const handleRegister = async () => {
     if (!confirm('Apakah Anda yakin ingin mendaftar event ini?')) return;
     try {
       setActionLoading(true);
       setActionError(null);
       const registration = await registerForEvent(eventId);
       setUserRegistration(registration);
       window.location.reload();
-    } catch (err: any) {
-      setActionError(err.response?.data?.message || 'Gagal mendaftar event');
-    } finally {
-      setActionLoading(false);
-    }
-  };
-
-  const handleCancelRegistration = async () => {
-    if (!confirm('Apakah Anda yakin ingin membatalkan pendaftaran?')) return;
-    try {
-      setActionLoading(true);
-      setActionError(null);
-      await cancelRegistration(eventId);
-      setUserRegistration(null);
-      window.location.reload();
-    } catch (err: any) {
-      setActionError(err.response?.data?.message || 'Gagal membatalkan pendaftaran');
+    } catch (err: unknown) {
+      setActionError(getErrorMessage(err, 'Gagal mendaftar event'));
     } finally {
       setActionLoading(false);
     }
   };
 
   if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <div className="text-center">
           <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
@@ -168,20 +165,21 @@ export default function EventDetailPage() {
         {actionError && (
           <div className="mx-6 mb-6 bg-[#ffdad6] dark:bg-red-900/30 border-l-4 border-[#93000a] dark:border-red-500 rounded-md p-4 shadow-sm">
             <p className="text-[#93000a] dark:text-red-200">{actionError}</p>
           </div>
         )}
 
         {/* Hero Banner Section */}
         <div className="px-6">
           <div className="relative w-full h-[450px] rounded-3xl overflow-hidden shadow-2xl">
             {event.banner_url ? (
+              /* eslint-disable-next-line @next/next/no-img-element */
               <img
                 src={event.banner_url}
                 alt={event.nama}
                 className="w-full h-full object-cover"
               />
             ) : (
               <div className="w-full h-full bg-gradient-to-br from-[#9e3c24] to-[#3c0700] dark:from-[#D65C2E] dark:to-[#121212] flex items-center justify-center">
                 <span className="text-white text-8xl font-bold">
                   {event.nama.charAt(0).toUpperCase()}
                 </span>
@@ -331,21 +329,28 @@ export default function EventDetailPage() {
                         <div className="mt-2 inline-block px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs rounded-full font-bold">
                           Kapasitas Penuh
                         </div>
                       )}
                     </div>
                   )}
                 </div>
 
                 {/* User Registration Button */}
                 {!isOwner && event.status === EventStatus.PUBLISHED && (
-                  event.is_registered || userRegistration ? (
+                  !user ? (
+                    <Link
+                      href={`/login?redirectTo=/events/${eventId}`}
+                      className="block w-full py-4 bg-[#9e3c24] dark:bg-[#D65C2E] text-white rounded-xl font-black text-lg text-center shadow-lg shadow-[#9e3c24]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
+                    >
+                      MASUK UNTUK DAFTAR
+                    </Link>
+                  ) : event.is_registered || userRegistration ? (
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
diff --git a/app/(protected)/events/page.tsx b/app/events/page.tsx
similarity index 96%
rename from app/(protected)/events/page.tsx
rename to app/events/page.tsx
index bfeabf4..649b357 100644
--- a/app/(protected)/events/page.tsx
+++ b/app/events/page.tsx
@@ -1,39 +1,41 @@
 'use client';
 
 import { useState } from 'react';
 import Link from 'next/link';
 import { useEvents } from '@/hooks/useEvents';
 import { EventCard } from '@/components/events/EventCard';
 import { EventFilter } from '@/components/events/EventFilter';
-import { EventJenis, EventStatus } from '@/types/events';
+import { EventJenis, EventListParams, EventStatus } from '@/types/events';
 import { PlusIcon } from '@heroicons/react/24/outline';
 import { useCurrentUser } from '@/hooks/useCurrentUser';
 
 export default function EventsPage() {
   const { user } = useCurrentUser();
   const [filters, setFilters] = useState<{
     search?: string;
     jenis?: EventJenis | '';
     status?: EventStatus | '';
     page?: number;
   }>({ page: 1 });
 
   const { data, loading, error } = useEvents({
     ...filters,
     jenis: filters.jenis || undefined,
     status: filters.status || undefined,
     limit: 12,
   });
 
-  const handleFilterChange = (newFilters: any) => {
-    setFilters((prev) => ({ ...newFilters, page: 1 }));
+  const handleFilterChange = (
+    newFilters: Pick<EventListParams, 'search' | 'jenis' | 'status' | 'daerah_id'>
+  ) => {
+    setFilters({ ...newFilters, page: 1 });
   };
 
   const handlePageChange = (newPage: number) => {
     setFilters((prev) => ({ ...prev, page: newPage }));
   };
 
   // Check if user can create events (kurator or admin)
   const canCreateEvent = user && ['kurator_daerah', 'admin_kpoti'].includes(user.role);
 
   return (
diff --git a/app/(protected)/menu/page.tsx b/app/menu/page.tsx
similarity index 99%
rename from app/(protected)/menu/page.tsx
rename to app/menu/page.tsx
index d62cd41..6989fda 100644
--- a/app/(protected)/menu/page.tsx
+++ b/app/menu/page.tsx
@@ -108,21 +108,21 @@ export default async function MenuPage() {
             </div>
             <div className="flex items-center gap-2 text-primary font-bold text-sm">
               <span>Buka</span>
               <ArrowRight className="w-4 h-4" />
             </div>
           </div>
         </Link>
 
         {/* Marketplace */}
         <Link
-          href="/marketplace"
+          href="/login?redirectTo=/marketplace"
           className="md:col-span-4 group relative overflow-hidden rounded-xl bg-muted min-h-[320px] flex flex-col justify-end p-8 hover:shadow-lg transition-all"
         >
           {/* eslint-disable-next-line @next/next/no-img-element */}
           <img
             alt="Craftsmanship Marketplace"
             className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-1000"
             src="/images/landing/menu-marketplace.webp"
           />
           <div className="relative z-10">
             <ShoppingBag className="w-6 h-6 text-primary mb-2" />
@@ -135,21 +135,21 @@ export default async function MenuPage() {
             </p>
             <div className="flex items-center gap-2 text-primary font-bold text-sm">
               <span>Buka</span>
               <ArrowUpRight className="w-4 h-4" />
             </div>
           </div>
         </Link>
 
         {/* Sertifikat Prestasi */}
         <Link
-          href="/sertifikat"
+          href="/login?redirectTo=/sertifikat"
           className="md:col-span-4 group bg-muted/50 border-b-4 border-primary rounded-xl p-8 flex flex-col justify-between hover:bg-muted transition-all duration-300"
         >
           <div>
             <BadgeCheck className="w-10 h-10 text-primary mb-4" />
             <h3 className="text-2xl font-bold tracking-tight text-foreground mb-3">
               Sertifikat Prestasi
             </h3>
             <p className="text-muted-foreground text-sm leading-relaxed">
               Raih dan pamerkan sertifikat atas kontribusimu dalam
               mendokumentasikan serta melestarikan warisan budaya bangsa.
```
