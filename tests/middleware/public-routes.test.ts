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
