'use client';

/**
 * The concept film's soundtrack (Phase 21), bound to the film's own clock (the `time` MotionValue).
 * The sound session decides when sound is audible; while it is, a scheduler plays the cue sheet
 * (lib/jelajah/concept/sound-cues.ts) on every clock change. Reduced motion keeps the sound: the music bed
 * and each scene's key hits on the stills' clock ("Lanjut" seeks, so its sounds fire at once).
 *
 * Debug (development, or ?debug=1): `window.__nlConceptAudio` = status, sync log, render stats and
 * `renderWav()` (offline render of the same sheet → base64 WAV; the Phase 21 review files).
 */
import type { MotionValue } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Scheduler, SyncEntry } from '@/lib/audio/scheduler';
import type { SoundSession, SoundStatus } from '@/lib/audio/session';
import { audioContextCtor } from '@/lib/audio/support';
import { VOICEOVER_DUCK_DB } from '@/lib/jelajah/concept/script';
import {
  buildConceptAutomation,
  buildConceptCues,
  buildReducedCues,
  CONCEPT_SOUND_GROUP,
  END_FADE_MS,
  SKIP_FADE_MS,
  soundsInOrder,
  voiceOverPlan,
} from '@/lib/jelajah/concept/sound-cues';
import { CONCEPT_END_MS } from '@/lib/jelajah/concept/timeline';
import type { ConceptEndReason } from '@/lib/jelajah/concept/types';

export interface ConceptAudioHook {
  status: () => SoundStatus;
  /** Audio clock vs page clock (getOutputTimestamp): what is heard when; the sync measurement. */
  clock: () => { ctx: number; outCtx: number | null; outPerf: number | null; perf: number } | null;
  log: () => readonly SyncEntry[];
  stats: () => Record<string, unknown>;
  /** Offline render of the full soundtrack (or the reduced one) → { base64 WAV, numbers }. */
  renderWav: (which?: 'concept' | 'reduced') => Promise<Record<string, unknown>>;
}

declare global {
  interface Window {
    __nlConceptAudio?: ConceptAudioHook;
  }
}

export function useConceptSound(time: MotionValue<number>, reduced: boolean, debug: boolean) {
  const [status, setStatus] = useState<SoundStatus>(() => (audioContextCtor() ? 'starting' : 'unsupported'));
  const sessionRef = useRef<SoundSession | null>(null);
  const endRef = useRef<(reason: ConceptEndReason) => void>(() => {});

  useEffect(() => {
    const cues = reduced ? buildReducedCues() : buildConceptCues();
    const automation = reduced ? [] : buildConceptAutomation();
    let scheduler: Scheduler | null = null;
    let session: SoundSession | null = null;
    let ended = false;
    let disposed = false;
    let lastChange = performance.now();
    const cleanups: (() => void)[] = [];

    const end = (reason: ConceptEndReason) => {
      if (ended) return;
      ended = true;
      const fade = reason === 'skipped' ? SKIP_FADE_MS : END_FADE_MS;
      scheduler?.stop(fade);
      session?.close(fade);
    };
    endRef.current = end;

    // The engine is a shared chunk (lib/audio/runtime.ts), loaded only now that the film plays.
    void import('@/lib/audio/runtime').then((audio) => {
      if (disposed || ended) return;
      const s = audio.createSoundSession({
        group: CONCEPT_SOUND_GROUP,
        sounds: () => soundsInOrder(cues),
        onStatus: setStatus,
        onLive: (engine) => {
          scheduler?.stop(0);
          const next = audio.createScheduler({ engine, cues, automation, group: CONCEPT_SOUND_GROUP, leadSec: audio.outputLead(engine.ctx) });
          scheduler = next;
          // Start in sync from wherever the film is now (autoplay: 0; "Nyalakan suara": later).
          next.seek(time.get());
          const plan = reduced ? [] : voiceOverPlan();
          if (plan.length > 0) {
            void audio.loadVoiceOvers(plan, engine.ctx, VOICEOVER_DUCK_DB).then(({ cues: vo, automation: duck }) => {
              if (scheduler === next) next.extend(vo, duck);
            });
          }
        },
        onSilent: () => {
          scheduler?.stop(150);
          scheduler = null;
        },
      });
      session = s;
      sessionRef.current = s;
      s.start();

      cleanups.push(
        time.on('change', (t) => {
          const now = performance.now();
          const gap = now - lastChange;
          lastChange = now;
          scheduler?.update(t, gap);
        }),
      );
      const onVisibility = () => s.setHidden(document.visibilityState === 'hidden');
      document.addEventListener('visibilitychange', onVisibility);
      cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

      if (process.env.NODE_ENV !== 'production' || debug) {
        window.__nlConceptAudio = {
          status: () => s.status,
          clock: () => {
            const ctx = s.engine?.ctx as AudioContext | undefined;
            if (!ctx) return null;
            const ts = typeof ctx.getOutputTimestamp === 'function' ? ctx.getOutputTimestamp() : null;
            return { ctx: ctx.currentTime, outCtx: ts?.contextTime ?? null, outPerf: ts?.performanceTime ?? null, perf: performance.now() };
          },
          log: () => scheduler?.log ?? [],
          stats: () => ({
            status: s.status,
            render: s.engine ? { ...s.engine.store.stats } : null,
            peakVoices: s.engine?.peakVoices ?? 0,
            lead: s.engine ? audio.outputLead(s.engine.ctx) : null,
            sampleRate: s.engine?.ctx.sampleRate ?? null,
            ctxState: (s.engine?.ctx as AudioContext | undefined)?.state ?? null,
            cues: cues.length,
          }),
          async renderWav(which = 'concept') {
            const { renderOffline, toBase64 } = await import('@/lib/audio/offline');
            const sheet = which === 'reduced' ? buildReducedCues() : buildConceptCues();
            const result = await renderOffline({
              cues: sheet,
              automation: which === 'reduced' ? [] : buildConceptAutomation(),
              sounds: soundsInOrder(sheet),
              // The film, its final hold, and the gong's tail.
              seconds: CONCEPT_END_MS / 1000 + 4,
            });
            const { wav, ...numbers } = result;
            return { ...numbers, base64: toBase64(wav) };
          },
        };
        cleanups.push(() => {
          if (window.__nlConceptAudio) delete window.__nlConceptAudio;
        });
      }
    });

    return () => {
      disposed = true;
      end('skipped');
      cleanups.forEach((fn) => fn());
      if (session && sessionRef.current === session) sessionRef.current = null;
    };
  }, [time, reduced, debug]);

  const toggle = useCallback(() => sessionRef.current?.toggle(), []);
  const enable = useCallback(() => sessionRef.current?.enable(), []);
  const pause = useCallback(() => sessionRef.current?.pause(), []);
  const resume = useCallback(() => sessionRef.current?.resume(), []);
  const tick = useCallback(() => sessionRef.current?.tick(), []);
  const end = useCallback((reason: ConceptEndReason) => endRef.current(reason), []);

  return useMemo(() => ({ status, toggle, enable, pause, resume, tick, end }), [status, toggle, enable, pause, resume, tick, end]);
}
