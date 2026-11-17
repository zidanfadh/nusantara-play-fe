import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { describe, expect, it } from 'vitest';
import { config } from '@/middleware';

function matches(url: string): boolean {
  return unstable_doesMiddlewareMatch({ config, nextConfig: {}, url });
}

describe('middleware matcher', () => {
  it.each([
    '/backend-api',
    '/backend-api/',
    '/backend-api/health',
    '/backend-api/prot?page=1&limit=1',
    '/backend-api/prot/123/foto-kegiatan',
    '/backend-api/users/me',
  ])('does not run for proxied API call %s', (url) => {
    expect(matches(url)).toBe(false);
  });

  it.each(['/', '/login', '/profile', '/prot', '/prot/123', '/api/proxy-image', '/backend-apix'])(
    'still runs for %s',
    (url) => {
      expect(matches(url)).toBe(true);
    },
  );

  it('still skips static assets', () => {
    expect(matches('/_next/static/chunk.js')).toBe(false);
    expect(matches('/logo.png')).toBe(false);
  });
});
