# Frontend Refactor — Unified Navbar & Consistent Styling

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the dual-navbar system with a single consistent `AppNavbar`, expose user avatar + name in the navbar, add a contextual PROT tab bar, simplify the menu page, and restyle the admin panel to use the app's CSS variable design system.

**Architecture:** A shared `AppNavbar` component is used in `(protected)/layout.tsx`, `app/prot/layout.tsx` (new), and `app/calendar/layout.tsx` (new). A new `ProtTabBar` component renders below the navbar only when the user is inside `/prot/*`. The `ProtNavigation` component is deleted. The admin panel keeps its sidebar+header layout but all hardcoded hex colors are replaced with Tailwind CSS variables.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, `usePathname`, `useCurrentUser` hook, Lucide icons (already installed).

---

## BEFORE YOU START

Read these files to understand the current state:
- `components/ui/UserNav.tsx` — current user dropdown
- `components/prot/ProtNavigation.tsx` — the component being deleted
- `app/(protected)/layout.tsx` — protected route layout
- `components/admin/AdminSidebar.tsx` — admin sidebar with hardcoded hex colors
- `components/admin/AdminHeader.tsx` — admin header being replaced

CSS variable reference (defined in `globals.css`):
- `bg-background`, `bg-card`, `bg-muted`, `bg-primary`
- `text-foreground`, `text-muted-foreground`, `text-primary-foreground`
- `border-border`, `ring-ring`

---

## Task 1: Update `UserNav` — show avatar + name visibly

**Files:**
- Modify: `components/ui/UserNav.tsx`

**What to change:**

The trigger button currently shows only avatar + chevron. Add the user's first name next to the avatar so it's always visible in the navbar.

Replace the `<button>` content (lines 44–56) with:

```tsx
<button
  onClick={() => setIsOpen(!isOpen)}
  className="flex items-center gap-2 focus:outline-none group"
>
  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden border border-border group-hover:border-primary/50 transition-colors">
    {user?.avatar_url ? (
      <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
    ) : (
      <User className="w-4 h-4 text-foreground/70" />
    )}
  </div>
  <span className="hidden sm:inline text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors max-w-[100px] truncate">
    {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
  </span>
  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
</button>
```

Also add the user's role in the dropdown header section. In the `px-4 py-3` div (dropdown header, lines 60–63), add a role badge below the email:

```tsx
<div className="px-4 py-3 border-b border-border">
  <p className="text-sm font-medium text-foreground truncate">{user?.full_name || 'User'}</p>
  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
  {user?.role && (
    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary uppercase tracking-wide">
      {user.role === 'admin_kpoti' ? 'Admin' : user.role === 'pakar' ? 'Pakar' : 'Pengguna'}
    </span>
  )}
</div>
```

**Verify manually:**
- Run `pnpm dev` in `nusantara-play-frontend/`
- Log in, check navbar — should show avatar + first name
- Open dropdown — should show role badge

**Commit:**
```bash
git add components/ui/UserNav.tsx
git commit -m "feat: show avatar + name + role badge in UserNav"
```

---

## Task 2: Create `AppNavbar` shared component

**Files:**
- Create: `components/ui/AppNavbar.tsx`

**What to build:**

A standalone navbar component that can be dropped into any layout. It wraps the same structure as `(protected)/layout.tsx`'s current `<header>` block but is self-contained.

```tsx
'use client';

import Link from 'next/link';
import { UserNav } from '@/components/ui/UserNav';
import { AnimatedThemeToggler } from '@/components/ui/AnimatedThemeToggler';

export function AppNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/menu" className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
            <div className="w-6 h-6 bg-accent rounded-sm rotate-45" />
            Nusantara Play
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <Link href="/menu" className="text-foreground/80 hover:text-foreground transition-colors">
              Menu
            </Link>
            <Link href="/calendar" className="text-foreground/80 hover:text-foreground transition-colors">
              Kalender
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <AnimatedThemeToggler className="hover:bg-muted/50 transition-colors" />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
```

**Verify manually:**
- File compiles without errors (`pnpm build` or check IDE diagnostics)

**Commit:**
```bash
git add components/ui/AppNavbar.tsx
git commit -m "feat: add shared AppNavbar component"
```

---

## Task 3: Create `ProtTabBar` contextual tab component

**Files:**
- Create: `components/prot/ProtTabBar.tsx`

**What to build:**

A sticky tab bar rendered below `AppNavbar` only inside `/prot/*` routes. Role-based visibility.

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function ProtTabBar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  const isActive = (href: string) => {
    if (href === '/prot') return pathname === '/prot';
    return pathname?.startsWith(href);
  };

  const tabClass = (href: string) =>
    `flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      isActive(href)
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
    }`;

  const canVerify = user && (user.role === 'pakar' || user.role === 'admin_kpoti');

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

          {user && (
            <Link href="/prot/create" className={tabClass('/prot/create')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah PROT
            </Link>
          )}

          {canVerify && (
            <>
              <Link href="/prot/verifikasi/queue" className={tabClass('/prot/verifikasi/queue')}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Antrean Verifikasi
              </Link>
              <Link href="/prot/verifikasi/my-queue" className={tabClass('/prot/verifikasi/my-queue')}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tugas Saya
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
```

**Verify manually:**
- File compiles without errors

**Commit:**
```bash
git add components/prot/ProtTabBar.tsx
git commit -m "feat: add ProtTabBar contextual tab component"
```

---

## Task 4: Create `app/prot/layout.tsx`

**Files:**
- Create: `app/prot/layout.tsx`

**What to build:**

A layout that wraps all `/prot/*` pages with `AppNavbar` + `ProtTabBar`. Does NOT redirect unauthenticated users (public read is allowed — individual pages handle write-operation auth checks).

```tsx
import { AppNavbar } from '@/components/ui/AppNavbar';
import { ProtTabBar } from '@/components/prot/ProtTabBar';

export default function ProtLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <ProtTabBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
```

**Verify manually:**
- Navigate to `/prot` — should see AppNavbar + tab bar + content (no duplicate headers)

**Commit:**
```bash
git add app/prot/layout.tsx
git commit -m "feat: add prot layout with AppNavbar and ProtTabBar"
```

---

## Task 5: Remove `ProtNavigation` from all `/prot/*` pages

**Files to modify (remove the `<ProtNavigation />` render + import from each):**

1. `app/prot/page.tsx` — remove `import { ProtNavigation }` + `<ProtNavigation />` + the wrapping `<div className="min-h-screen bg-background">` (layout now provides this)
2. `app/prot/[id]/page.tsx` — same pattern
3. `app/prot/create/page.tsx` — same pattern
4. `app/prot/[id]/edit/page.tsx` — same pattern
5. `app/prot/[id]/history/page.tsx` — same pattern
6. `app/prot/verifikasi/queue/page.tsx` — same pattern
7. `app/prot/verifikasi/my-queue/page.tsx` — same pattern
8. `app/prot/verifikasi/[id]/review/page.tsx` — same pattern

**For each file, the pattern is:**

Before:
```tsx
import { ProtNavigation } from '@/components/prot/ProtNavigation';
// ...
return (
  <div className="min-h-screen bg-background">
    <ProtNavigation />
    <main className="container mx-auto px-4 py-6">
      {/* page content */}
    </main>
  </div>
);
```

After:
```tsx
// import removed
// ...
return (
  <>
    {/* page content directly — layout handles navbar + padding */}
  </>
);
```

Note: The `<main>` wrapper with padding in each page should be removed too since `app/prot/layout.tsx` now provides `<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">`. Keep the inner content divs intact.

**Verify manually:**
- Visit `/prot`, `/prot/create`, `/prot/[any-id]` — no duplicate navbar, tab bar shows correctly

**Commit:**
```bash
git add app/prot/
git commit -m "refactor: remove ProtNavigation from all prot pages"
```

---

## Task 6: Fix calendar pages using `ProtNavigation`

**Problem:** Three calendar pages incorrectly import `ProtNavigation`:
- `app/calendar/page.tsx` — public, outside protected group
- `app/(protected)/calendar/my/page.tsx` — already gets navbar from protected layout
- `app/(protected)/calendar/invites/page.tsx` — already gets navbar from protected layout

**Step 1: Create `app/calendar/layout.tsx`** (for the public calendar page)

```tsx
import { AppNavbar } from '@/components/ui/AppNavbar';

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
```

**Step 2: Remove `ProtNavigation` from `app/calendar/page.tsx`**

Remove the import and the `<ProtNavigation />` render. Remove the outer `min-h-screen` wrapper div (layout provides it).

**Step 3: Remove `ProtNavigation` from `app/(protected)/calendar/my/page.tsx`**

Same — remove import + render. These pages are inside protected layout which already renders the navbar.

**Step 4: Remove `ProtNavigation` from `app/(protected)/calendar/invites/page.tsx`**

Same.

**Verify manually:**
- Visit `/calendar` — shows AppNavbar, no duplicate
- Visit `/calendar/my` and `/calendar/invites` (logged in) — shows AppNavbar from protected layout, no duplicate

**Commit:**
```bash
git add app/calendar/layout.tsx app/calendar/page.tsx app/(protected)/calendar/
git commit -m "refactor: remove ProtNavigation from calendar pages"
```

---

## Task 7: Update `(protected)/layout.tsx` — use `AppNavbar`, remove admin bypass

**Files:**
- Modify: `app/(protected)/layout.tsx`

**What to change:**

1. Remove the `isAdminRoute` check and its early return (admin layout now manages its own navbar)
2. Replace the inline `<header>` block with `<AppNavbar />`
3. Import `AppNavbar`

Replace the entire file content with:

```tsx
'use client';

import { ReactNode, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppNavbar } from '@/components/ui/AppNavbar';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      }
      setLoading(false);
    };
    checkUser();
  }, [router, supabase]);

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
```

**Verify manually:**
- Visit `/menu`, `/events`, `/profile` (logged in) — AppNavbar shows with avatar + name
- Visit `/admin/dashboard` — should work independently (admin layout renders its own header now)

**Commit:**
```bash
git add app/(protected)/layout.tsx
git commit -m "refactor: replace inline header with AppNavbar in protected layout"
```

---

## Task 8: Simplify the menu page

**Files:**
- Modify: `app/(protected)/menu/page.tsx`

**What to change:**

Remove:
1. The "Quick Stats" section (the 3-card grid with hardcoded `0` values, lines ~90–135)
2. The "Quick Actions" section (the flex-wrap of buttons, lines ~179–228)

Keep:
1. The header greeting with user name
2. The menu cards grid

Also update the greeting to mention role naturally. Replace the header section:

```tsx
{/* Header Section */}
<div className="space-y-1 mb-8">
  <h1 className="text-3xl font-bold tracking-tight">
    Selamat Datang, {user?.user_metadata?.full_name?.split(' ')[0] || 'Kawan'}!
  </h1>
  <p className="text-muted-foreground">
    Pilih menu di bawah untuk mulai menjelajah Nusantara Play.
  </p>
</div>
```

The menu cards section stays exactly as-is.

**Verify manually:**
- Visit `/menu` — clean page with just greeting + cards, no fake stats

**Commit:**
```bash
git add app/(protected)/menu/page.tsx
git commit -m "refactor: simplify menu page, remove placeholder stats and quick actions"
```

---

## Task 9: Restyle `AdminSidebar` with CSS variables

**Files:**
- Modify: `components/admin/AdminSidebar.tsx`

**What to change:**

Replace all hardcoded hex colors with Tailwind CSS variable classes.

| Old (hex) | New (CSS variable) |
|-----------|-------------------|
| `bg-gradient-to-b from-[#1e3a4c] to-[#2D3E50]` | `bg-card` |
| `bg-[#0f2027]` | `bg-muted/50` |
| `border-[#C04A21]/30` | `border-border` |
| `bg-[#D4A017]` (gold button) | `bg-primary` |
| `hover:bg-[#E5B028]` | `hover:bg-primary/90` |
| `text-[#2D2D2D]` | `text-primary-foreground` |
| `bg-gradient-to-r from-[#C04A21] to-[#D65C2E]` (active) | `bg-primary` |
| `text-gray-300` | `text-muted-foreground` |
| `text-gray-400` | `text-muted-foreground` |
| `hover:bg-white/10` | `hover:bg-muted` |
| `text-[#D4A017]` (icon color) | `text-primary` |
| `bg-[#D4A017]` (submenu active) | `bg-primary/10` |
| `text-[#2D2D2D]` (submenu active text) | `text-primary` |

Full rewrite of the outer wrapper and key sections:

```tsx
// Outer wrapper — was: bg-gradient-to-b from-[#1e3a4c] to-[#2D3E50] text-white w-64
<div className="bg-card border-r border-border text-foreground w-64 flex-shrink-0 flex flex-col">

  {/* Logo — was: bg-[#0f2027] border-b-2 border-[#C04A21]/30 */}
  <div className="flex items-center justify-center h-16 border-b border-border">
    <h1 className="text-xl font-bold text-primary tracking-wide">Nusantara Play</h1>
  </div>

  {/* Back button — was: bg-[#D4A017] text-[#2D2D2D] */}
  <div className="p-3 border-b border-border">
    <Link
      href="/menu"
      className="flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors group"
    >
      <svg ...arrow icon...>
      Kembali ke Menu Utama
    </Link>
  </div>

  {/* Nav items — active: bg-primary text-primary-foreground */}
  {/* inactive: text-muted-foreground hover:bg-muted hover:text-foreground */}
  {/* icon colors: text-primary (inactive), text-primary-foreground (active) */}

  {/* Footer — was: bg-[#0f2027] border-t-2 border-[#C04A21]/30 */}
  <div className="p-4 border-t border-border">
    <p className="text-[10px] text-muted-foreground text-center">Admin Panel v1.0</p>
  </div>
</div>
```

Apply these classes consistently to all nav items (active/inactive states) and submenu items.

**Verify manually:**
- Visit `/admin/dashboard` — sidebar matches main app color scheme, works in dark mode

**Commit:**
```bash
git add components/admin/AdminSidebar.tsx
git commit -m "refactor: restyle AdminSidebar with CSS variables"
```

---

## Task 10: Replace `AdminHeader` with `AppNavbar` in admin layout

**Files:**
- Modify: `app/(protected)/admin/layout.tsx`
- Modify: `components/admin/AdminHeader.tsx` (to be effectively unused — can keep file for now)

**What to change in `admin/layout.tsx`:**

1. Remove `AdminHeader` import
2. Add `AppNavbar` import
3. Replace `<AdminHeader user={user} />` with `<AppNavbar />`
4. Change the outer wrapper from `flex h-screen bg-[#F7F3E8]` to `flex h-screen bg-background`
5. Change the loading/error screens from `bg-[#F7F3E8]` + `border-[#1A5F7A]` to `bg-background` + `border-primary`
6. Change the `flex-1 flex flex-col overflow-hidden` div to also remove the admin-specific bg

New structure:

```tsx
return (
  <div className="flex flex-col h-screen bg-background">
    <AppNavbar />
    <div className="flex flex-1 overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  </div>
);
```

Loading screens update — replace all three occurrences of:
```tsx
<div className="flex justify-center items-center min-h-screen bg-[#F7F3E8]">
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A5F7A] mx-auto"></div>
  <p className="mt-4 text-[#6B6B6B] text-sm">...</p>
```
With:
```tsx
<div className="flex justify-center items-center min-h-screen bg-background">
  <div className="text-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
    <p className="mt-4 text-muted-foreground text-sm">...</p>
  </div>
```

**Verify manually:**
- Visit `/admin/dashboard` — AppNavbar on top, sidebar on left, content area all use theme colors
- Toggle dark mode — admin panel follows theme correctly

**Commit:**
```bash
git add app/(protected)/admin/layout.tsx
git commit -m "refactor: replace AdminHeader with AppNavbar in admin layout"
```

---

## Task 11: Delete `ProtNavigation` component

**Files:**
- Delete: `components/prot/ProtNavigation.tsx`

First verify no remaining imports:
```bash
grep -r "ProtNavigation" nusantara-play-frontend/
```
Expected: zero results (only the file itself).

Then delete the file.

**Commit:**
```bash
git rm components/prot/ProtNavigation.tsx
git commit -m "chore: delete ProtNavigation component (replaced by AppNavbar + ProtTabBar)"
```

---

## Task 12: Final verification

Run through this checklist manually:

- [ ] `/login` — no navbar (auth layout handles this separately)
- [ ] `/menu` — AppNavbar, avatar + name visible, simplified page (no fake stats)
- [ ] `/prot` — AppNavbar + ProtTabBar, public access works without login
- [ ] `/prot/create` — AppNavbar + ProtTabBar, redirects to login if not authenticated
- [ ] `/prot/verifikasi/queue` — tab only visible when logged in as pakar/admin
- [ ] `/calendar` — AppNavbar, no duplicate header
- [ ] `/admin/dashboard` — AppNavbar + sidebar, all colors match design system
- [ ] Dark mode toggle — all pages follow theme correctly
- [ ] Mobile — navbar collapses correctly

**Final commit:**
```bash
git add .
git commit -m "feat: frontend refactor complete — unified navbar, consistent admin styling"
```
