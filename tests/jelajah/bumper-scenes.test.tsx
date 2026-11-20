import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BrandScene } from '@/components/jelajah/bumper/BrandScene';
import { CommunityScene } from '@/components/jelajah/bumper/CommunityScene';
import { GAME_SCENE_TEXT, GameScene } from '@/components/jelajah/bumper/GameScene';
import { ProtScene } from '@/components/jelajah/bumper/ProtScene';
import { StartScene } from '@/components/jelajah/bumper/StartScene';
import { SIMULATION_LABEL } from '@/components/jelajah/RewardHud';
import { SITE_NAME } from '@/lib/brand';
import { protSceneData } from '@/lib/jelajah/bumper/scene-data';
import { emptySummaries } from '@/lib/jelajah/data';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (f: string) => readFileSync(`${root}${f}`, 'utf8');

describe('bumper scenes (Phase 16)', () => {
  it('brand: the site name from the one constant', () => {
    expect(renderToStaticMarkup(<BrandScene />)).toContain(SITE_NAME);
  });

  it('PROT scene with 0 public PROT: neutral text, no photo list', () => {
    const html = renderToStaticMarkup(
      <ProtScene scene={protSceneData({ provinces: emptySummaries(), totalProt: 0, unassignedProt: 0 }, 'ready')} />,
    );
    expect(html).toContain('setelah selesai dikurasi');
    expect(html).not.toContain('Contoh foto PROT');
  });

  it('game scene: a short line and one button per hosted game (Phase 17; Phase 23 all games)', () => {
    // Phase 17: no longer "Segera hadir"; Phase 23: Main Congklak, Main Gasing and Main Egrang side by side.
    expect(GAME_SCENE_TEXT).toBe('Main congklak, gasing, dan egrang langsung di sini, tanpa masuk akun.');
    const html = renderToStaticMarkup(<GameScene onPlay={() => {}} />);
    expect(html).toContain(GAME_SCENE_TEXT);
    for (const label of ['Main Congklak', 'Main Gasing', 'Main Egrang']) expect(html).toContain(label);
    for (const g of ['congklak', 'gasing', 'egrang']) expect(html).toContain(`data-testid="bumper-play-${g}"`);
    expect(html.match(/data-bumper-action/g)).toHaveLength(3);
    expect(html).toContain('sm:flex-row');
    expect(html).not.toContain('Segera hadir');
  });

  it('community scene: numbers only when the stats loaded', () => {
    const without = renderToStaticMarkup(<CommunityScene stats={null} />);
    expect(without).not.toContain('bumper-community-stats');
    expect(without).toContain('Event dan komunitas');
    const withStats = renderToStaticMarkup(<CommunityScene stats={{ events: 3, members: 1200 }} />);
    expect(withStats).toContain('1.200');
    expect(withStats).toContain('Anggota');
  });

  it('XP and Paspor scene: labelled as a simulation like the HUD, with Mulai Jelajah', () => {
    const html = renderToStaticMarkup(<StartScene onStart={() => {}} />);
    expect(html).toContain(SIMULATION_LABEL);
    expect(html).toContain('Mulai Jelajah');
  });

  it('the bumper never loads three.js and no scene calls fetch directly', () => {
    const files = [
      'components/jelajah/bumper/JelajahBumper.tsx',
      'components/jelajah/bumper/SceneLayout.tsx',
      'components/jelajah/bumper/BrandScene.tsx',
      'components/jelajah/bumper/ProtScene.tsx',
      'components/jelajah/bumper/MapScene.tsx',
      'components/jelajah/bumper/GameScene.tsx',
      'components/jelajah/bumper/CommunityScene.tsx',
      'components/jelajah/bumper/StartScene.tsx',
      'lib/jelajah/bumper/scene-data.ts',
      'lib/jelajah/bumper/timeline.ts',
      'lib/jelajah/bumper/session.ts',
      'lib/jelajah/bumper/use-bumper-timeline.ts',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/from\s+['"](three|@react-three\/[^'"]+)['"]|Map3D|VillageScene3D/);
      expect(src, f).not.toMatch(/\bfetch\(/);
    }
  });
});
