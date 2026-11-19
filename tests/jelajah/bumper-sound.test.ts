import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createBufferStore } from '@/lib/audio/buffers';
import { createEngine } from '@/lib/audio/engine';
import { GONG_HZ } from '@/lib/audio/pitch';
import { createScheduler } from '@/lib/audio/scheduler';
import { popVariants, sceneVariants } from '@/components/jelajah/bumper/SceneLayout';
import { BUMPER_DURATIONS, BUMPER_SCENES } from '@/lib/jelajah/bumper/scene-data';
import {
  BRAND_MOMENT_MS,
  BUMPER_END_FADE_MS,
  BUMPER_SKIP_FADE_MS,
  BUMPER_TOTAL_MS,
  bumperOfflineCues,
  bumperSceneSound,
  bumperSceneStarts,
  bumperSounds,
  bumperStingCues,
} from '@/lib/jelajah/bumper/sound-cues';
import { END_FADE_MS, SKIP_FADE_MS } from '@/lib/jelajah/concept/sound-cues';
import { asCtx, FakeAudioContext } from '../audio/fake-audio';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (p: string) => readFileSync(root + p, 'utf8');

describe('bumper sound sting (Phase 21)', () => {
  it('the gong lands on the brand moment: when the logo has popped in (SceneLayout variants)', () => {
    const show = sceneVariants.show as { transition: { delayChildren: number } };
    const pop = popVariants.show as { transition: { duration: number } };
    expect(BRAND_MOMENT_MS).toBe(Math.round((show.transition.delayChildren + pop.transition.duration) * 1000));
    const gong = bumperStingCues().find((c) => c.beat === 'brand moment (GONG)')!;
    expect(gong.at).toBe(BRAND_MOMENT_MS);
    expect(gong.ref).toEqual({ id: 'gong', hz: GONG_HZ });
    // soft swell first, ending on the gong
    const swell = bumperStingCues().find((c) => c.beat === 'soft swell')!;
    expect(swell.at).toBe(0);
    expect(swell.ref!.len! * 1000).toBe(BRAND_MOMENT_MS);
    // everything of the sting happens in the brand scene
    for (const c of bumperStingCues()) expect(c.at).toBeLessThan(BUMPER_DURATIONS[0]);
  });

  it('every later scene gets one soft note; the last a chime; the first none', () => {
    expect(bumperSceneSound(0)).toBeNull();
    for (let i = 1; i < BUMPER_SCENES.length - 1; i += 1) expect(bumperSceneSound(i)!.ref.id).toBe('bonang');
    expect(bumperSceneSound(BUMPER_SCENES.length - 1)!.ref.id).toBe('chime');
    expect(bumperSceneSound(BUMPER_SCENES.length)).toBeNull();
  });

  it('the offline sheet follows the bumper timings (auto-advance)', () => {
    expect(bumperSceneStarts()).toEqual([0, 3000, 6000, 9000, 12000, 15000]);
    expect(BUMPER_TOTAL_MS).toBe(19000);
    const scenes = bumperOfflineCues().filter((c) => c.id.startsWith('scene:'));
    expect(scenes.map((c) => c.at)).toEqual(bumperSceneStarts().slice(1));
  });

  it('plays offline with every sound rendered, within the voice cap', () => {
    const fake = new FakeAudioContext();
    const store = createBufferStore(asCtx(fake), { worker: false });
    store.renderNow(bumperSounds());
    const engine = createEngine(asCtx(fake), store);
    const scheduler = createScheduler({ engine, cues: bumperOfflineCues(), group: 'bumper' });
    scheduler.scheduleAll(0);
    for (const c of bumperOfflineCues()) expect(scheduler.fired.get(c.id), c.id).toBe(1);
    expect(engine.peakVoices).toBeLessThanOrEqual(8);
  });

  it('same exit fades as the film', () => {
    expect(BUMPER_SKIP_FADE_MS).toBe(SKIP_FADE_MS);
    expect(BUMPER_END_FADE_MS).toBe(END_FADE_MS);
  });
});

describe('audio code stays out of /jelajah initial JavaScript', () => {
  it('the hub and the bumper reach the audio code only through dynamic imports', () => {
    const staticImports = (file: string) => [...read(file).matchAll(/^import [^;]*? from '([^']+)'/gm)].map((m) => m[1]);
    for (const file of ['components/jelajah/JelajahHub.tsx', 'components/jelajah/bumper/JelajahBumper.tsx']) {
      const imports = staticImports(file);
      expect(imports.filter((m) => m.includes('/audio') || m.includes('sound-cues') || m.includes('BumperSound')), file).toEqual([]);
    }
    expect(read('components/jelajah/bumper/JelajahBumper.tsx')).toContain("dynamic(() => import('./BumperSound'), { ssr: false })");
    // Both players load the engine through the SAME dynamic module (one shared chunk), never statically.
    for (const file of ['components/jelajah/bumper/BumperSound.tsx', 'components/jelajah/concept/use-concept-sound.ts']) {
      const values = [...read(file).matchAll(/^import (?!type )[^;]*? from '([^']+)'/gm)].map((m) => m[1]);
      expect(values.filter((m) => /lib\/audio\/(context|engine|buffers|core|scheduler|session|voice-over)$/.test(m)), file).toEqual([]);
      expect(read(file)).toContain("import('@/lib/audio/runtime')");
    }
    // The cue sheets need only the pitch set and a tiny RNG, never the synthesis core.
    for (const file of ['lib/jelajah/concept/sound-cues.ts', 'lib/jelajah/bumper/sound-cues.ts', 'lib/audio/rng.ts']) {
      const values = [...read(file).matchAll(/^import (?!type )[^;]*? from '([^']+)'/gm)].map((m) => m[1]);
      expect(values.filter((m) => /core$/.test(m)), file).toEqual([]);
    }
    // The offline renderer (WAV) is a debug-only dynamic import.
    for (const file of ['components/jelajah/bumper/BumperSound.tsx', 'components/jelajah/concept/use-concept-sound.ts']) {
      expect(staticImports(file)).not.toContain('@/lib/audio/offline');
      expect(read(file)).toContain("await import('@/lib/audio/offline')");
    }
  });
});
