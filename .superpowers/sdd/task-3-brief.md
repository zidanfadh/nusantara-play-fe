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

