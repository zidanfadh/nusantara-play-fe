import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (f: string) => readFileSync(root + f, 'utf8');

describe('landing page tour links (Phase 17)', () => {
  it('"Mulai Tur Virtual" opens /jelajah in the same tab', () => {
    const src = read('app/page.tsx');
    const button = src.slice(src.lastIndexOf('<Link', src.indexOf('Mulai Tur Virtual')), src.indexOf('Mulai Tur Virtual'));
    expect(button).toContain('href="/jelajah"');
    expect(button).not.toContain('target=');
    expect(src).not.toContain('wellmagicteam.com');
  });

  it('the carousel slide links to /jelajah, not the dead external site', () => {
    const src = read('components/ui/HeroCarousel.tsx');
    expect(src).toContain('href: "/jelajah"');
    expect(src).not.toContain('kpoti.id');
    expect(src).not.toContain('target="_blank"');
  });
});
