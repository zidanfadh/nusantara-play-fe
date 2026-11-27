#!/usr/bin/env node
/**
 * Phase 29: end-to-end run of the self-hosted login in the frontend (NEXT_PUBLIC_AUTH_MODE=local) against the
 * LOCAL backend, the LOCAL Docker database and Mailpit. NOT part of `pnpm test`. Setup and usage:
 * tests/e2e-local/README.md.
 *
 *   node tests/e2e-local/auth-local.e2e.mjs [--only=1,3] [--no-screens] [--screens-only]
 *
 * Every URL must be on localhost (checked). Accounts are created for each run with *@example.test addresses.
 * Nothing secret is printed: no tokens, passwords or email contents (only pass/fail lines and counts).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

// ------------------------------------------------------------------------------------------------ config
const env = (name, fallback) => process.env[name] ?? fallback;
const FRONTEND = env('E2E_FRONTEND', 'http://localhost:3001');
const MAILPIT = env('E2E_MAILPIT', 'http://localhost:8025');
const DB_CONTAINER = env('E2E_DB_CONTAINER', 'nusantara-dev-db');
const DB_NAME = env('E2E_DB_NAME', 'nusantara_play_dev');
const CHROME = env('E2E_CHROME', 'C:/Program Files/Google/Chrome/Application/chrome.exe');
const SCREENS = env('E2E_SCREENS', 'D:/dev-cache/screens/phase-29');
const SCRATCH = env('E2E_SCRATCH', 'D:/dev-cache/tmp/phase-29/e2e');
const PW_DIR = env('PLAYWRIGHT_CORE_DIR', 'D:/dev-cache/tools/pw');
/** Must match the backend's ACCESS_TOKEN_TTL_SECONDS (start-backend.ps1 default). */
const TOKEN_TTL_S = Number(env('E2E_TOKEN_TTL_SECONDS', '20'));

for (const url of [FRONTEND, MAILPIT]) {
  const host = new URL(url).hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') throw new Error(`Refusing to run against a non-local URL: ${url}`);
}
if (!/_(dev|test)$/.test(DB_NAME)) throw new Error('Refusing to touch a database that is not a local _dev/_test one');

const args = process.argv.slice(2);
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean).map(Number);
const wantScreens = !args.includes('--no-screens');
const screensOnly = args.includes('--screens-only');

const require = createRequire(join(PW_DIR, 'package.json'));
const { chromium } = require('playwright-core');

mkdirSync(SCREENS, { recursive: true });
mkdirSync(SCRATCH, { recursive: true });

const RUN = `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
const PASSWORD = `Rahasia-${RUN}-lama`;
const NEW_PASSWORD = `Rahasia-${RUN}-baru`;
const email = (name) => `e2e-${RUN}-${name}@example.test`;

// ------------------------------------------------------------------------------------------------ helpers
const results = [];
let current = '';
function check(condition, label) {
  results.push({ scenario: current, label, ok: Boolean(condition) });
  console.log(`  ${condition ? 'PASS' : 'FAIL'}  ${label}`);
  return Boolean(condition);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sql(query) {
  return execFileSync('docker', ['exec', '-i', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', DB_NAME, '-v', 'ON_ERROR_STOP=1', '-tAc', query], {
    encoding: 'utf8',
  }).trim();
}
/** Only generated e2e addresses reach SQL (no user input); quoted anyway. */
const lit = (value) => `'${String(value).replace(/'/g, "''")}'`;

const mail = {
  seen: new Set(),
  async list(to) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=50`);
    if (!res.ok) throw new Error(`Mailpit search ${res.status}`);
    return (await res.json()).messages ?? [];
  },
  async count(to) {
    return (await this.list(to)).length;
  },
  /** Waits for a NEW email to `to` that contains a link to `path` and returns that link. */
  async link(to, path, timeoutMs = 20_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      for (const message of await this.list(to)) {
        if (this.seen.has(message.ID)) continue;
        const full = await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
        const match = new RegExp(`${FRONTEND.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}${path}\\?token=[A-Za-z0-9_-]+`).exec(full.Text ?? '');
        if (match) {
          this.seen.add(message.ID);
          return match[0];
        }
      }
      await sleep(500);
    }
    throw new Error(`no email with ${path} arrived`);
  },
};

let browser;
const contexts = [];
async function newContext({ width = 1440, height = 900, theme = 'light', mobile = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: 'reduce',
  });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('theme', t);
      // Skip the Jelajah intros: they are not what this run checks.
      localStorage.setItem('jelajah.bumperLastPlayed.v1', new Date().toISOString().slice(0, 10));
      localStorage.setItem('np_concept_seen_v1', '1');
    } catch {}
  }, theme);
  // Nothing may leave localhost.
  await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());
  contexts.push(ctx);
  return ctx;
}

/** Records auth/API traffic of a page (status per path) and page errors. */
function watch(page) {
  const log = [];
  page.on('response', (res) => {
    const url = new URL(res.url());
    if (url.pathname.startsWith('/backend-api/')) log.push({ path: url.pathname, status: res.status(), method: res.request().method() });
  });
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return { log, errors };
}

async function shot(page, name) {
  if (!wantScreens) return;
  await page.screenshot({ path: join(SCREENS, `${name}.png`), fullPage: true });
}

/**
 * Waits until the page URL matches (RegExp on the full URL, or a predicate on URL). Polls the URL instead of
 * waiting for the load event: the Jelajah pages keep loading 3D assets long after the redirect.
 */
async function waitUrl(page, matcher, { timeout = 20_000 } = {}) {
  const deadline = Date.now() + timeout;
  const ok = () => {
    const url = new URL(page.url());
    return matcher instanceof RegExp ? matcher.test(url.href) : matcher(url);
  };
  while (Date.now() < deadline) {
    if (ok()) return;
    await sleep(200);
  }
  throw new Error(`URL did not match within ${timeout} ms (now ${new URL(page.url()).pathname})`);
}

const go = (page, path) => page.goto(`${FRONTEND}${path}`, { waitUntil: 'domcontentloaded' });

/** Fills a controlled input after hydration (a value typed before it would be reset by React). */
async function fillStable(page, selector, value) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.locator(selector).fill(value);
    await sleep(150);
    if ((await page.locator(selector).inputValue()) === value) return;
    await page.waitForLoadState('load').catch(() => {});
  }
  throw new Error(`could not fill ${selector}`);
}

async function login(page, address, password, { from = '/login' } = {}) {
  if (from) {
    await go(page, from);
    await page.waitForLoadState('load').catch(() => {});
  }
  await fillStable(page, '#email', address);
  await fillStable(page, '#password', password);
  await page.locator('form button[type="submit"]').click();
}

async function register(page, name, address, password = PASSWORD, from = '/signup') {
  await go(page, from);
  await page.waitForLoadState('load').catch(() => {});
  await fillStable(page, '#fullName', name);
  await fillStable(page, '#email', address);
  await fillStable(page, '#password', password);
  await fillStable(page, '#confirmPassword', password);
  await page.locator('form button[type="submit"]').click();
  await waitUrl(page, /\/cek-email/, { timeout: 15_000 });
}

/** Registers and verifies an account through the UI + Mailpit (fresh context, closed afterwards). */
async function verifiedAccount(name) {
  const ctx = await newContext();
  const page = await ctx.newPage();
  const address = email(name);
  await register(page, `E2E ${name}`, address);
  const state = await verifyByLink(page, await mail.link(address, '/verify-email'));
  if (state !== 'success') throw new Error(`verification of a test account ended in "${state}"`);
  await ctx.close();
  return address;
}

async function verifyByLink(page, link) {
  await page.goto(link, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-verify-state]:not([data-verify-state="loading"])').waitFor({ timeout: 15_000 });
  return page.locator('[data-verify-state]').getAttribute('data-verify-state');
}

async function storageHasJwt(page) {
  return page.evaluate(() => {
    const values = [];
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i += 1) values.push(store.getItem(store.key(i)) ?? '');
    }
    return values.some((v) => /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./.test(v));
  });
}

async function accountMenuName(page) {
  const button = page.locator('button[aria-label^="Menu akun"]').first();
  await button.waitFor({ timeout: 15_000 });
  return button.getAttribute('aria-label');
}

// ------------------------------------------------------------------------------------------------ scenarios
const scenarios = {
  async 1() {
    current = '1 sign up → verify → sign in → /jelajah';
    const ctx = await newContext();
    const page = await ctx.newPage();
    const { log } = watch(page);
    const address = email('signup');

    await go(page, '/jelajah');
    await waitUrl(page, /\/login\?/);
    check(page.url().endsWith('/login?redirectTo=%2Fjelajah&reason=jelajah'), 'logged out /jelajah → /login?redirectTo=%2Fjelajah&reason=jelajah');
    check(await page.locator('[data-login-notice="jelajah"]').isVisible(), 'Jelajah login notice shown');
    check((await page.locator('text=Masuk sebagai Tamu').count()) === 0, 'no "Masuk sebagai Tamu" for the Jelajah login');
    check((await page.locator('text=Masuk dengan Google').count()) === 0, 'no Google button in local mode');

    await page.locator('a', { hasText: 'Daftar sekarang' }).click();
    await waitUrl(page, /\/signup\?redirectTo=%2Fjelajah&reason=jelajah/);
    await fillStable(page, '#fullName', 'E2E Daftar');
    await fillStable(page, '#email', address);
    await fillStable(page, '#password', 'pendek');
    check((await page.locator('[data-rule="min"][data-ok="false"]').count()) === 1, 'password rules visible before submit (min not met)');
    await fillStable(page, '#password', PASSWORD);
    await fillStable(page, '#confirmPassword', PASSWORD);
    check((await page.locator('[data-rule][data-ok="true"]').count()) === 3, 'all three rules met');
    await page.locator('form button[type="submit"]').click();
    await waitUrl(page, /\/cek-email\?redirectTo=%2Fjelajah&reason=jelajah/);
    check(await page.locator('h1', { hasText: 'Cek email kamu' }).isVisible(), '"Cek email kamu" page after sign-up');

    const link = await mail.link(address, '/verify-email');
    check(link.startsWith(`${FRONTEND}/verify-email?token=`), 'verification email links to {APP_PUBLIC_URL}/verify-email?token=…');
    check((await verifyByLink(page, link)) === 'success', 'verify-email landing: success');
    check(!page.url().includes('token='), 'the token is removed from the address bar');
    check((await verifyByLink(page, link)) === 'used', 'the same link again: "sudah dipakai"');

    await login(page, address, PASSWORD, { from: '/login?redirectTo=%2Fjelajah&reason=jelajah' });
    await waitUrl(page, (u) => u.pathname === '/jelajah', { timeout: 20_000 });
    check(new URL(page.url()).pathname === '/jelajah', 'sign-in lands on /jelajah via redirectTo');

    const cookies = (await ctx.cookies()).filter((c) => c.domain === new URL(FRONTEND).hostname);
    const refresh = cookies.find((c) => c.name === 'np_refresh');
    const hint = cookies.find((c) => c.name === 'np_logged_in');
    check(refresh && refresh.httpOnly && refresh.path === '/backend-api/auth' && !refresh.domain.startsWith('.'), 'np_refresh: httpOnly, Path=/backend-api/auth, host-only on the frontend origin');
    check(hint && hint.value === '1' && !hint.httpOnly && hint.path === '/', 'np_logged_in=1: readable, Path=/');
    check(!(await storageHasJwt(page)), 'no access token in localStorage or sessionStorage');
    check(log.some((r) => r.path === '/backend-api/auth/login' && r.status === 200), 'login went through same-origin /backend-api/auth/login');
    await ctx.close();
  },

  async 2() {
    current = '2 five wrong passwords → lockout message';
    const ctx = await newContext();
    const page = await ctx.newPage();
    const address = await verifiedAccount('lockout');
    await go(page, '/login');
    const messages = [];
    for (let i = 1; i <= 5; i += 1) {
      await login(page, address, `falsch-${i}-passwort`, { from: null });
      await page.locator('[data-login-error]').waitFor();
      await sleep(300);
      messages.push(await page.locator('[data-login-error]').getAttribute('data-login-error'));
      if (i === 1) {
        check((await page.locator('[data-login-error]').innerText()).includes('Email atau kata sandi salah.'), '1st wrong password: "Email atau kata sandi salah."');
        check(await page.locator('[data-legacy-hint]').isVisible(), 'legacy hint shown with the invalid-credentials error');
      }
    }
    check(messages.slice(0, 4).every((m) => m === 'invalid_credentials'), 'attempts 1 to 4: invalid credentials');
    const text = await page.locator('[data-login-error]').innerText();
    check(messages[4] === 'locked' && /Terlalu banyak percobaan\. Coba lagi dalam 15 menit\./.test(text), '5th: "Terlalu banyak percobaan. Coba lagi dalam 15 menit."');
    await login(page, address, PASSWORD, { from: null });
    await sleep(800);
    check((await page.locator('[data-login-error="locked"]').count()) === 1, 'even the correct password is refused while locked');
    // An unknown email gets the same sequence (no account revealed).
    const unknown = [];
    await go(page, '/login');
    for (let i = 1; i <= 5; i += 1) {
      await login(page, email('nobody'), `falsch-${i}`, { from: null });
      await sleep(600);
      unknown.push(await page.locator('[data-login-error]').getAttribute('data-login-error'));
    }
    check(JSON.stringify(unknown) === JSON.stringify(messages), 'an unknown email gets exactly the same messages');
    await ctx.close();
  },

  async 3() {
    current = '3 forgot → reset → sign in; old sessions rejected';
    const address = await verifiedAccount('reset');
    const old = await newContext();
    const oldPage = await old.newPage();
    await login(oldPage, address, PASSWORD);
    await waitUrl(oldPage, (u) => u.pathname === '/menu');
    await go(oldPage, '/profile');
    await oldPage.locator('[data-account-security]').waitFor({ timeout: 15_000 });
    check(true, 'an existing session in another browser (/profile open)');

    const ctx = await newContext();
    const page = await ctx.newPage();
    await go(page, '/login');
    await fillStable(page, '#email', address);
    await page.locator('a', { hasText: 'Lupa kata sandi?' }).click();
    await waitUrl(page, /\/forgot-password$/);
    check((await page.locator('#forgot-email').inputValue()) === address, 'forgot-password is pre-filled from the login form (not via the URL)');
    await page.locator('form button[type="submit"]').click();
    await page.locator('[data-auth-page="forgot-password-sent"]').waitFor();
    check(await page.locator('[data-resend="password_reset"] [data-resend-wait]').isVisible(), 'resend shows its countdown');
    const link = await mail.link(address, '/reset-password');
    check(link.startsWith(`${FRONTEND}/reset-password?token=`), 'reset email links to {APP_PUBLIC_URL}/reset-password?token=…');
    await page.goto(link, { waitUntil: 'domcontentloaded' });
    await page.locator('#new-password').waitFor();
    check(await waitUrl(page, (u) => !u.search.includes('token='), { timeout: 10_000 }).then(() => true, () => false), 'the token is removed from the address bar');
    await fillStable(page, '#new-password', NEW_PASSWORD);
    await fillStable(page, '#confirm-new-password', NEW_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await page.locator('[data-auth-page="reset-password-done"]').waitFor();
    check(true, 'reset: "Kata sandi diperbarui"');

    await page.goto(link, { waitUntil: 'domcontentloaded' });
    await fillStable(page, '#new-password', `${NEW_PASSWORD}-2`);
    await fillStable(page, '#confirm-new-password', `${NEW_PASSWORD}-2`);
    await page.locator('form button[type="submit"]').click();
    await page.locator('[data-auth-page="reset-password-invalid"]').waitFor();
    check((await page.locator('[data-token-reason]').getAttribute('data-token-reason')) === 'used', 'the same reset link again: "sudah dipakai"');

    await login(page, address, PASSWORD);
    await page.locator('[data-login-error]').waitFor();
    check((await page.locator('[data-login-error]').getAttribute('data-login-error')) === 'invalid_credentials', 'the old password no longer works');
    await login(page, address, NEW_PASSWORD);
    await waitUrl(page, (u) => u.pathname === '/menu');
    check(true, 'sign-in with the new password');

    // The other browser's session was revoked by the reset: its next request ends at the login.
    await oldPage.reload({ waitUntil: 'domcontentloaded' });
    await waitUrl(oldPage, /\/login\?redirectTo=%2Fprofile/, { timeout: 20_000 });
    check(true, 'the old session is rejected → /login?redirectTo=%2Fprofile');
    await old.close();
    await ctx.close();
  },

  async 4() {
    current = '4 legacy (Supabase-only) account → legacy message → reset → sign in';
    const address = email('legacy');
    sql(`INSERT INTO users (supabase_user_id, email, full_name, role, status) VALUES (gen_random_uuid(), ${lit(address)}, 'E2E Akun Lama', 'publik', 'active')`);
    check(sql(`SELECT count(*) FROM user_credentials c JOIN users u ON u.id = c.user_id WHERE u.email = ${lit(address)}`) === '0', 'seeded a Supabase-only user in the LOCAL dev DB (no local password)');
    const ctx = await newContext();
    const page = await ctx.newPage();
    await login(page, address, 'kata-sandi-supabase-lama');
    await page.locator('[data-legacy-hint]').waitFor();
    check((await page.locator('[data-legacy-hint]').innerText()).includes('Akun lama? Atur kata sandi baru sekali lewat email'), 'login shows "Akun lama? Atur kata sandi baru sekali lewat email"');
    await page.locator('[data-legacy-hint] a').click();
    await waitUrl(page, /\/forgot-password\?legacy=1/);
    check((await page.locator('#forgot-email').inputValue()) === address, 'the legacy forgot-password flow is pre-filled');
    check(await page.locator('[data-auth-page="forgot-password-legacy"]').isVisible(), 'legacy explanation shown');
    await page.locator('form button[type="submit"]').click();
    await page.locator('[data-auth-page="forgot-password-sent"]').waitFor();
    const link = await mail.link(address, '/reset-password');
    await page.goto(link, { waitUntil: 'domcontentloaded' });
    await fillStable(page, '#new-password', NEW_PASSWORD);
    await fillStable(page, '#confirm-new-password', NEW_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await page.locator('[data-auth-page="reset-password-done"]').waitFor();
    await login(page, address, NEW_PASSWORD);
    await waitUrl(page, (u) => u.pathname === '/menu');
    check(true, 'the legacy account signs in with the self-hosted login');
    check(sql(`SELECT count(*) FROM user_credentials c JOIN users u ON u.id = c.user_id WHERE u.email = ${lit(address)} AND c.email_verified_at IS NOT NULL`) === '1', 'local credentials created, email marked verified');
    await ctx.close();
  },

  async 5() {
    current = `5 short access-token TTL (${TOKEN_TTL_S} s) → silent refresh and retry, no logout`;
    const address = await verifiedAccount('ttl');
    const ctx = await newContext();
    const page = await ctx.newPage();
    const { log } = watch(page);
    await login(page, address, PASSWORD);
    await waitUrl(page, (u) => u.pathname === '/menu');
    await go(page, '/profile');
    await page.locator('[data-account-security]').waitFor({ timeout: 15_000 });
    const refreshesBefore = log.filter((r) => r.path === '/backend-api/auth/refresh').length;
    // Proactive refresh: about half the lifetime before expiry for this short TTL.
    await sleep((TOKEN_TTL_S * 2 + 3) * 1000);
    const proactive = log.filter((r) => r.path === '/backend-api/auth/refresh' && r.status === 200).length - refreshesBefore;
    check(proactive >= 2, `proactive refresh while visible (${proactive} refreshes in ${TOKEN_TTL_S * 2 + 3} s)`);
    check(new URL(page.url()).pathname === '/profile', 'still on /profile after two token lifetimes (no logout)');

    // A token the server refuses (as an expired one): the first /users/me is sent with a bad token → 401 →
    // ONE refresh → ONE retry → 200.
    let rewritten = false;
    await page.route('**/backend-api/users/me', async (route) => {
      if (!rewritten) {
        rewritten = true;
        const headers = { ...route.request().headers(), authorization: 'Bearer expired.invalid.token' };
        return route.continue({ headers });
      }
      return route.continue();
    });
    const start = log.length;
    await go(page, '/profile');
    await page.locator('[data-account-security]').waitFor({ timeout: 15_000 });
    const after = log.slice(start);
    const me = after.filter((r) => r.path === '/backend-api/users/me').map((r) => r.status);
    check(me[0] === 401 && me.includes(200), `401 then retried with a fresh token (users/me statuses ${me.join(',')})`);
    check(after.some((r) => r.path === '/backend-api/auth/refresh' && r.status === 200), 'one silent refresh in between');
    check(new URL(page.url()).pathname === '/profile', 'no logout');
    await ctx.close();
  },

  async 6() {
    current = '6 two tabs: sign-out propagates, sign-in is picked up, simultaneous refresh → no logout';
    const address = await verifiedAccount('tabs');
    const ctx = await newContext();
    const a = await ctx.newPage();
    const b = await ctx.newPage();
    // Sign-in is picked up: b is on a public page with the navbar, signed out.
    await go(b, '/prot');
    await b.locator('button[aria-label="Menu akun"]').waitFor({ timeout: 15_000 });
    await login(a, address, PASSWORD);
    await waitUrl(a, (u) => u.pathname === '/menu');
    const nameInB = await accountMenuName(b).catch(() => '');
    check(/Menu akun E2E tabs/.test(nameInB ?? ''), 'tab B shows the signed-in user without a reload');

    // Simultaneous refresh: hold both refresh requests until both are in flight, then let them go together.
    const pending = [];
    let release;
    const both = new Promise((r) => (release = r));
    await ctx.route('**/backend-api/auth/refresh', async (route) => {
      pending.push(route);
      if (pending.length === 2) release();
      await Promise.race([both, sleep(5000)]);
      await route.continue();
    });
    const statuses = [];
    const record = (res) => {
      if (res.url().endsWith('/backend-api/auth/refresh')) statuses.push(res.status());
    };
    a.on('response', record);
    b.on('response', record);
    await Promise.all([go(a, '/profile'), go(b, '/profile')]);
    await Promise.all([
      a.locator('[data-account-security]').waitFor({ timeout: 20_000 }),
      b.locator('[data-account-security]').waitFor({ timeout: 20_000 }),
    ]);
    await ctx.unroute('**/backend-api/auth/refresh');
    check(statuses.includes(409) || statuses.filter((s) => s === 200).length >= 2, `both tabs refreshed at once (statuses ${statuses.join(',')})`);
    check(new URL(a.url()).pathname === '/profile' && new URL(b.url()).pathname === '/profile', 'simultaneous refresh: both tabs stay signed in');

    // Sign-out propagates: a signs out, b (protected page) goes to the login with its target.
    await a.locator('button[aria-label^="Menu akun"]').first().click();
    await a.locator('button', { hasText: 'Logout' }).click();
    await waitUrl(a, (u) => u.pathname === '/');
    check(true, 'tab A: after sign-out → /');
    await waitUrl(b, /\/login\?redirectTo=%2Fprofile/, { timeout: 15_000 });
    check(true, 'tab B followed: /login?redirectTo=%2Fprofile');
    check(!(await ctx.cookies(FRONTEND)).some((c) => c.name === 'np_logged_in'), 'np_logged_in cleared');
    await ctx.close();
  },

  async 7() {
    current = '7 unverified email: message + resend; EMAIL_NOT_VERIFIED notice';
    const ctx = await newContext();
    let page = await ctx.newPage();
    const address = email('unverified');
    await register(page, 'E2E Belum', address);
    await mail.link(address, '/verify-email'); // the first email (not used)
    await ctx.close();
    // A new browser: the sign-up tab still has its 60 s resend pause (sessionStorage), correctly.
    const ctx2 = await newContext();
    const page2 = await ctx2.newPage();
    page = page2;
    await login(page, address, PASSWORD);
    await waitUrl(page, (u) => u.pathname === '/menu');
    check(true, 'an unverified user may sign in (owner decision, Phase 09)');
    await go(page, '/profile');
    await page.locator('[data-testid="email-unverified"]').waitFor({ timeout: 15_000 });
    check(true, 'profile: "Email kamu belum diverifikasi."');
    const before = await mail.count(address);
    await page.locator('[data-account-security] [data-resend="verification"] button').click();
    await page.locator('[data-account-security] [data-resend-wait]').waitFor();
    check(true, 'resend: countdown shown');
    await mail.link(address, '/verify-email');
    check((await mail.count(address)) === before + 1, 'resend: a new verification email in Mailpit');

    // No route uses @RequireVerifiedEmail() yet (backend Phase 09): the 403 is answered by the test for one
    // request, exactly in the backend's shape, to check the frontend's handling.
    let once = false;
    await page.route('**/backend-api/users/me', (route) => {
      if (once) return route.continue();
      once = true;
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 403, code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email address to use this feature' }),
      });
    });
    await go(page, '/menu');
    await page.locator('[data-email-not-verified]').waitFor({ timeout: 15_000 });
    check(true, '403 EMAIL_NOT_VERIFIED → notice "Verifikasi email dulu" with resend');
    await shot(page, 'notice-email-not-verified-1440x900-light');
    await ctx.close();
  },

  async 8() {
    current = '8 Jelajah gate and notice, /main public, roles';
    const ctx = await newContext();
    const page = await ctx.newPage();
    await go(page, '/main');
    check(new URL(page.url()).pathname === '/main', '/main stays public (logged out)');
    await go(page, '/main/congklak');
    check(new URL(page.url()).pathname === '/main/congklak', '/main/congklak public');
    await go(page, '/jelajah/sumatera-selatan?debug=1');
    await waitUrl(page, /\/login\?/);
    check(page.url().endsWith('/login?redirectTo=%2Fjelajah%2Fsumatera-selatan%3Fdebug%3D1&reason=jelajah'), 'province page → login with target and reason');
    check(await page.locator('[data-login-guest-note]').isVisible(), 'Jelajah login: games note instead of the guest button');
    // A fake hint cookie alone does not make a session: the page ends at the login.
    await ctx.addCookies([{ name: 'np_logged_in', value: '1', url: FRONTEND }]);
    const refreshStatuses = [];
    page.on('response', (res) => {
      if (res.url().endsWith('/backend-api/auth/refresh')) refreshStatuses.push(res.status());
    });
    await go(page, '/jelajah');
    const gated = await waitUrl(page, /\/login\?redirectTo=%2Fjelajah&reason=jelajah/, { timeout: 20_000 }).then(
      () => true,
      () => false,
    );
    check(gated, `a forged np_logged_in cookie is only a hint: /jelajah still ends at the login (refresh ${refreshStatuses.join(',')})`);
    await ctx.close();

    // Roles: the same components and checks as supabase mode (role from GET /users/me).
    const expectations = {
      publik: { tambah: false, antrean: false, admin: false },
      kurator_daerah: { tambah: true, antrean: true, admin: false },
      pakar: { tambah: false, antrean: true, admin: false },
      admin_kpoti: { tambah: true, antrean: true, admin: true },
    };
    for (const [role, want] of Object.entries(expectations)) {
      const address = await verifiedAccount(`role-${role.replace('_', '-')}`);
      if (role !== 'publik') sql(`UPDATE users SET role = ${lit(role)} WHERE email = ${lit(address)}`);
      const c = await newContext();
      const p = await c.newPage();
      await login(p, address, PASSWORD);
      await waitUrl(p, (u) => u.pathname === '/menu');
      await go(p, '/prot');
      await p.locator('a', { hasText: 'Daftar PROT' }).first().waitFor({ timeout: 15_000 });
      await sleep(1500);
      const tambah = (await p.locator('a[href="/prot/create"]', { hasText: 'Tambah PROT' }).count()) > 0;
      const antrean = (await p.locator('a[href="/prot/verifikasi/queue"]').count()) > 0;
      await go(p, '/admin/dashboard');
      // The admin layout loads the user, then sends other roles to /unauthorized.
      await p.locator('text=Admin Panel').first().waitFor({ timeout: 20_000 }).catch(() => {});
      const admin = await waitUrl(p, (u) => u.pathname === '/unauthorized', { timeout: 6_000 }).then(
        () => false,
        () => new URL(p.url()).pathname === '/admin/dashboard',
      );
      check(tambah === want.tambah && antrean === want.antrean && admin === want.admin, `${role}: Tambah PROT ${tambah}, Antrean ${antrean}, /admin/dashboard ${admin}`);
      await c.close();
    }
  },
};

// ------------------------------------------------------------------------------------------------ screenshots
/**
 * Every auth page and message, 390x844 and 1440x900, light and dark. The states that need a backend answer
 * (verify success / used / expired / invalid, reset done / used, lockout, unverified profile) are produced
 * with route fulfilments in the backend's exact shapes; the real flows are checked by the scenarios above.
 */
async function screens() {
  current = 'screenshots';
  const json = (status, body) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const variants = [
    { width: 390, height: 844, mobile: true },
    { width: 1440, height: 900, mobile: false },
  ];
  let count = 0;
  const address = await verifiedAccount('screens');
  for (const theme of ['light', 'dark']) {
    for (const v of variants) {
      const tag = `${v.width}x${v.height}-${theme}`;
      const ctx = await newContext({ ...v, theme });
      const page = await ctx.newPage();
      const snap = async (name) => {
        await sleep(400);
        await shot(page, `${name}-${tag}`);
        count += 1;
      };
      await go(page, '/login');
      await snap('login');
      await go(page, '/login?redirectTo=%2Fjelajah&reason=jelajah');
      await snap('login-jelajah');
      await login(page, address, 'salah-sekali-saja', { from: null });
      await page.locator('[data-login-error]').waitFor();
      await snap('login-invalid-legacy-hint');
      await page.route('**/backend-api/auth/login', (r) =>
        r.fulfill({ ...json(429, { statusCode: 429, code: 'login_locked', retryAfterSeconds: 840, message: 'Too many failed login attempts. Try again later.' }), headers: { 'Retry-After': '840' } }),
      );
      await login(page, address, 'salah', { from: null });
      await page.locator('[data-login-error="locked"]').waitFor();
      await snap('login-lockout');
      await page.unroute('**/backend-api/auth/login');

      await go(page, '/signup?redirectTo=%2Fjelajah&reason=jelajah');
      await fillStable(page, '#fullName', 'Contoh Nama');
      await fillStable(page, '#email', 'contoh@example.test');
      await fillStable(page, '#password', 'pendek');
      await snap('signup-rules');
      await page.route('**/backend-api/auth/register', (r) => r.fulfill(json(201, { success: true, message: 'ok' })));
      await fillStable(page, '#password', 'cukup-panjang-123');
      await fillStable(page, '#confirmPassword', 'cukup-panjang-123');
      await page.locator('form button[type="submit"]').click();
      await waitUrl(page, /\/cek-email/);
      await snap('cek-email');
      // Right after signing up the resend button waits 60 s (the sign-up email counts): the countdown.
      await page.locator('[data-resend-wait]').waitFor();
      await snap('cek-email-resent-countdown');

      for (const [state, reply] of [
        ['success', json(200, { success: true, message: 'Email address verified.' })],
        ['used', json(400, { statusCode: 400, code: 'invalid_or_expired_token', reason: 'used', message: 'The link is invalid or has expired' })],
        ['expired', json(400, { statusCode: 400, code: 'invalid_or_expired_token', reason: 'expired', message: 'The link is invalid or has expired' })],
        ['invalid', json(400, { statusCode: 400, code: 'invalid_or_expired_token', reason: 'invalid', message: 'The link is invalid or has expired' })],
      ]) {
        await page.route('**/backend-api/auth/verify-email', (r) => r.fulfill(reply));
        await go(page, '/verify-email?token=contoh-token-untuk-tangkapan-layar');
        await page.locator(`[data-verify-state="${state}"]`).waitFor();
        await snap(`verify-email-${state}`);
        await page.unroute('**/backend-api/auth/verify-email');
      }

      await go(page, '/forgot-password');
      await snap('forgot-password');
      await go(page, '/forgot-password?legacy=1');
      await snap('forgot-password-legacy');
      await page.route('**/backend-api/auth/forgot-password', (r) => r.fulfill(json(200, { success: true })));
      await fillStable(page, '#forgot-email', 'contoh@example.test');
      await page.locator('form button[type="submit"]').click();
      await page.locator('[data-auth-page="forgot-password-sent"]').waitFor();
      await snap('forgot-password-sent');

      await go(page, '/reset-password?token=contoh-token-untuk-tangkapan-layar');
      await fillStable(page, '#new-password', 'pendek');
      await snap('reset-password');
      await page.route('**/backend-api/auth/reset-password', (r) =>
        r.fulfill(json(400, { statusCode: 400, code: 'invalid_or_expired_token', reason: 'expired', message: 'x' })),
      );
      await fillStable(page, '#new-password', 'cukup-panjang-123');
      await fillStable(page, '#confirm-new-password', 'cukup-panjang-123');
      await page.locator('form button[type="submit"]').click();
      await page.locator('[data-auth-page="reset-password-invalid"]').waitFor();
      await snap('reset-password-expired');
      await page.unroute('**/backend-api/auth/reset-password');
      await page.route('**/backend-api/auth/reset-password', (r) => r.fulfill(json(200, { success: true })));
      await go(page, '/reset-password?token=contoh-token-untuk-tangkapan-layar');
      await fillStable(page, '#new-password', 'cukup-panjang-123');
      await fillStable(page, '#confirm-new-password', 'cukup-panjang-123');
      await page.locator('form button[type="submit"]').click();
      await page.locator('[data-auth-page="reset-password-done"]').waitFor();
      await snap('reset-password-done');
      await page.unroute('**/backend-api/auth/reset-password');

      // Signed in: the profile's security panel (unverified state answered by the test), the notice.
      await login(page, address, PASSWORD);
      await waitUrl(page, (u) => u.pathname === '/menu');
      await snap('menu-signed-in');
      await page.route('**/backend-api/users/me', async (r) => {
        const res = await r.fetch();
        const body = await res.json();
        return r.fulfill({ response: res, body: JSON.stringify({ ...body, emailVerified: false }) });
      });
      await go(page, '/profile');
      await page.locator('[data-testid="email-unverified"]').waitFor({ timeout: 15_000 });
      await snap('profile-account-security-unverified');
      await page.unroute('**/backend-api/users/me');
      let once = false;
      await page.route('**/backend-api/users/me', (r) => {
        if (once) return r.continue();
        once = true;
        return r.fulfill(json(403, { statusCode: 403, code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email address to use this feature' }));
      });
      await go(page, '/menu');
      await page.locator('[data-email-not-verified]').waitFor({ timeout: 15_000 });
      await snap('notice-email-not-verified');
      await ctx.close();
    }
  }
  check(count === 4 * 20, `screenshots written: ${count} (20 states x 2 viewports x 2 themes) in ${SCREENS}`);
}

// ------------------------------------------------------------------------------------------------ main
async function preflight() {
  const front = await fetch(`${FRONTEND}/login`).catch(() => null);
  if (!front || !front.ok) throw new Error(`frontend not reachable at ${FRONTEND} (start-frontend.ps1)`);
  const back = await fetch(`${FRONTEND}/backend-api/stats/landing`).catch(() => null);
  if (!back || !back.ok) throw new Error('backend not reachable through /backend-api (start-backend.ps1)');
  const mp = await fetch(`${MAILPIT}/api/v1/info`).catch(() => null);
  if (!mp || !mp.ok) throw new Error(`Mailpit not reachable at ${MAILPIT} (npm run db:up)`);
  sql('SELECT 1');
}

await preflight();
browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: [`--disk-cache-dir=${SCRATCH}/chrome-cache`],
  env: { ...process.env, TEMP: 'D:/dev-cache/tmp', TMP: 'D:/dev-cache/tmp' },
});
const started = Date.now();
try {
  if (!screensOnly) {
    for (const key of Object.keys(scenarios).map(Number)) {
      if (only.length && !only.includes(key)) continue;
      console.log(`\nScenario ${key}`);
      try {
        await scenarios[key]();
      } catch (error) {
        const where = [];
        for (const [i, ctx] of contexts.entries()) {
          for (const [j, page] of ctx.pages().entries()) {
            where.push(new URL(page.url()).pathname);
            await page.screenshot({ path: join(SCRATCH, `fail-${key}-${i}-${j}.png`) }).catch(() => {});
          }
        }
        check(false, `scenario ${key} stopped: ${error.message.split('\n')[0]} (open pages: ${where.join(', ')})`);
      }
      for (const ctx of contexts.splice(0)) await ctx.close().catch(() => {});
      // The local backend's per-IP limits are shared by every request of this run (all from 127.0.0.1).
      await sleep(3000);
    }
  }
  if (wantScreens && (screensOnly || only.length === 0)) {
    console.log('\nScreenshots');
    try {
      await screens();
    } catch (error) {
      check(false, `screenshots stopped: ${error.message.split('\n')[0]}`);
    }
  }
} finally {
  for (const ctx of contexts) await ctx.close().catch(() => {});
  await browser.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed in ${Math.round((Date.now() - started) / 1000)} s`);
process.exit(failed.length ? 1 : 0);
