import { describe, expect, it } from 'vitest';
import { createBufferStore } from '@/lib/audio/buffers';
import { createEngine, MAX_VOICES } from '@/lib/audio/engine';
import { GONG_HZ } from '@/lib/audio/pitch';
import { createScheduler, automationValueAt } from '@/lib/audio/scheduler';
import { buildCongklakDemo } from '@/lib/jelajah/concept/congklak-demo';
import { ARCHIVE_CARD_COUNT, BEATS, CONCEPT_SCENES, CONCEPT_TOTAL_MS, REDUCED_STEP_MS } from '@/lib/jelajah/concept/script';
import {
  buildConceptAutomation,
  buildConceptCues,
  buildReducedCues,
  CARD_ARRIVAL,
  ringPulses,
  seedArrivals,
  soundsInOrder,
  voiceOverDuck,
  voiceOverPlan,
} from '@/lib/jelajah/concept/sound-cues';
import { CONCEPT_END_MS, easeOutBack } from '@/lib/jelajah/concept/timeline';
import { asCtx, FakeAudioContext } from '../audio/fake-audio';

const cues = buildConceptCues();
const start = Object.fromEntries(CONCEPT_SCENES.map((s) => [s.id, s.start]));
const by = (beat: string) => cues.filter((c) => c.beat === beat);

describe('concept soundtrack cue sheet (Phase 21)', () => {
  it('every cue belongs to an existing scene and starts inside it; ids are unique', () => {
    const ids = new Set<string>();
    for (const c of cues) {
      const scene = CONCEPT_SCENES.find((s) => s.id === c.scene);
      expect(scene, c.id).toBeDefined();
      expect(c.at, c.id).toBeGreaterThanOrEqual(scene!.start);
      expect(c.at, c.id).toBeLessThan(scene!.start + scene!.duration);
      expect(c.beat.length).toBeGreaterThan(0);
      expect(ids.has(c.id), c.id).toBe(false);
      ids.add(c.id);
      expect(c.gain).toBeGreaterThan(0);
      expect(c.gain).toBeLessThanOrEqual(1);
    }
    for (const s of CONCEPT_SCENES) expect(cues.some((c) => c.scene === s.id), s.id).toBe(true);
    expect(cues.length).toBeGreaterThan(150);
  });

  it('scene 1: a seed click on every hole arrival of the rolling seeds, the gasing spins into scene 2', () => {
    const arrivals = seedArrivals();
    expect(arrivals.length).toBeGreaterThan(12);
    const clicks = by('seed rolls into a hole').map((c) => c.at);
    expect(clicks).toEqual(arrivals.map((t) => Math.round(start.halaman + t)));
    // The Courtyard formula: u = (t − seedsFrom) / seedPeriod + i · seedPhase is an integer at each arrival.
    const { seedsFrom, seedPeriod, seedPhase, seeds } = BEATS.halaman;
    for (const t of arrivals) {
      const hit = Array.from({ length: seeds }, (_, i) => (t - seedsFrom) / seedPeriod + i * seedPhase).some((u) => Math.abs(u - Math.round(u)) < 1e-9);
      expect(hit).toBe(true);
    }
    const [gasing] = by('gasing spins');
    expect(gasing.ref.len! * 1000).toBeCloseTo(start.terlupa + BEATS.terlupa.dustFrom + 1500, 0);
  });

  it('scene 3: 12 ascending bonang notes across the light sweep (west → east), the GONG on the wordmark', () => {
    const notes = by('light sweeps west to east');
    expect(notes).toHaveLength(12);
    expect(notes[0].at).toBe(start.nusantara + BEATS.nusantara.lightFrom);
    expect(notes.at(-1)!.at).toBe(start.nusantara + BEATS.nusantara.lightTo);
    for (let i = 1; i < notes.length; i += 1) {
      expect(notes[i].ref.hz!).toBeGreaterThan(notes[i - 1].ref.hz!);
      expect(notes[i].pan!).toBeGreaterThan(notes[i - 1].pan!);
    }
    const [gong] = by('wordmark lands (GONG)');
    expect(gong.at).toBe(start.nusantara + BEATS.nusantara.wordmarkAt);
    expect(gong.ref).toEqual({ id: 'gong', hz: GONG_HZ });
  });

  it('scene 4: a swish per card, a tap where it lands, the stamp thump on its beat', () => {
    const { cardsFrom, cardStagger, cardFlight, stampAt, stampDrop } = BEATS.arsip;
    expect(by('card flies in').map((c) => c.at)).toEqual(Array.from({ length: ARCHIVE_CARD_COUNT }, (_, i) => start.arsip + cardsFrom + i * cardStagger));
    expect(easeOutBack(CARD_ARRIVAL)).toBeCloseTo(1, 6);
    expect(by('card lands')[0].at).toBe(Math.round(start.arsip + cardsFrom + CARD_ARRIVAL * cardFlight));
    expect(by('"Diperiksa kurator" stamp')[0].at).toBe(start.arsip + stampAt + stampDrop);
    expect(by('kendang').length).toBeGreaterThan(10);
  });

  it('scene 5: the dive whoosh spans the dive, chimes fall on the glow pulses', () => {
    const { diveFrom, diveTo, villageAt, ringPeriod, ringStagger, pavilionRing } = BEATS.jelajah;
    const [dive] = by('dive into Sumatera Selatan');
    expect(dive.at).toBe(start.jelajah + diveFrom);
    expect(dive.ref.len! * 1000).toBeCloseTo(diveTo - diveFrom, 0);
    const pav = by('pavilion glow pulses');
    expect(pav.length).toBeGreaterThanOrEqual(3);
    for (const c of pav) {
      const t = c.at - start.jelajah;
      expect(t).toBeGreaterThanOrEqual(villageAt);
      expect(((t + pavilionRing * ringStagger) % ringPeriod + ringPeriod) % ringPeriod).toBe(0); // Village.tsx: k wraps to 0
    }
    expect(ringPulses(0, 0, 3000)).toEqual([0, 1400, 2800]);
  });

  it('scene 6: one click per sown seed of the three real congklak moves, a chime per "+10 XP", the stamp slam on the shake', () => {
    const demo = buildCongklakDemo();
    const sown = demo.moves.reduce((n, m) => n + m.kinds.filter((k) => k === 'sow').length, 0);
    expect(sown).toBeGreaterThan(10);
    const clicks = by('seed sown');
    expect(clicks).toHaveLength(sown);
    const rates = new Set(clicks.map((c) => c.rate!.toFixed(3)));
    expect(rates.size).toBeGreaterThan(5); // pitch varies a little
    for (const c of clicks) expect(Math.abs(c.rate! - 1)).toBeLessThanOrEqual(0.08);
    const { moveStarts, moveDuration, stampAt, stampDrop } = BEATS.main;
    expect(by('"+10 XP" chip').map((c) => c.at)).toEqual(moveStarts.map((m) => start.main + m + moveDuration));
    expect(by('Paspor Budaya stamp slam')[0].at).toBe(start.main + stampAt + stampDrop);
  });

  it('scene 7: a kecapi pluck as each arc connects; scene 8: the final gong and the resolving chord', () => {
    const { arcsFrom, arcStagger, arcTravel, arcs } = BEATS.bersama;
    expect(by('arc connects').map((c) => c.at)).toEqual(Array.from({ length: arcs }, (_, i) => start.bersama + arcsFrom + i * arcStagger + arcTravel));
    expect(by('final gong')[0].at).toBe(start.mulai);
    const [chord] = by('resolving chord');
    expect(chord.at).toBe(start.mulai);
    // It rings out through the final hold.
    expect(start.mulai + chord.ref.len! * 1000).toBeGreaterThanOrEqual(CONCEPT_END_MS);
  });

  it('scene 2: the music lowpass falls and the pitch sags ("tape slowing"); both recover in scene 3', () => {
    const auto = buildConceptAutomation();
    expect(automationValueAt(auto, 'cutoff', start.terlupa - 500)).toBe(16000);
    expect(automationValueAt(auto, 'cutoff', start.terlupa + 3000)).toBe(650);
    expect(automationValueAt(auto, 'bend', start.terlupa + 3000)).toBeCloseTo(-0.06, 6);
    expect(automationValueAt(auto, 'cutoff', start.nusantara + BEATS.nusantara.gatherTo)).toBe(16000);
    expect(automationValueAt(auto, 'bend', start.arsip)).toBe(0);
    for (const a of auto) expect(CONCEPT_SCENES.some((s) => s.id === a.scene)).toBe(true);
  });

  it(`played in full (offline), no more than ${MAX_VOICES} voices ever sound together`, () => {
    const fake = new FakeAudioContext();
    const store = createBufferStore(asCtx(fake), { worker: false });
    store.renderNow(soundsInOrder(cues));
    const engine = createEngine(asCtx(fake), store);
    const scheduler = createScheduler({ engine, cues, automation: buildConceptAutomation(), group: 'concept' });
    scheduler.scheduleAll(0);
    for (const c of cues) expect(scheduler.fired.get(c.id), c.id).toBe(1);
    let worst = 0;
    for (let t = 0; t < CONCEPT_END_MS / 1000; t += 0.01) {
      worst = Math.max(worst, fake.soundingAt(t).filter((s) => s.stopAt === null || s.stopAt - t > 0.04).length);
    }
    expect(worst).toBeLessThanOrEqual(MAX_VOICES);
    expect(engine.peakVoices).toBeLessThanOrEqual(MAX_VOICES);
    console.info(`[phase-21] concept: ${cues.length} cues, ${soundsInOrder(cues).length} distinct sounds, at most ${worst} voices at once`);
  }, 60000);

  it('render order: the gong and the first scene first', () => {
    const order = soundsInOrder(cues).map((r) => JSON.stringify(r));
    expect(order[0]).toBe(JSON.stringify({ id: 'gong', hz: GONG_HZ }));
    const firstScene = new Set(cues.filter((c) => c.scene === 'halaman').map((c) => JSON.stringify(c.ref)));
    // gong, tick, then every sound of scene 1 before any other
    expect(new Set(order.slice(2, 2 + firstScene.size))).toEqual(firstScene);
    expect(new Set(order).size).toBe(order.length);
  });
});

describe('reduced motion soundtrack', () => {
  it('per still: the music bed and the scene key hits, inside the still', () => {
    const reduced = buildReducedCues();
    CONCEPT_SCENES.forEach((s, i) => {
      const mine = reduced.filter((c) => c.scene === s.id);
      expect(mine.some((c) => c.beat === 'music bed' && c.at === i * REDUCED_STEP_MS), s.id).toBe(true);
      expect(mine.some((c) => c.beat !== 'music bed'), s.id).toBe(true);
      for (const c of mine) {
        expect(c.at).toBeGreaterThanOrEqual(i * REDUCED_STEP_MS);
        expect(c.at).toBeLessThan((i + 1) * REDUCED_STEP_MS);
        expect(c.key).toBe(true);
      }
    });
    expect(reduced.length).toBeLessThan(buildConceptCues().length / 4);
  });
});

describe('voice-over hook', () => {
  it('no files are listed yet, so nothing is fetched', () => {
    expect(voiceOverPlan()).toEqual([]);
  });

  it('ducks the music by about 8 dB while a voice-over speaks', () => {
    const duck = voiceOverDuck(18000, 4000);
    expect(automationValueAt(duck, 'duck', 17000)).toBe(1);
    expect(20 * Math.log10(automationValueAt(duck, 'duck', 20000))).toBeCloseTo(-8, 3);
    expect(automationValueAt(duck, 'duck', 23000)).toBe(1);
  });

  it('the film is 48 s; nothing is scheduled after its end', () => {
    expect(Math.max(...cues.map((c) => c.at))).toBeLessThan(CONCEPT_TOTAL_MS);
  });
});
