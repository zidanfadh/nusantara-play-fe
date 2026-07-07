# Task 3 Report: Move Menu and Event Browsing Routes Out of Protected Group

## Status

Completed.

## Requirements Checked

1. Moved `app/(protected)/menu/page.tsx` to `app/menu/page.tsx`.
2. Moved `app/(protected)/events/page.tsx` to `app/events/page.tsx`.
3. Moved `app/(protected)/events/[id]/page.tsx` to `app/events/[id]/page.tsx`.
4. Updated menu private cards so:
   - Marketplace points to `/login?redirectTo=/marketplace`
   - Sertifikat points to `/login?redirectTo=/sertifikat`
5. Preserved public browse URLs:
   - `/menu`
   - `/events`
   - `/events/[id]`
6. Updated event detail guest CTA to send unauthenticated users to `/login?redirectTo=/events/${eventId}`.
7. Verified the protected browse route files no longer exist.
8. Ran focused lint on touched files.
9. Created a commit in the frontend worktree.

## Files Changed

- `app/menu/page.tsx`
- `app/events/page.tsx`
- `app/events/[id]/page.tsx`
- deleted `app/(protected)/menu/page.tsx`
- deleted `app/(protected)/events/page.tsx`
- deleted `app/(protected)/events/[id]/page.tsx`

## Implementation Notes

- Menu public card redirects were updated at:
  - `app/menu/page.tsx:118`
  - `app/menu/page.tsx:145`
- Event list route is now public at `app/events/page.tsx`.
- Event detail guest registration CTA now shows:
  - login redirect CTA for guests at `app/events/[id]/page.tsx:338`
  - existing registered state for signed-in attendees
  - existing register button for signed-in eligible attendees

## Verification

### Duplicate protected browse files removed

Commands run:

```powershell
Test-Path -LiteralPath 'app/(protected)/menu/page.tsx'
Test-Path -LiteralPath 'app/(protected)/events/page.tsx'
Test-Path -LiteralPath 'app/(protected)/events/[id]/page.tsx'
```

Observed output:

```text
False
False
False
```

### Focused lint

Command run:

```powershell
pnpm exec eslint app/menu/page.tsx app/events/page.tsx "app/events/[id]/page.tsx"
```

Observed result:

```text
Exit code 0
```

## Commit

- `feat(routes): expose menu and event browsing to guests`

## Self-Review

- Route ownership stayed within the requested files.
- Public URLs are preserved exactly as required.
- Marketplace and Sertifikat remain gated through login redirects until later tasks.
- Event management routes under `(protected)` were left in place.
- No issues found in the final diff after focused lint passed.
