/**
 * Sound hook of the gasing game (Phase 20). No audio in this phase: `cueSound` is called at every moment
 * that should make a sound and does nothing yet. A later phase can fill `GASING_SOUNDS` with files (and
 * respect a mute setting) without touching the game code.
 */
export type SoundCue = 'throw' | 'land' | 'hit' | 'stop' | 'out' | 'perfect' | 'round' | 'match';

/** TODO(audio): file per cue; null = silent. */
export const GASING_SOUNDS: Readonly<Record<SoundCue, string | null>> = {
  throw: null,
  land: null,
  hit: null,
  stop: null,
  out: null,
  perfect: null,
  round: null,
  match: null,
};

export function cueSound(cue: SoundCue): void {
  if (GASING_SOUNDS[cue] === null) return;
  // A later phase plays the file here.
}
