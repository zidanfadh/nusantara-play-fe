## Task 6: Full Verification

**Files:**

- No code files required unless verification exposes defects.

**Interfaces:**

- Consumes: All previous tasks.
- Produces: Verified frontend/backend builds and route behavior.

- [ ] **Step 1: Run backend targeted tests**

Run from `nusantara-play-backend/`:

```bash
npm test -- --testPathPattern=prot.service
```

Expected: PASS.

- [ ] **Step 2: Run backend build**

Run from `nusantara-play-backend/`:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run frontend lint**

Run from `nusantara-play-frontend/`:

```bash
pnpm lint
```

Expected: PASS or only unrelated pre-existing warnings that are documented in the final response.

- [ ] **Step 4: Run frontend build**

Run from `nusantara-play-frontend/`:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Manual guest route smoke test**

Start local services if not already running:

```bash
npm run start:dev
```

from `nusantara-play-backend/`, and:

```bash
pnpm dev
```

from `nusantara-play-frontend/`.

In a logged-out browser session, verify:

- `/menu` opens.
- `/prot` opens.
- `/events` opens.
- `/calendar` opens.
- `/profile` redirects to `/login?redirectTo=/profile`.
- `/login?redirectTo=/sertifikat` appears when opening the Sertifikat menu card as guest.
- Navbar shows guest UI and no logout/profile link.

- [ ] **Step 6: Final git status check**

Run from both repos:

```bash
git status --short
```

Expected: no unintended untracked or unstaged files. Any remaining changes should be intentional and reported.
