import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBackendApiUrl, resolveBackendApiUrl } from '@/lib/api/base-url';

const ENV_URL = 'https://api.nusantaralegacy.org/api';

describe('resolveBackendApiUrl', () => {
  it('uses NEXT_PUBLIC_BACKEND_API_URL in development, also in the browser', () => {
    const result = resolveBackendApiUrl({
      nodeEnv: 'development',
      envBackendApiUrl: 'http://localhost:3000/api',
      browserOrigin: 'http://localhost:3001',
    });

    expect(result).toBe('http://localhost:3000/api');
  });

  it('throws in development when NEXT_PUBLIC_BACKEND_API_URL is missing', () => {
    expect(() => resolveBackendApiUrl({ nodeEnv: 'development' })).toThrow(
      /NEXT_PUBLIC_BACKEND_API_URL is required in development/,
    );
  });

  it.each([
    'https://nusantaralegacy.org',
    'https://www.nusantaralegacy.org',
    'https://nusantaravirtual.org',
    'https://nusantara-play-fe-git-phase-03-api-proxy-team.vercel.app',
  ])('uses the same-origin proxy path in the production browser on %s', (origin) => {
    const result = resolveBackendApiUrl({
      nodeEnv: 'production',
      envBackendApiUrl: ENV_URL,
      browserOrigin: origin,
    });

    expect(result).toBe(`${origin}/backend-api`);
  });

  it('never derives an api.<hostname> URL in the browser', () => {
    const result = resolveBackendApiUrl({
      nodeEnv: 'production',
      envBackendApiUrl: ENV_URL,
      browserOrigin: 'https://nusantaravirtual.org',
    });

    expect(result).not.toContain('api.nusantaravirtual.org');
  });

  it('uses NEXT_PUBLIC_BACKEND_API_URL on the server (no browser origin)', () => {
    const result = resolveBackendApiUrl({
      nodeEnv: 'production',
      envBackendApiUrl: `${ENV_URL}/`,
    });

    expect(result).toBe(ENV_URL);
  });

  it('throws on the server in production when NEXT_PUBLIC_BACKEND_API_URL is missing', () => {
    expect(() => resolveBackendApiUrl({ nodeEnv: 'production' })).toThrow(
      /NEXT_PUBLIC_BACKEND_API_URL is required/,
    );
  });

  it('treats missing NODE_ENV as production', () => {
    const result = resolveBackendApiUrl({
      envBackendApiUrl: ENV_URL,
      browserOrigin: 'https://nusantaralegacy.org',
    });

    expect(result).toBe('https://nusantaralegacy.org/backend-api');
  });
});

describe('getBackendApiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns <window.location.origin>/backend-api in the production browser', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_BACKEND_API_URL', ENV_URL);
    vi.stubGlobal('window', { location: { origin: 'https://www.nusantaralegacy.org' } });

    expect(getBackendApiUrl()).toBe('https://www.nusantaralegacy.org/backend-api');
  });

  it('returns NEXT_PUBLIC_BACKEND_API_URL on the server in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_BACKEND_API_URL', ENV_URL);

    expect(typeof window).toBe('undefined');
    expect(getBackendApiUrl()).toBe(ENV_URL);
  });

  it('returns NEXT_PUBLIC_BACKEND_API_URL in the development browser', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_BACKEND_API_URL', 'http://localhost:3000/api');
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3001' } });

    expect(getBackendApiUrl()).toBe('http://localhost:3000/api');
  });

  it('returns the same-origin proxy in the development browser with NEXT_PUBLIC_AUTH_MODE=local (Phase 29)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_BACKEND_API_URL', 'http://localhost:3000/api');
    vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', 'local');
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3001' } });

    expect(getBackendApiUrl()).toBe('http://localhost:3001/backend-api');
  });
});

describe('resolveBackendApiUrl with NEXT_PUBLIC_AUTH_MODE=local (Phase 29)', () => {
  it('keeps NEXT_PUBLIC_BACKEND_API_URL on the server', () => {
    expect(resolveBackendApiUrl({ nodeEnv: 'production', envBackendApiUrl: ENV_URL, authMode: 'local' })).toBe(ENV_URL);
  });

  it('is unchanged for any other mode value', () => {
    expect(
      resolveBackendApiUrl({
        nodeEnv: 'development',
        envBackendApiUrl: 'http://localhost:3000/api',
        browserOrigin: 'http://localhost:3001',
        authMode: 'supabase',
      }),
    ).toBe('http://localhost:3000/api');
  });
});
