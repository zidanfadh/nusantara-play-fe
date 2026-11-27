# Local end-to-end run of the self-hosted login (Phase 29)

Checks the frontend with `NEXT_PUBLIC_AUTH_MODE=local` against the LOCAL backend, the LOCAL Docker database
and Mailpit. It is **not** part of `pnpm test` (it needs running servers and a browser). Everything stays on
`localhost` (the script refuses other URLs and blocks every non-local request); everything on disk goes to D:.
Never point it at production.

## One-time setup (Windows PowerShell)

```powershell
# playwright-core (no browser download; the installed Chrome is used), outside the repo, on D:
New-Item -ItemType Directory -Force D:\dev-cache\tools\pw | Out-Null
Set-Location D:\dev-cache\tools\pw
'{"name":"np-e2e-tools","private":true}' | Out-File -Encoding ascii package.json
$env:npm_config_cache = 'D:/dev-cache/npm'; npm install --no-audit --no-fund playwright-core@1.49.1
```

The backend needs its dev-only JWT keys in `nusantara-play-be\.env.local` (`npm run auth:generate-keys`, see the
backend CLAUDE.md "Local development").

## Run

Three PowerShell windows, upper-case `D:\` paths (Phase 13 finding):

```powershell
# 1. Database + Mailpit, schema, backend build
Set-Location 'D:\Project\Nusantara Legacy\nusantara-play-be'
$env:npm_config_cache = 'D:/dev-cache/npm'; $env:TEMP = 'D:/dev-cache/tmp'; $env:TMP = 'D:/dev-cache/tmp'
npm run db:up; npm run db:setup; npm run build
powershell -ExecutionPolicy Bypass -File '..\nusantara-play-fe\tests\e2e-local\start-backend.ps1'   # port 3000, token TTL 20 s

# 2. Frontend: production build in local mode, then next start on port 3001
Set-Location 'D:\Project\Nusantara Legacy\nusantara-play-fe'
powershell -ExecutionPolicy Bypass -File tests\e2e-local\start-frontend.ps1          # -SkipBuild to reuse .next

# 3. The run (about 6 minutes; screenshots in D:\dev-cache\screens\phase-29\)
Set-Location 'D:\Project\Nusantara Legacy\nusantara-play-fe'
node tests\e2e-local\auth-local.e2e.mjs              # all scenarios + screenshots
node tests\e2e-local\auth-local.e2e.mjs --only=2,6   # some scenarios, no screenshots
node tests\e2e-local\auth-local.e2e.mjs --screens-only
```

If port 3000 or 3001 is taken, do not stop the other process: pass `-Port` / `-FrontendPort` to
`start-backend.ps1`, `-Port` / `-BackendPort` to `start-frontend.ps1`, and set `E2E_FRONTEND` for the script.
Other variables: `E2E_MAILPIT`, `E2E_DB_CONTAINER`, `E2E_DB_NAME` (must end in `_dev` or `_test`), `E2E_CHROME`,
`E2E_SCREENS`, `E2E_TOKEN_TTL_SECONDS` (= the backend's `ACCESS_TOKEN_TTL_SECONDS`), `PLAYWRIGHT_CORE_DIR`.

## What it checks

1. Sign up → Mailpit → verify (success, then "sudah dipakai") → sign in → lands on `/jelajah` through `redirectTo`;
   cookies host-only (`np_refresh` httpOnly on `/backend-api/auth`, `np_logged_in` on `/`), no token in storage.
2. Five wrong passwords → "Terlalu banyak percobaan. Coba lagi dalam 15 menit."; an unknown email gets the same answers.
3. Forgot password (pre-filled) → Mailpit → reset → sign in; the old password and the other browser's session are rejected.
4. A Supabase-only user inserted into the LOCAL dev DB → legacy hint → reset → sign in (local credentials created).
5. Short access-token TTL → proactive refreshes; a refused token → one refresh, one retry, no logout.
6. Two tabs: sign-in picked up, simultaneous refresh (held and released together) → no logout, sign-out propagates.
7. Unverified user → profile message + resend (new email in Mailpit); 403 `EMAIL_NOT_VERIFIED` → notice. No backend
   route uses `@RequireVerifiedEmail()` yet, so that one answer is produced by the script in the backend's shape.
8. Jelajah gate and notice, `/main` public, a forged `np_logged_in` cookie is only a hint, role matrix
   (publik, kurator_daerah, pakar, admin_kpoti).
9. Screenshots of every auth page and message, 390x844 and 1440x900, light and dark (backend answers for the
   rare states are produced by the script).

Supabase mode (the default) is checked by `pnpm test` and the production build comparison (Phase 29 report).
Test accounts use `e2e-<run>-<name>@example.test` and stay in the dev database (`npm run db:reset -- --yes` clears it).
