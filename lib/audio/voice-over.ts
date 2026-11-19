/**
 * Voice-over hook (Phase 21): decodes the files a player lists explicitly (never probes, so a missing
 * voice-over makes no request at all) and turns each into a cue on the voice bus plus the music duck
 * while it speaks. Nothing is listed yet (CONCEPT_VOICEOVER in lib/jelajah/concept/script.ts).
 */
import type { Automation, Cue } from './scheduler';

export interface VoiceOverItem {
  scene: string;
  src: string;
  /** Clock time the voice starts (ms). */
  at: number;
}

/** Duck the music by `db` from just before `at` until `durationMs` later, with soft ramps. */
export function duckRamps(at: number, durationMs: number, db: number): Automation[] {
  const level = 10 ** (db / 20);
  return [
    { param: 'duck', from: Math.max(0, at - 150), to: at + 100, v0: 1, v1: level, scene: 'voice-over' },
    { param: 'duck', from: at + durationMs, to: at + durationMs + 500, v0: level, v1: 1, scene: 'voice-over' },
  ];
}

/**
 * Fetches and decodes the listed files; a file that fails is left out (the film plays without it).
 * Returns the voice cues and the duck ramps for `scheduler.extend()`.
 */
export async function loadVoiceOvers(
  items: readonly VoiceOverItem[],
  ctx: BaseAudioContext,
  duckDb: number,
  fetchFn: (url: string) => Promise<Response> = (url) => fetch(url),
): Promise<{ cues: Cue[]; automation: Automation[] }> {
  const cues: Cue[] = [];
  const automation: Automation[] = [];
  for (const item of items) {
    try {
      const res = await fetchFn(item.src);
      if (!res.ok) continue;
      const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
      cues.push({
        id: `${item.scene}:voice-over`,
        at: item.at,
        buffer,
        bus: 'voice',
        gain: 1,
        resumable: true,
        scene: item.scene,
        beat: 'voice-over',
      });
      automation.push(...duckRamps(item.at, buffer.duration * 1000, duckDb));
    } catch {
      // network or decode error: no voice-over for this scene
    }
  }
  return { cues, automation };
}
