/**
 * Phase 25 (Phase 23 review addendum): every bumper scene uses the dense short-screen layout. Measured in a production
 * build: without it every scene except the game scene was taller than the screen at 844x390 and 740x360.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCENES = ['BrandScene', 'ProtScene', 'MapScene', 'GameScene', 'CommunityScene', 'StartScene'];
const read = (name: string) => readFileSync(join(process.cwd(), 'components/jelajah/bumper', `${name}.tsx`), 'utf8');

describe('bumper dense layout on short screens (Phase 25)', () => {
  it.each(SCENES)('%s passes `dense` to SceneLayout', (name) => {
    expect(read(name)).toMatch(/<SceneLayout\s+dense\b/);
  });

  it('dense applies only at most 500 px high (taller screens unchanged)', () => {
    const layout = read('SceneLayout');
    expect(layout).toContain("visual: '[@media(max-height:500px)]:hidden'");
    expect(layout).not.toMatch(/visual: '(?!\[@media\(max-height:500px\)\])/);
  });
});
