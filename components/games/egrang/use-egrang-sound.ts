'use client';

/**
 * Sound of the egrang page (Phase 23), on the Phase 21 engine: the shared runtime chunk is loaded with a
 * dynamic import only on /main/egrang (no audio code in any other page), the same sound choice
 * (`localStorage['np_sound_muted_v1']`), the same autoplay rule (on when the browser allows it, otherwise
 * "Nyalakan suara"), and the same `SoundControls`. Hidden tab = suspended.
 *
 * The race view plays sounds through `api.current`: `play(sound)` now, `at(delay, sound)` a little ahead
 * (the kendang beats and the Bambu pulse are scheduled from the simulation clock).
 */
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Engine } from '@/lib/audio/engine';
import type { SoundSession, SoundStatus } from '@/lib/audio/session';
import { EGRANG_SOUND_GROUP, egrangSoundList, type GameSound } from '@/lib/games/egrang/sound';
import type { Variant } from '@/lib/games/egrang/types';

export interface EgrangSoundApi {
  /** Plays a sound `delay` seconds from now (0 = now); nothing while sound is off. */
  at(delay: number, sound: GameSound): void;
  /** True while sound is audible. */
  live(): boolean;
}

export interface EgrangSound {
  status: SoundStatus;
  toggle(): void;
  enable(): void;
  /** Starts sound inside a tap when the browser blocked it (and the visitor did not mute it). */
  unlockIfBlocked(): void;
  pause(paused: boolean): void;
  api: MutableRefObject<EgrangSoundApi | null>;
}

export function useEgrangSound(variant: Variant): EgrangSound {
  const [status, setStatus] = useState<SoundStatus>('starting');
  const sessionRef = useRef<SoundSession | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const leadRef = useRef<(ctx: BaseAudioContext) => number>(() => 0);
  const variantRef = useRef(variant);
  const api = useRef<EgrangSoundApi | null>(null);

  useEffect(() => {
    variantRef.current = variant;
    engineRef.current?.store.request(egrangSoundList(variant));
  }, [variant]);

  useEffect(() => {
    let cancelled = false;
    let session: SoundSession | null = null;
    void import('@/lib/audio/runtime').then((rt) => {
      if (cancelled) return;
      leadRef.current = rt.outputLead;
      session = rt.createSoundSession({
        group: EGRANG_SOUND_GROUP,
        sounds: () => egrangSoundList(variantRef.current),
        onStatus: setStatus,
        onLive: (engine) => {
          engineRef.current = engine;
        },
        onSilent: () => {
          engineRef.current = null;
        },
      });
      sessionRef.current = session;
      session.start();
      if (document.hidden) session.setHidden(true);
    });
    const onVisibility = () => sessionRef.current?.setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    api.current = {
      at(delay, s) {
        const engine = engineRef.current;
        if (!engine || sessionRef.current?.status !== 'on') return;
        const ctx = engine.ctx;
        engine.play({
          ref: s.ref,
          when: ctx.currentTime + Math.max(0, delay + (s.delay ?? 0) - leadRef.current(ctx)),
          bus: s.bus ?? 'sfx',
          group: EGRANG_SOUND_GROUP,
          gain: s.gain,
          pan: s.pan,
          wet: s.wet,
        });
      },
      live: () => !!engineRef.current && sessionRef.current?.status === 'on',
    };
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      engineRef.current?.fadeGroup(EGRANG_SOUND_GROUP, 200);
      sessionRef.current?.close(300);
      sessionRef.current = null;
      engineRef.current = null;
      api.current = null;
    };
  }, []);

  const toggle = useCallback(() => sessionRef.current?.toggle(), []);
  const enable = useCallback(() => sessionRef.current?.enable(), []);
  const unlockIfBlocked = useCallback(() => {
    if (sessionRef.current?.status === 'blocked') sessionRef.current.enable();
  }, []);
  const pause = useCallback((paused: boolean) => {
    if (paused) sessionRef.current?.pause();
    else sessionRef.current?.resume();
  }, []);

  return { status, toggle, enable, unlockIfBlocked, pause, api };
}
