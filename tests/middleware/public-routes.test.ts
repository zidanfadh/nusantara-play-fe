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

describe('middleware public routes: Jelajah Nusantara (Phase 10)', () => {
  it.each(['/jelajah', '/jelajah/sumatera-selatan', '/jelajah/unknown-slug', '/jelajah/geo/indonesia-provinces.json'])(
    'treats %s as public',
    (path) => {
      expect(isPublicPath(path)).toBe(true);
    },
  );

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
