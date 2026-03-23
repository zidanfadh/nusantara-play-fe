# Calendar Refactor — Unified Styling & Navigation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor all calendar pages and components to use the app's CSS variable design system, replace ProtNavigation with a CalendarTabBar, and polish the UI from PoC-level to production-ready.

**Architecture:** A new `CalendarTabBar` component mirrors the `ProtTabBar` pattern. Two new layout files (`app/calendar/layout.tsx` and `app/(protected)/calendar/layout.tsx`) inject the tab bar into the right route groups. All `bg-white`, `bg-gray-*`, `dark:bg-gray-*`, `bg-blue-600`, `bg-green-600`, `bg-purple-600` hardcoded classes across 7 components/pages are replaced with CSS variables. Semantic action colors (green for accept, red for decline/delete) are retained as they communicate intent.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, `useCurrentUser` hook, `usePathname`.

---

## BEFORE YOU START

This plan assumes the frontend-refactor plan (`2026-03-18-frontend-refactor.md`) has been executed. Specifically:
- `AppNavbar` component exists at `components/ui/AppNavbar.tsx`
- `ProtNavigation` is already removed from `app/calendar/page.tsx`, `app/(protected)/calendar/my/page.tsx`, and `app/(protected)/calendar/invites/page.tsx`

If those changes haven't landed yet, skip removing ProtNavigation in this plan (it will be handled there) and focus on the styling/layout changes.

**CSS variable reference:**
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`, `bg-muted/50`, `bg-primary`, `bg-primary/5`, `bg-primary/10`
- Text: `text-foreground`, `text-muted-foreground`, `text-primary`, `text-primary-foreground`
- Borders: `border-border`, `divide-border`
- Interactive: `hover:bg-muted`, `hover:bg-muted/50`, `focus:ring-ring`
- Semantic (keep as-is): `bg-green-600` (accept), `bg-red-600` (decline/delete), `border-yellow-500` (pending warning)

---

## Task 1: Create `CalendarTabBar` component

**Files:**
- Create: `components/calendar/CalendarTabBar.tsx`

**What to build:**

Tab bar that appears below `AppNavbar` for all `/calendar/*` routes. Shows Jadwal Saya + Undangan only when logged in.

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function CalendarTabBar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  const isActive = (href: string) => {
    if (href === '/calendar') return pathname === '/calendar';
    return pathname?.startsWith(href);
  };

  const tabClass = (href: string) =>
    `flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      isActive(href)
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
    }`;

  return (
    <div className="sticky top-16 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex overflow-x-auto gap-1 scrollbar-none">
          <Link href="/calendar" className={tabClass('/calendar')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Kalender Publik
          </Link>

          {user && (
            <>
              <Link href="/calendar/my" className={tabClass('/calendar/my')}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Jadwal Saya
              </Link>

              <Link href="/calendar/invites" className={tabClass('/calendar/invites')}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Undangan
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
```

**Commit:**
```bash
git add components/calendar/CalendarTabBar.tsx
git commit -m "feat: add CalendarTabBar component"
```

---

## Task 2: Create `app/calendar/layout.tsx`

**Files:**
- Create: `app/calendar/layout.tsx`

**What to build:**

Layout for the public `/calendar` route. Provides `AppNavbar` + `CalendarTabBar` since this route is outside the `(protected)` group.

```tsx
import { AppNavbar } from '@/components/ui/AppNavbar';
import { CalendarTabBar } from '@/components/calendar/CalendarTabBar';

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <CalendarTabBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
```

**Commit:**
```bash
git add app/calendar/layout.tsx
git commit -m "feat: add calendar layout with AppNavbar and CalendarTabBar"
```

---

## Task 3: Create `app/(protected)/calendar/layout.tsx`

**Files:**
- Create: `app/(protected)/calendar/layout.tsx`

**What to build:**

Layout for protected calendar routes (`/calendar/my`, `/calendar/invites`). The `AppNavbar` is already rendered by `(protected)/layout.tsx`, so this only adds `CalendarTabBar`. Also removes the `<main>` wrapper since `(protected)/layout.tsx` already provides it — wrap content in a fragment and push the tab bar above.

Since `(protected)/layout.tsx` wraps content in `<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">`, we need to break out of that for the sticky tab bar. The cleanest solution: use a negative margin trick or restructure.

Actually, the simpler approach — render `CalendarTabBar` inside the layout but accept that it sits inside the `<main>` container. Since `CalendarTabBar` is `sticky top-16`, it will stick correctly regardless of where it's placed in the DOM.

```tsx
import { CalendarTabBar } from '@/components/calendar/CalendarTabBar';

export default function ProtectedCalendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CalendarTabBar />
      {children}
    </>
  );
}
```

Note: This layout renders inside `(protected)/layout.tsx`'s `<main>` tag. The `CalendarTabBar`'s `sticky top-16` will still work correctly since it sticks relative to the viewport.

**Commit:**
```bash
git add "app/(protected)/calendar/layout.tsx"
git commit -m "feat: add protected calendar layout with CalendarTabBar"
```

---

## Task 4: Update `app/calendar/page.tsx` — clean up + segmented control

**Files:**
- Modify: `app/calendar/page.tsx`

**What to change:**

1. Remove `ProtNavigation` import and `<ProtNavigation />` render
2. Remove outer `<div className="min-h-screen bg-background">` and `<main>` wrapper (layout provides these)
3. Remove the "Undangan" and "Jadwal Saya" navigation buttons (moved to CalendarTabBar)
4. Replace view toggle buttons with segmented control
5. Fix `text-gray-600 dark:text-gray-400` → `text-muted-foreground`
6. Remove breadcrumb (tab bar provides context)

Replace the view toggle section:

```tsx
{/* View Mode Toggle — segmented control */}
<div className="mb-6 flex items-center gap-4">
  <div className="inline-flex bg-muted p-1 rounded-lg">
    <button
      onClick={() => setViewMode('calendar')}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        viewMode === 'calendar'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
      Kalender
    </button>
    <button
      onClick={() => setViewMode('agenda')}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        viewMode === 'agenda'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
      Agenda
    </button>
  </div>
</div>
```

Full page structure after changes:
```tsx
export default function CalendarPage() {
  // ... state same as before

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Kalender Nusantara Play</h1>
        <p className="text-muted-foreground">
          Lihat tanggal penting, jadwal, dan event budaya Indonesia
        </p>
      </div>

      {/* Segmented control */}
      ...

      {/* Calendar or Agenda */}
      {viewMode === 'calendar' ? (
        <CalendarViewComponent onItemClick={setSelectedItemId} />
      ) : (
        <CalendarAgenda onItemClick={setSelectedItemId} />
      )}

      {selectedItemId && (
        <CalendarItemDetail ... />
      )}
    </>
  );
}
```

**Commit:**
```bash
git add app/calendar/page.tsx
git commit -m "refactor: clean up calendar page, add segmented control, remove ProtNavigation"
```

---

## Task 5: Restyle `CalendarFilter` component

**Files:**
- Modify: `components/calendar/CalendarFilter.tsx`

**What to change:**

Replace all hardcoded colors with CSS variables:

| Old | New |
|-----|-----|
| `bg-white dark:bg-gray-800` (container) | `bg-card border border-border` |
| `border rounded dark:bg-gray-700 dark:border-gray-600` (inputs/selects) | `bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:outline-none` |
| `className="w-4 h-4"` (checkbox) | add `accent-primary` |

Full container replacement:
```tsx
<div className="flex flex-wrap gap-4 p-4 bg-card border border-border rounded-xl">
```

All `<input>` and `<select>` elements:
```tsx
className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
```

Checkbox label:
```tsx
<input
  type="checkbox"
  checked={filters.include_events !== false}
  onChange={(e) => updateFilter('include_events', e.target.checked)}
  className="w-4 h-4 accent-primary"
/>
```

**Commit:**
```bash
git add components/calendar/CalendarFilter.tsx
git commit -m "refactor: restyle CalendarFilter with CSS variables"
```

---

## Task 6: Restyle `CalendarView` (grid bulan)

**Files:**
- Modify: `components/calendar/CalendarView.tsx`

**What to change:**

**Month navigation** — replace the plain gray buttons:
```tsx
{/* Month Navigation */}
<div className="flex items-center justify-between mb-4">
  <button
    onClick={prevMonth}
    className="p-2 border border-border rounded-lg hover:bg-muted transition-colors"
    aria-label="Bulan sebelumnya"
  >
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  </button>

  <div className="flex items-center gap-3">
    <h2 className="text-lg font-semibold">{getMonthName(month)} {year}</h2>
    <button
      onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }}
      className="px-3 py-1 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground"
    >
      Hari ini
    </button>
  </div>

  <button
    onClick={nextMonth}
    className="p-2 border border-border rounded-lg hover:bg-muted transition-colors"
    aria-label="Bulan berikutnya"
  >
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </button>
</div>
```

Note: add `const now = new Date();` at component scope (already exists, just move above state declarations if needed).

**Grid container:**
```tsx
{/* was: bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden */}
<div className="bg-card border border-border rounded-xl overflow-hidden">
```

**Day headers:**
```tsx
{/* was: grid grid-cols-7 bg-gray-100 dark:bg-gray-700 */}
<div className="grid grid-cols-7 bg-muted/50 border-b border-border">
  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
    <div
      key={day}
      className="p-2 text-center text-xs font-semibold text-muted-foreground border-r border-border last:border-r-0"
    >
      {day}
    </div>
  ))}
</div>
```

**Day cells:**
```tsx
<div
  key={dayItem.date}
  className={`min-h-[100px] p-2 border-r border-b border-border transition-colors ${
    index % 7 === 6 ? 'border-r-0' : ''
  } ${!isCurrentMonth ? 'bg-muted/20' : ''} ${isToday ? 'bg-primary/5' : ''}`}
>
  {/* Date number */}
  <div className="flex justify-start mb-1">
    {isToday ? (
      <span className="inline-flex w-6 h-6 items-center justify-center bg-primary text-primary-foreground rounded-full text-xs font-bold">
        {formatDate(dayItem.date)}
      </span>
    ) : (
      <span className={`text-xs font-medium ${!isCurrentMonth ? 'text-muted-foreground' : 'text-foreground'}`}>
        {formatDate(dayItem.date)}
      </span>
    )}
  </div>
  {/* Entries stay the same — entry.color is data, keep inline style */}
  ...
</div>
```

**Event pills** — make more compact and readable:
```tsx
<button
  key={entry.id}
  onClick={() => onItemClick?.(entry.id)}
  className="w-full text-left text-xs px-1.5 py-0.5 rounded transition-opacity hover:opacity-80"
  style={{
    backgroundColor: (entry.color || '#3B82F6') + '20',
    color: entry.color || '#3B82F6',
    borderLeft: `2px solid ${entry.color || '#3B82F6'}`,
  }}
>
  <div className="truncate font-medium">{entry.title}</div>
</button>
```

**Loading skeleton** — replace `<div className="text-center py-8">Loading...</div>` with:
```tsx
{isLoading ? (
  <div className="bg-card border border-border rounded-xl overflow-hidden">
    <div className="grid grid-cols-7 bg-muted/50 border-b border-border">
      {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
        <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground border-r border-border last:border-r-0">
          {day}
        </div>
      ))}
    </div>
    <div className="grid grid-cols-7">
      {[...Array(35)].map((_, i) => (
        <div key={i} className={`min-h-[100px] p-2 border-r border-b border-border ${i % 7 === 6 ? 'border-r-0' : ''}`}>
          <div className="w-5 h-3 bg-muted rounded animate-pulse mb-2" />
          {i % 3 === 0 && <div className="w-full h-4 bg-muted rounded animate-pulse" />}
        </div>
      ))}
    </div>
  </div>
) : (
  // existing grid...
)}
```

**Commit:**
```bash
git add components/calendar/CalendarView.tsx
git commit -m "refactor: restyle CalendarView with CSS variables and improved design"
```

---

## Task 7: Restyle `CalendarAgenda` component

**Files:**
- Modify: `components/calendar/CalendarAgenda.tsx`

**What to change:**

**Filter section:**
```tsx
{/* was: bg-white dark:bg-gray-800 p-4 rounded-lg shadow */}
<div className="bg-card border border-border rounded-xl p-4">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* inputs: add bg-background border-border rounded-lg */}
    <input
      ...
      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
```

**List container:**
```tsx
{/* was: bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden */}
<div className="bg-card border border-border rounded-xl overflow-hidden">
  {/* was: divide-y dark:divide-gray-700 */}
  <div className="divide-y divide-border">
```

**List items:**
```tsx
{/* was: hover:bg-gray-50 dark:hover:bg-gray-700/50 */}
className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
```

**Text colors:**
- `text-gray-600 dark:text-gray-400` → `text-muted-foreground`
- `text-gray-500 dark:text-gray-400` → `text-muted-foreground`

**Pagination:**
```tsx
{/* was: border-t dark:border-gray-700 */}
<div className="p-4 border-t border-border flex items-center justify-between">
  {/* pagination text: text-muted-foreground */}
  {/* buttons: border border-border hover:bg-muted rounded-lg */}
```

**Loading state:**
```tsx
{isLoading ? (
  <div className="bg-card border border-border rounded-xl divide-y divide-border">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="p-4 flex gap-4">
        <div className="w-1 rounded bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-muted rounded animate-pulse w-2/3" />
          <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
        </div>
      </div>
    ))}
  </div>
) : (
  // existing list...
)}
```

**Empty state:**
```tsx
{data?.data.length === 0 && (
  <div className="p-12 text-center">
    <svg className="w-10 h-10 text-muted-foreground mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <p className="text-muted-foreground text-sm">Tidak ada item kalender untuk periode ini</p>
  </div>
)}
```

**Commit:**
```bash
git add components/calendar/CalendarAgenda.tsx
git commit -m "refactor: restyle CalendarAgenda with CSS variables and skeleton loading"
```

---

## Task 8: Restyle `CalendarInvites` component

**Files:**
- Modify: `components/calendar/CalendarInvites.tsx`

**What to change:**

**Pending invite cards:**
```tsx
{/* was: bg-white dark:bg-gray-800 border-l-4 border-yellow-500 rounded-lg shadow */}
<div className="bg-card border border-border border-l-4 border-l-yellow-500 rounded-xl p-4">
```

**Text colors:**
- `text-gray-600 dark:text-gray-400` → `text-muted-foreground`
- `text-gray-500 dark:text-gray-400` → `text-muted-foreground`

**Accept/Decline buttons** — keep semantic colors, just clean up:
```tsx
<div className="flex flex-col sm:flex-row gap-2 mt-3">
  <button
    onClick={() => handleRespond(invite.id, CalendarInviteStatus.ACCEPTED)}
    disabled={respondingId === invite.id}
    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
  >
    {respondingId === invite.id ? 'Memproses...' : 'Terima'}
  </button>
  <button
    onClick={() => handleRespond(invite.id, CalendarInviteStatus.DECLINED)}
    disabled={respondingId === invite.id}
    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 text-sm font-medium transition-colors text-muted-foreground"
  >
    {respondingId === invite.id ? 'Memproses...' : 'Tolak'}
  </button>
</div>
```

Note: "Tolak" changed from red-filled to neutral border button — declining is less destructive than it looks, no need for red.

**History items:**
```tsx
{/* was: bg-white dark:bg-gray-800 rounded-lg shadow */}
<div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
```

**Loading state:**
```tsx
{isLoading ? (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-card border border-border rounded-xl p-4">
        <div className="h-5 bg-muted rounded animate-pulse w-1/2 mb-2" />
        <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
      </div>
    ))}
  </div>
) : (
  // existing content...
)}
```

**Empty state:**
```tsx
{myInvites.length === 0 && (
  <div className="text-center py-12">
    <svg className="w-10 h-10 text-muted-foreground mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
    <p className="text-muted-foreground text-sm">Tidak ada undangan kalender</p>
  </div>
)}
```

**Commit:**
```bash
git add components/calendar/CalendarInvites.tsx
git commit -m "refactor: restyle CalendarInvites with CSS variables"
```

---

## Task 9: Restyle `CalendarItemDetail` modal

**Files:**
- Modify: `components/calendar/CalendarItemDetail.tsx`

**What to change:**

**Modal backdrop + container:**
```tsx
{/* was: bg-white dark:bg-gray-800 rounded-lg shadow-xl */}
<div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full mx-4 my-8">
```

**Header section:**
```tsx
{/* was: border-b dark:border-gray-700 */}
<div className="p-6 border-b border-border">
  {/* Type badge: bg-primary/10 text-primary instead of bg-blue-100 text-blue-800 */}
  <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
    {getTypeLabel(item.type)}
  </span>
  {/* Visibility badge: bg-muted text-muted-foreground */}
  <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
    {item.visibility}
  </span>
  {/* Close button */}
  <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
```

**Content text:**
- `text-gray-600 dark:text-gray-400` → `text-muted-foreground`
- `text-gray-500 dark:text-gray-400` → `text-muted-foreground`
- `text-gray-500` → `text-muted-foreground`

**Invite list items:**
```tsx
{/* was: bg-gray-50 dark:bg-gray-700/50 */}
<div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
```

**Timestamps section:**
```tsx
{/* was: border-t dark:border-gray-700 */}
<div className="text-xs text-muted-foreground pt-4 border-t border-border space-y-1">
```

**Invite form section:**
```tsx
{/* was: border-t dark:border-gray-700 */}
<div className="border-t border-border px-6 pt-5 pb-2">
  {/* Toggle button: text-primary hover:underline */}
  {/* Input: bg-background border-border rounded-lg */}
  {/* Add button: bg-muted hover:bg-muted/80 */}
  {/* Email chip: bg-muted/50 rounded-lg */}
  {/* Submit button: bg-primary text-primary-foreground (was bg-blue-600) */}
  <button
    onClick={handleInviteSubmit}
    ...
    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
  >
```

**Actions footer:**
```tsx
{/* was: border-t dark:border-gray-700 */}
<div className="p-6 border-t border-border flex justify-end gap-2">
  {onEdit && (
    <button className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
      Edit
    </button>
  )}
  {onDelete && (
    <button className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
      Hapus
    </button>
  )}
  <button className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
    Tutup
  </button>
</div>
```

**Loading/error states inside modal:**
```tsx
// Replace bg-white dark:bg-gray-800 with bg-card border border-border
// Replace bg-gray-200 dark:bg-gray-700 buttons with border border-border hover:bg-muted
```

**Commit:**
```bash
git add components/calendar/CalendarItemDetail.tsx
git commit -m "refactor: restyle CalendarItemDetail modal with CSS variables"
```

---

## Task 10: Update `app/(protected)/calendar/my/page.tsx`

**Files:**
- Modify: `app/(protected)/calendar/my/page.tsx`

**What to change:**

1. Remove `ProtNavigation` import and render (if not already done by frontend-refactor plan)
2. Remove outer `<div className="min-h-screen bg-background">` and `<main>` wrapper
3. Fix all hardcoded colors

**Header button:**
```tsx
{/* was: bg-blue-600 text-white rounded hover:bg-blue-700 */}
<button
  onClick={() => setShowForm(true)}
  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
>
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
  Buat Jadwal Baru
</button>
```

**Schedule list container:**
```tsx
{/* was: bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden */}
<div className="bg-card border border-border rounded-xl overflow-hidden">
  {/* was: divide-y dark:divide-gray-700 */}
  <div className="divide-y divide-border">
```

**Schedule items:**
```tsx
{/* was: hover:bg-gray-50 dark:hover:bg-gray-700/50 */}
<div className="p-4 hover:bg-muted/30 transition-colors">
  {/* Visibility badge: bg-muted text-muted-foreground */}
  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
    {schedule.visibility}
  </span>
  {/* Text: text-muted-foreground */}
  {/* Action buttons: */}
  <button className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-muted transition-colors">Detail</button>
  <button className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-muted transition-colors">Edit</button>
  <button
    onClick={() => { if (confirm('Yakin ingin menghapus?')) remove(schedule.id); }}
    className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
  >
    Hapus
  </button>
```

**Empty state:**
```tsx
{schedules.length === 0 && (
  <div className="p-12 text-center">
    <svg className="w-10 h-10 text-muted-foreground mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <p className="text-muted-foreground text-sm mb-4">Belum ada jadwal pribadi</p>
    <button
      onClick={() => setShowForm(true)}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
    >
      + Buat Jadwal Baru
    </button>
  </div>
)}
```

**Loading state:**
```tsx
{isLoading ? (
  <div className="bg-card border border-border rounded-xl divide-y divide-border">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="p-4 flex gap-4">
        <div className="w-1 rounded bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-muted rounded animate-pulse w-1/2" />
          <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
        </div>
      </div>
    ))}
  </div>
) : (
  // schedule list...
)}
```

**Modal container:**
```tsx
{/* was: bg-white dark:bg-gray-800 */}
<div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
  <div className="p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold">
        {editingItem ? 'Edit Jadwal' : 'Buat Jadwal Baru'}
      </h2>
      <button
        onClick={() => { setShowForm(false); setEditingItem(null); }}
        className="text-muted-foreground hover:text-foreground"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <CalendarItemForm ... />
  </div>
</div>
```

**Commit:**
```bash
git add "app/(protected)/calendar/my/page.tsx"
git commit -m "refactor: restyle calendar/my page with CSS variables"
```

---

## Task 11: Update `app/(protected)/calendar/invites/page.tsx`

**Files:**
- Modify: `app/(protected)/calendar/invites/page.tsx`

**What to change:**

1. Remove `ProtNavigation` import and render (if not already done)
2. Remove outer wrapper divs (layout provides them)
3. Fix `text-gray-600 dark:text-gray-400` → `text-muted-foreground`
4. Remove breadcrumb

Final page structure:
```tsx
export default function CalendarInvitesPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Undangan Kalender</h1>
        <p className="text-muted-foreground">
          Kelola undangan jadwal dan acara yang diterima
        </p>
      </div>
      <CalendarInvites />
    </>
  );
}
```

**Commit:**
```bash
git add "app/(protected)/calendar/invites/page.tsx"
git commit -m "refactor: clean up calendar/invites page"
```

---

## Task 12: Final verification

Run through this checklist manually:

- [ ] `/calendar` — AppNavbar + CalendarTabBar, segmented control Kalender/Agenda works
- [ ] `/calendar` (grid) — month navigation dengan tombol "Hari ini", hari ini highlighted dengan dot primary, event pills berwarna dari data
- [ ] `/calendar` (agenda) — filter card clean, list items pakai `bg-card`, skeleton loading muncul
- [ ] `/calendar/my` — tab Jadwal Saya hanya muncul saat login, list jadwal clean, empty state dengan CTA
- [ ] `/calendar/invites` — tab Undangan hanya muncul saat login, pending cards dengan border kuning, accept/decline buttons proper
- [ ] Dark mode — semua halaman kalender ikut theme
- [ ] Modal (`CalendarItemDetail`) — tampil di atas backdrop, semua warna ikut theme
- [ ] Mobile — tab bar scroll horizontal, layout tidak break

**Final commit:**
```bash
git add .
git commit -m "feat: calendar refactor complete — unified styling and navigation"
```
