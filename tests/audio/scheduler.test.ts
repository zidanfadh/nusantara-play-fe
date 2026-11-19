import { describe, expect, it } from 'vitest';
import { createBufferStore } from '@/lib/audio/buffers';
import { createEngine } from '@/lib/audio/engine';
import { automationValueAt, createScheduler, type Automation, type Cue } from '@/lib/audio/scheduler';
import { asCtx, FakeAudioContext, type FakeParam } from './fake-audio';

const click = { id: 'seed', v: 0 } as const;
const bed = { id: 'wind', len: 3 } as const;

function cue(id: string, at: number, extra: Partial<Cue> = {}): Cue {
  return { id, at, ref: click, bus: 'sfx', gain: 0.5, scene: 's', beat: id, ...extra };
}

function setup(cues: Cue[], automation: Automation[] = [], opts: { render?: boolean } = {}) {
  const fake = new FakeAudioContext();
  const store = createBufferStore(asCtx(fake), { worker: false });
  if (opts.render !== false) store.renderNow([click, bed]);
  const engine = createEngine(asCtx(fake), store);
  const scheduler = createScheduler({ engine, cues, automation, group: 'film' });
  /** Advances the film clock and the audio clock together, frame by frame. */
  const play = (fromMs: number, toMs: number, frame = 16) => {
    for (let t = fromMs; t <= toMs; t += frame) {
      fake.currentTime = base + (t - fromMs) / 1000;
      scheduler.update(t, frame);
    }
    base = fake.currentTime;
  };
  let base = 0;
  const startedSources = () => fake.sources.filter((s) => s.startedAt !== null);
  return { fake, store, engine, scheduler, play, startedSources, setBase: (b: number) => (base = b) };
}

describe('cue scheduler (Phase 21)', () => {
  it('schedules only within the ~200 ms lookahead, at the mapped context time', () => {
    const { fake, scheduler, startedSources } = setup([cue('a', 100), cue('b', 190), cue('c', 450)]);
    fake.currentTime = 5;
    scheduler.update(0);
    expect(startedSources().map((s) => s.startedAt)).toEqual([5.1, 5.19]);
  });

  it('plays a sheet frame by frame: every cue exactly once, heard on its beat', () => {
    const cues = Array.from({ length: 40 }, (_, i) => cue(`c${i}`, 37 + i * 97));
    const { scheduler, play } = setup(cues);
    play(0, 4200);
    for (const c of cues) expect(scheduler.fired.get(c.id)).toBe(1);
    const worst = Math.max(...scheduler.log.map((e) => Math.abs(e.offsetMs)));
    expect(worst).toBeLessThan(1);
  });

  it('pause and resume (context suspended, clock stopped): nothing fires twice', () => {
    const cues = Array.from({ length: 20 }, (_, i) => cue(`c${i}`, i * 150));
    const { fake, scheduler, play } = setup(cues);
    play(0, 1000);
    // paused: neither clock moves; frames may still arrive with the same time
    for (let k = 0; k < 30; k += 1) scheduler.update(1000);
    void fake;
    play(1000, 3200);
    for (const c of cues) expect(scheduler.fired.get(c.id)).toBe(1);
  });

  it('seek forward: fades the group, skips short cues in the past, resumes a long one part-way, fires the rest once', () => {
    const cues = [cue('early', 100), cue('long bed', 200, { ref: bed, resumable: true }), cue('late', 2600), cue('later', 2900)];
    const { fake, scheduler, play } = setup(cues);
    play(0, 400);
    expect(scheduler.fired.get('early')).toBe(1);
    const bedSource = fake.sources.find((s) => s.buffer && s.buffer.duration > 2)!;
    scheduler.seek(2500);
    expect(bedSource.stopAt).not.toBeNull(); // faded out by the seek
    const resumed = fake.sources.filter((s) => s.buffer && s.buffer.duration > 2);
    expect(resumed).toHaveLength(2);
    expect(resumed[1].offset).toBeCloseTo(2.3, 2); // 2500 − 200 ms into the bed
    play(2500, 3200);
    expect(scheduler.fired.get('early')).toBe(1);
    expect(scheduler.fired.get('long bed')).toBe(2); // once per pass: played, then resumed after the seek
    expect(scheduler.fired.get('late')).toBe(1);
    expect(scheduler.fired.get('later')).toBe(1);
  });

  it('a clock jump is treated as a seek (no explicit call needed); a backward seek replays from there', () => {
    const cues = [cue('a', 100), cue('b', 1500)];
    const { scheduler, play, fake, setBase } = setup(cues);
    play(0, 300);
    fake.currentTime += 0.016;
    scheduler.update(1450); // jump
    setBase(fake.currentTime);
    play(1450, 1700);
    expect(scheduler.fired.get('a')).toBe(1);
    expect(scheduler.fired.get('b')).toBe(1);
    scheduler.update(50); // backwards
    setBase(fake.currentTime);
    play(50, 200);
    expect(scheduler.fired.get('a')).toBe(2);
  });

  it('a seek landing exactly on a cue fires it at once (reduced motion "Lanjut")', () => {
    const { fake, scheduler, startedSources } = setup([cue('still 2', 5000)]);
    fake.currentTime = 3;
    scheduler.update(1000);
    scheduler.seek(5000);
    expect(startedSources().map((s) => s.startedAt)).toEqual([3]);
  });

  it('drift between the clocks re-anchors: pending voices are rescheduled, still once each', () => {
    const cues = [cue('a', 150), cue('b', 180)];
    const { fake, scheduler, startedSources } = setup(cues);
    fake.currentTime = 1;
    scheduler.update(0); // both scheduled ahead: 1.15, 1.18
    fake.currentTime = 1.01; // the film clock ran 120 ms, the audio clock only 10 ms
    scheduler.update(120);
    const live = startedSources().filter((s) => s.stopCalls === 0 || (s.stopAt ?? 0) > (s.startedAt ?? 0));
    expect(live.map((s) => s.startedAt)).toEqual([1.04, 1.07]);
    expect(scheduler.fired.get('a')).toBe(1);
    expect(scheduler.fired.get('b')).toBe(1);
  });

  it('stop: fades the group out and ignores later frames', () => {
    const { fake, scheduler, play } = setup([cue('bed', 0, { ref: bed }), cue('later', 1000)]);
    play(0, 200);
    scheduler.stop(300);
    expect(fake.sources[0].stopAt).toBeCloseTo(fake.currentTime + 0.32, 3);
    play(200, 1200);
    expect(scheduler.fired.get('later')).toBeUndefined();
  });

  it('a sound rendered late: a short cue is skipped, a resumable one starts part-way', () => {
    const cues = [cue('click', 50), cue('bed', 60, { ref: bed, resumable: true })];
    const { store, scheduler, play, fake } = setup(cues, [], { render: false });
    play(0, 500);
    expect(fake.sources.filter((s) => s.startedAt !== null)).toHaveLength(0);
    store.renderNow([click, bed]);
    play(500, 600);
    expect(scheduler.fired.get('click')).toBeUndefined();
    expect(scheduler.fired.get('bed')).toBe(1);
    expect(fake.sources.find((s) => s.startedAt !== null)!.offset).toBeGreaterThan(0.4);
  });

  it('automation ramps on the same clock; after a seek the parameter jumps to its value there', () => {
    const auto: Automation[] = [{ param: 'cutoff', from: 1000, to: 2000, v0: 16000, v1: 650, curve: 'exp', scene: 's' }];
    expect(automationValueAt(auto, 'cutoff', 0)).toBe(16000);
    expect(automationValueAt(auto, 'cutoff', 2500)).toBe(650);
    expect(automationValueAt(auto, 'cutoff', 1500)).toBeCloseTo(Math.sqrt(16000 * 650), 0);
    const { engine, scheduler, play } = setup([cue('x', 3000)], auto);
    const cutoff = engine.params.cutoff as unknown as FakeParam;
    play(0, 900);
    expect(cutoff.events.some((e) => e.type === 'exp' && e.value === 650)).toBe(true);
    scheduler.seek(1500);
    const set = cutoff.events.filter((e) => e.type === 'set').at(-1)!;
    expect(set.value).toBeCloseTo(Math.sqrt(16000 * 650), 0);
  });

  it('offline: scheduleAll places every cue at its time', () => {
    const cues = [cue('a', 0), cue('b', 1234), cue('c', 40000)];
    const { scheduler, startedSources } = setup(cues);
    scheduler.scheduleAll(0.5);
    expect(startedSources().map((s) => s.startedAt)).toEqual([0.5, 1.734, 40.5]);
  });
});
