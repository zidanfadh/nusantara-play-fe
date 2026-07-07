## Task 5: Make Calendar Public Detail Guest-Safe

**Files:**

- Modify: `components/calendar/CalendarItemDetail.tsx`
- Modify: `components/calendar/CalendarTabBar.tsx`

**Interfaces:**

- Consumes: Public calendar item detail endpoint.
- Produces: Guest calendar detail modal without invite API calls or invite UI.

- [ ] **Step 1: Import current user hook**

In `components/calendar/CalendarItemDetail.tsx`, add:

```ts
import { useCurrentUser } from '@/hooks/useCurrentUser';
```

Inside the component, add:

```ts
  const { user } = useCurrentUser();
```

- [ ] **Step 2: Avoid invite refetch for guests**

Replace:

```ts
  useEffect(() => {
    refetch();
    refetchInvites();
  }, [itemId]);
```

with:

```ts
  useEffect(() => {
    refetch();
    if (user) {
      refetchInvites();
    }
  }, [itemId, user]);
```

- [ ] **Step 3: Hide invite list and invite form from guests**

Replace invite list condition:

```tsx
          {item.invites && item.invites.length > 0 && (
```

with:

```tsx
          {user && item.invites && item.invites.length > 0 && (
```

Replace invite form condition:

```tsx
        {item.visibility !== 'public' && (
```

with:

```tsx
        {user && item.visibility !== 'public' && (
```

- [ ] **Step 4: Run frontend lint**

Run from `nusantara-play-frontend/`:

```bash
pnpm lint
```

Expected: PASS or only unrelated pre-existing warnings.

- [ ] **Step 5: Commit calendar guest changes**

Run from `nusantara-play-frontend/`:

```bash
git add components/calendar/CalendarItemDetail.tsx components/calendar/CalendarTabBar.tsx
git commit -m "feat(calendar): support guest public details"
```

