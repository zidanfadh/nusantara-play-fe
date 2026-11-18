import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
// Next.js' own route matching helpers (the ones its router uses for `redirects()`), so these tests
// check real matching behaviour, not a re-implementation. Internal paths: if a Next.js upgrade
// moves them, update the imports.
import { modifyRouteRegex } from 'next/dist/lib/redirect-status';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import {
  matchHas,
  prepareDestination,
} from 'next/dist/shared/lib/router/utils/prepare-destination';
import nextConfig, { CANONICAL_ORIGIN, RETIRED_HOSTS, domainRedirects } from '../../next.config';

type Redirect = Awaited<ReturnType<typeof domainRedirects>>[number];

/** Returns the Location Next.js would send for this request, or null when no redirect matches. */
function resolveRedirect(redirects: Redirect[], host: string, url: string): string | null {
  const parsed = new URL(url, 'http://placeholder');
  const query = Object.fromEntries(parsed.searchParams.entries());
  const req = { headers: { host } } as unknown as IncomingMessage;

  for (const redirect of redirects) {
    // Same options as buildCustomRoute() in next/dist/server/lib/router-utils/filesystem.js.
    const params = getPathMatch(redirect.source, {
      strict: true,
      removeUnnamedParams: true,
      regexModifier: (regex) => modifyRouteRegex(regex, ['/_next']),
    })(parsed.pathname);
    if (!params) continue;
    const hasParams = matchHas(req, query, redirect.has);
    if (!hasParams) continue;

    const { parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: redirect.destination,
      params: { ...params, ...hasParams },
      query,
    });
    const search = new URLSearchParams(
      parsedDestination.query as Record<string, string>,
    ).toString();
    return `${parsedDestination.protocol}//${parsedDestination.hostname}${parsedDestination.pathname}${search ? `?${search}` : ''}`;
  }
  return null;
}

describe('next.config.ts redirects() (Phase 10 domain consolidation)', () => {
  it('is wired into the config and uses permanent (308) redirects', async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toEqual(domainRedirects());
    expect(redirects).toHaveLength(2);
    for (const r of redirects) {
      expect(r.permanent).toBe(true);
      expect(r.destination).toBe('https://nusantaralegacy.org/:path*');
    }
  });

  it('lists only the retired domain, never the canonical apex or www.nusantaralegacy.org', () => {
    expect(CANONICAL_ORIGIN).toBe('https://nusantaralegacy.org');
    expect([...RETIRED_HOSTS]).toEqual(['nusantaravirtual.org', 'www.nusantaravirtual.org']);
  });

  it.each([
    // The root compiles to the bare origin (no trailing slash), which browsers treat as "/".
    ['nusantaravirtual.org', '/', 'https://nusantaralegacy.org'],
    ['www.nusantaravirtual.org', '/', 'https://nusantaralegacy.org'],
    ['nusantaravirtual.org', '/?ref=x', 'https://nusantaralegacy.org?ref=x'],
    ['nusantaravirtual.org', '/prot/abc', 'https://nusantaralegacy.org/prot/abc'],
    ['nusantaravirtual.org', '/jelajah/sumatera-selatan', 'https://nusantaralegacy.org/jelajah/sumatera-selatan'],
    ['NusantaraVirtual.org:443', '/prot', 'https://nusantaralegacy.org/prot'],
    ['www.nusantaravirtual.org', '/prot?page=2&jenis=OLAHRAGA', 'https://nusantaralegacy.org/prot?page=2&jenis=OLAHRAGA'],
    // Nothing is excluded: API calls on the old domain are redirected as well.
    ['nusantaravirtual.org', '/backend-api/prot?limit=5', 'https://nusantaralegacy.org/backend-api/prot?limit=5'],
  ])('redirects host %s %s → %s', (host, url, expected) => {
    expect(resolveRedirect(domainRedirects(), host, url)).toBe(expected);
  });

  it.each([
    'nusantaralegacy.org',
    'www.nusantaralegacy.org',
    'localhost',
    'nusantara-play-git-phase-10.vercel.app',
    // The host value is a full-match regex: look-alike hosts must not match.
    'nusantaravirtual.org.evil.example',
    'xnusantaravirtual.org',
    'nusantaravirtualXorg',
  ])('leaves host %s untouched', (host) => {
    expect(resolveRedirect(domainRedirects(), host, '/prot?x=1')).toBeNull();
    expect(resolveRedirect(domainRedirects(), host, '/')).toBeNull();
  });
});
