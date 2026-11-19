import { describe, expect, it } from 'vitest';
import { isPublicPath } from '@/middleware';

describe('middleware public routes', () => {
  it('does not treat /about as public (no such page; finding F5)', () => {
    expect(isPublicPath('/about')).toBe(false);
  });

  it('keeps /api routes behind login', () => {
    expect(isPublicPath('/api/some-route')).toBe(false);
  });

  it.each(['/', '/login', '/signup', '/nfts', '/nfts/some-slug', '/prot', '/events'])(
    'still treats %s as public',
    (path) => {
      expect(isPublicPath(path)).toBe(true);
    },
  );
});

describe('middleware: Jelajah needs a login (Phase 18; public in Phases 10 to 17)', () => {
  it.each(['/jelajah', '/jelajah/sumatera-selatan', '/jelajah/unknown-slug'])('protects %s', (path) => {
    expect(isPublicPath(path)).toBe(false);
  });

  it.each([
    '/jelajah/geo/indonesia-provinces.json',
    '/jelajah/assets/v1/nature.glb',
    '/jelajah/demo/foto-contoh.svg',
  ])('keeps the static file %s public (data, not a page)', (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each(['/jelajah/geo', '/jelajah/geox/a', '/jelajah/assets'])('does not open the page path %s', (path) => {
    expect(isPublicPath(path)).toBe(false);
  });

  it.each(['/jelajahx', '/jelajah-admin'])('does not widen to %s', (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});

describe('middleware public routes: games (Phase 17)', () => {
  it.each(['/main', '/main/congklak'])('treats %s as public', (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each(['/mainx', '/main-admin', '/maintenance'])('does not widen to %s', (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});
