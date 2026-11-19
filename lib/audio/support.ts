/**
 * Whether this browser has Web Audio (Phase 21). Tiny on purpose: the players read it synchronously to
 * decide whether to show sound controls, while the engine itself loads with lib/audio/runtime.ts.
 */
type AudioContextCtor = typeof AudioContext;

export function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}
