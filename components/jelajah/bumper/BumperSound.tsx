'use client';

/**
 * The intro bumper's sound and its controls (Phase 21). Loaded with next/dynamic from JelajahBumper only
 * when the bumper shows, so the audio code is never part of /jelajah's initial JavaScript.
 *
 * The sting (lib/jelajah/bumper/sound-cues.ts) runs on the bumper's own elapsed time (paused while the
 * tab is hidden, like the bumper's timeline); each scene change plays its note at once. The sound choice
 * and the autoplay rules are the film's (lib/audio/session.ts).
 */
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { SoundControls } from '@/components/audio/SoundControls';
import { audioContextCtor, outputLead } from '@/lib/audio/context';
import { createScheduler, type Scheduler } from '@/lib/audio/scheduler';
import { createSoundSession, type SoundSession, type SoundStatus } from '@/lib/audio/session';
import {
  BUMPER_END_FADE_MS,
  BUMPER_SKIP_FADE_MS,
  BUMPER_SOUND_GROUP,
  BUMPER_TOTAL_MS,
  bumperOfflineCues,
  bumperSceneSound,
  bumperSounds,
  bumperStingCues,
} from '@/lib/jelajah/bumper/sound-cues';
import type { BumperEndReason } from '@/lib/jelajah/bumper/timeline';
import { useDebugFlag } from '@/lib/jelajah/use-debug-flag';

/** The sting is over by then (the gong rings on by itself). */
const STING_WINDOW_MS = 2000;

declare global {
  interface Window {
    __nlBumperAudio?: { status: () => SoundStatus; renderWav: () => Promise<Record<string, unknown>> };
  }
}

export default function BumperSound({
  index,
  endRef,
}: {
  index: number;
  /** JelajahBumper calls this when the bumper ends, before it closes. */
  endRef: MutableRefObject<((reason: BumperEndReason) => void) | null>;
}) {
  const debug = useDebugFlag();
  const [status, setStatus] = useState<SoundStatus>(() => (audioContextCtor() ? 'starting' : 'unsupported'));
  const sessionRef = useRef<SoundSession | null>(null);

  useEffect(() => {
    const start = performance.now();
    let hiddenSince: number | null = null;
    let hiddenTotal = 0;
    const elapsed = () => (hiddenSince ?? performance.now()) - start - hiddenTotal;
    let scheduler: Scheduler | null = null;
    let frame = 0;
    let ended = false;
    const loop = () => {
      const t = elapsed();
      scheduler?.update(t);
      frame = t < STING_WINDOW_MS ? requestAnimationFrame(loop) : 0;
    };
    const session = createSoundSession({
      group: BUMPER_SOUND_GROUP,
      sounds: bumperSounds,
      onStatus: setStatus,
      onLive: (engine) => {
        scheduler?.stop(0);
        scheduler = createScheduler({ engine, cues: bumperStingCues(), group: BUMPER_SOUND_GROUP, leadSec: outputLead(engine.ctx) });
        scheduler.seek(elapsed());
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(loop);
      },
      onSilent: () => {
        scheduler?.stop(150);
        scheduler = null;
      },
    });
    sessionRef.current = session;
    session.start();

    const onVisibility = () => {
      const hidden = document.visibilityState === 'hidden';
      if (hidden && hiddenSince === null) hiddenSince = performance.now();
      if (!hidden && hiddenSince !== null) {
        hiddenTotal += performance.now() - hiddenSince;
        hiddenSince = null;
      }
      session.setHidden(hidden);
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (document.visibilityState === 'hidden') onVisibility();

    const end = (reason: BumperEndReason) => {
      if (ended) return;
      ended = true;
      const fade = reason === 'skipped' ? BUMPER_SKIP_FADE_MS : BUMPER_END_FADE_MS;
      scheduler?.stop(fade);
      session.engine?.fadeGroup(BUMPER_SOUND_GROUP, fade);
      session.close(fade);
    };
    endRef.current = end;

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      end('skipped');
      if (endRef.current === end) endRef.current = null;
      sessionRef.current = null;
    };
  }, [endRef]);

  // Each scene that appears gets its note, now.
  useEffect(() => {
    const session = sessionRef.current;
    const sound = bumperSceneSound(index);
    if (!session || !sound || session.status !== 'on' || !session.engine) return;
    const engine = session.engine;
    engine.play({ ref: sound.ref, when: engine.ctx.currentTime, bus: 'music', group: BUMPER_SOUND_GROUP, gain: sound.gain, wet: 0.35 });
  }, [index]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && !debug) return;
    window.__nlBumperAudio = {
      status: () => sessionRef.current?.status ?? 'unsupported',
      async renderWav() {
        const { renderOffline, toBase64 } = await import('@/lib/audio/offline');
        const cues = bumperOfflineCues();
        const { wav, ...numbers } = await renderOffline({ cues, sounds: bumperSounds(), seconds: BUMPER_TOTAL_MS / 1000 + 5 });
        return { ...numbers, base64: toBase64(wav) };
      },
    };
    return () => {
      delete window.__nlBumperAudio;
    };
  }, [debug]);

  return (
    <SoundControls
      status={status}
      onToggle={() => sessionRef.current?.toggle()}
      onEnable={() => sessionRef.current?.enable()}
      variant="site"
    />
  );
}
