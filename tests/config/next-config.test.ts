import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import nextConfig, {
  BACKEND_PROXY_PATH,
  DEFAULT_BACKEND_ORIGIN,
  resolveBackendOrigin,
} from '../../next.config';
import { BACKEND_PROXY_PATH as CLIENT_PROXY_PATH } from '@/lib/api/base-url';

const rootDir = fileURLToPath(new URL('../../', import.meta.url));

async function getRewrites() {
  if (!nextConfig.rewrites) throw new Error('next.config.ts has no rewrites()');
  return nextConfig.rewrites();
}

describe('next.config.ts rewrites()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('proxies /backend-api/:path* to the default production origin', async () => {
    vi.stubEnv('BACKEND_ORIGIN', undefined);

    expect(DEFAULT_BACKEND_ORIGIN).toBe('https://api.nusantaralegacy.org');
    expect(await getRewrites()).toEqual([
      {
        source: '/backend-api/:path*',
        destination: 'https://api.nusantaralegacy.org/api/:path*',
      },
    ]);
  });

  it('treats an empty BACKEND_ORIGIN as unset', async () => {
    vi.stubEnv('BACKEND_ORIGIN', '');

    expect(await getRewrites()).toEqual([
      { source: '/backend-api/:path*', destination: 'https://api.nusantaralegacy.org/api/:path*' },
    ]);
  });

  it('uses a custom BACKEND_ORIGIN', async () => {
    vi.stubEnv('BACKEND_ORIGIN', 'https://staging-api.example.com');

    expect(await getRewrites()).toEqual([
      { source: '/backend-api/:path*', destination: 'https://staging-api.example.com/api/:path*' },
    ]);
  });

  it('allows http only for localhost', async () => {
    vi.stubEnv('BACKEND_ORIGIN', 'http://localhost:3000');

    expect(await getRewrites()).toEqual([
      { source: '/backend-api/:path*', destination: 'http://localhost:3000/api/:path*' },
    ]);
  });

  it.each([
    ['http on a public host', 'http://api.nusantaralegacy.org'],
    ['a trailing slash', 'https://api.nusantaralegacy.org/'],
    ['a path', 'https://api.nusantaralegacy.org/api'],
    ['a query string', 'https://api.nusantaralegacy.org?x=1'],
    ['credentials', 'https://user:pass@api.nusantaralegacy.org'],
    ['a relative value', 'api.nusantaralegacy.org'],
    ['another scheme', 'ftp://api.nusantaralegacy.org'],
  ])('throws for %s', async (_label, value) => {
    vi.stubEnv('BACKEND_ORIGIN', value);

    await expect(getRewrites()).rejects.toThrow(/Invalid BACKEND_ORIGIN/);
    expect(() => resolveBackendOrigin(value)).toThrow(/Invalid BACKEND_ORIGIN/);
  });

  it('marks proxied responses as not cacheable by the Vercel CDN', async () => {
    expect(await nextConfig.headers?.()).toEqual([
      {
        source: '/backend-api/:path*',
        headers: [{ key: 'x-vercel-enable-rewrite-caching', value: '0' }],
      },
    ]);
  });

  it('uses the same proxy path as lib/api/base-url.ts', () => {
    expect(BACKEND_PROXY_PATH).toBe('/backend-api');
    expect(CLIENT_PROXY_PATH).toBe(BACKEND_PROXY_PATH);
  });
});

describe('/backend-api route collisions', () => {
  // Route groups "(x)" and private folders do not add URL segments, so search the whole app/ tree.
  function findDirsNamed(dir: string, name: string): string[] {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        const full = join(dir, entry.name);
        return entry.name === name ? [full] : findDirsNamed(full, name);
      });
  }

  it('has no app/ route segment named backend-api', () => {
    expect(findDirsNamed(join(rootDir, 'app'), 'backend-api')).toEqual([]);
  });

  it('has no public/backend-api folder', () => {
    expect(findDirsNamed(join(rootDir, 'public'), 'backend-api')).toEqual([]);
  });
});
