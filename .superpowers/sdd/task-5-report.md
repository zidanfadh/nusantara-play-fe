# Task 5 Report: Make Calendar Public Detail Guest-Safe

## Status

Completed.

## Scope

- Updated `components/calendar/CalendarItemDetail.tsx`
- Inspected `components/calendar/CalendarTabBar.tsx` and left it unchanged

## What changed

### `components/calendar/CalendarItemDetail.tsx`

- Imported `useCurrentUser` and read `user` from the hook.
- Guarded invite refetch inside the detail modal effect so guests only refetch the public item detail and do not call protected invite endpoints.
- Hid the invite list for guests.
- Hid the inline invite form for guests.
- Removed the unused `invites` destructure from `useItemInvites` while preserving the existing authenticated invite flow.

### `components/calendar/CalendarTabBar.tsx`

No code change was needed. The component already reads `user` from `useCurrentUser()` and wraps the personal tabs (`/calendar/my` and `/calendar/invites`) in `{user && (...)}`, so guests already only see the public calendar tab.

## Verification

Focused lint requested by the task passed:

```bash
pnpm exec eslint components/calendar/CalendarItemDetail.tsx components/calendar/CalendarTabBar.tsx
```

## Self-review

- Guest path: no invite refetch is triggered from the item detail effect when `user` is `null`.
- Guest UI: invite list and invite form are both hidden.
- Authenticated path: invite refetch still runs, and invite UI remains available for signed-in users.
- Change stayed within the requested ownership boundary; only `CalendarItemDetail.tsx` was edited.

## Notes / Concerns

- I did not run global lint because the task explicitly called for focused lint and the repo baseline already has unrelated lint failures.
- There is no existing component test harness in this worktree for this modal; verification for this task is focused lint plus code review of the guarded guest/authenticated paths.
