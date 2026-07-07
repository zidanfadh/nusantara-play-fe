## Task 4: Make PROT Public Browse UI Guest-Safe

**Files:**

- Modify: `app/prot/page.tsx`
- Modify: `app/prot/[id]/page.tsx`
- Modify: `components/prot/ProtTabBar.tsx`

**Interfaces:**

- Consumes: Backend public `GET /prot` and hardened `GET /prot/:id`.
- Produces: Guest-readable PROT list/detail with private actions hidden.

- [ ] **Step 1: Remove local auth redirect from PROT list**

In `app/prot/page.tsx`, remove these imports:

```ts
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
```

Remove these variables:

```ts
const router = useRouter();
const { user, isLoading: authLoading } = useAuth();
```

Replace them with:

```ts
import { useCurrentUser } from '@/hooks/useCurrentUser';
```

and inside the component:

```ts
const { user } = useCurrentUser();
```

- [ ] **Step 2: Remove guest redirect and auth-loading UI**

Delete the `useEffect` block that redirects to `/login?redirectTo=/prot`.

Delete the auth-loading and unauthenticated redirect render branches.

- [ ] **Step 3: Fetch data regardless of auth**

Replace:

```ts
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [filters, user]);
```

with:

```ts
  useEffect(() => {
    fetchData();
  }, [filters]);
```

- [ ] **Step 4: Gate create button by role**

Add:

```ts
  const canCreateProt =
    user && ['kurator_daerah', 'admin_kpoti'].includes(user.role);
```

Wrap the `Tambah Data Baru` link:

```tsx
            {canCreateProt && (
              <Link href="/prot/create" className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md font-medium shadow hover:bg-primary/90 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Data Baru
              </Link>
            )}
```

- [ ] **Step 5: Gate PROT detail actions**

In `app/prot/[id]/page.tsx`, replace the action booleans with:

```ts
  const canManageProt =
    user && ['kurator_daerah', 'admin_kpoti'].includes(user.role);
  const ownsProt = user && item.created_by === user.id;
  const canEditProt = Boolean(
    canManageProt &&
      isEditable &&
      (user?.role === 'admin_kpoti' || ownsProt)
  );
  const canSubmitProt = Boolean(
    canManageProt &&
      isSubmittable &&
      (user?.role === 'admin_kpoti' || ownsProt)
  );
  const isPublishable = item.status === PROTStatus.DIVERIFIKASI && user?.role === 'admin_kpoti';
  const isDeletable = user?.role === 'admin_kpoti';
```

Then replace usages:

```tsx
{isEditable && ( ... )}
{isSubmittable && ( ... )}
```

with:

```tsx
{canEditProt && ( ... )}
{canSubmitProt && ( ... )}
```

- [ ] **Step 6: Hide protected PROT history link from guests**

Wrap the history link with:

```tsx
              {user && (
                <Link
                  href={`/prot/${item.id}/history`}
                  className="px-3 py-2 bg-background border border-border text-foreground rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
                >
                  ...
                  History
                </Link>
              )}
```

- [ ] **Step 7: Run frontend lint**

Run from `nusantara-play-frontend/`:

```bash
pnpm lint
```

Expected: PASS or only unrelated pre-existing warnings.

- [ ] **Step 8: Commit PROT guest browsing changes**

Run from `nusantara-play-frontend/`:

```bash
git add app/prot/page.tsx app/prot/[id]/page.tsx components/prot/ProtTabBar.tsx
git commit -m "feat(prot): allow guest public browsing"
```

Use quoted paths in PowerShell for paths that contain parentheses or brackets.

