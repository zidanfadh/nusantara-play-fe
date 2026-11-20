/**
 * The synthesis core of the sound engine (Phase 21) in ONE self-contained function: seeded random
 * numbers, DSP helpers and every instrument and effect renderer. It renders into Float32Arrays sample
 * by sample (no Web Audio involved), so a sound is computed once, is identical in every browser and in
 * Node tests, and becomes an AudioBuffer only in `buffers.ts`.
 *
 * Why one function: the buffers are rendered in a Web Worker started from a Blob of
 * `soundCore.toString()` (`render-worker-source.ts`), like the congklak AI (lib/games/congklak/core.ts:
 * this Next.js version's Turbopack does not bundle `new Worker(new URL(...))`). The function must
 * therefore reference NOTHING outside its own body (only `import type` and plain globals like Math) and
 * keep to plain syntax: functions, objects, arrays; no classes, no async, no generators.
 * tests/audio/sound-core.test.ts runs the worker text in isolation.
 *
 * Every renderer returns 1 (mono) or 2 (stereo) channels normalized to a 0.9 peak; the cue sets the level.
 */

/** Every sound the engine can render. */
export type SoundId =
  | 'saron'
  | 'bonang'
  | 'gong'
  | 'dang'
  | 'tak'
  | 'kecapi'
  | 'pad'
  | 'drone'
  | 'whoosh'
  | 'wind'
  | 'gust'
  | 'dust'
  | 'paper'
  | 'tap'
  | 'stamp'
  | 'seed'
  | 'gasing'
  | 'cricket'
  | 'bird'
  | 'chime'
  | 'sparkle'
  | 'shimmer'
  | 'swell'
  | 'tick'
  // Phase 23 (egrang)
  | 'bamboo'
  | 'batok'
  | 'thud';

/**
 * A sound and its parameters: `hz` pitch, `notes` chord or arpeggio (Hz), `len` length in seconds (beds,
 * whooshes, pads), `v` variant number (clicks, chirps), `up` direction of a whoosh.
 */
export interface SoundRef {
  id: SoundId;
  hz?: number;
  notes?: readonly number[];
  len?: number;
  v?: number;
  up?: boolean;
}

export type Channels = Float32Array[];

export function soundCore() {
  // ---- random ---------------------------------------------------------------------------------------
  /** mulberry32: small, fast, seeded; numbers in [0, 1). */
  function seededRng(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** A stable 32-bit seed from a string (FNV-1a). */
  function seedFrom(text: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /** The cache key of a sound: the id and its parameters, rounded so equal sounds share one buffer. */
  function soundKey(ref: SoundRef): string {
    const parts: string[] = [ref.id];
    if (ref.hz !== undefined) parts.push('h' + ref.hz.toFixed(2));
    if (ref.notes) parts.push('n' + ref.notes.map((n) => n.toFixed(1)).join(','));
    if (ref.len !== undefined) parts.push('l' + ref.len.toFixed(2));
    if (ref.v !== undefined) parts.push('v' + ref.v);
    if (ref.up !== undefined) parts.push(ref.up ? 'up' : 'down');
    return parts.join('|');
  }

  // ---- DSP helpers ----------------------------------------------------------------------------------
  function samples(sr: number, seconds: number): Float32Array {
    return new Float32Array(Math.max(1, Math.ceil(sr * seconds)));
  }

  /**
   * Adds a decaying sine ("mode"): amp · e^(−t/decay) · sin(2πft + phase) from `start` s, with a linear
   * attack. A damped-resonator recurrence (two multiplies per sample). Skipped at or above Nyquist.
   */
  function addMode(out: Float32Array, sr: number, freq: number, amp: number, decay: number, start?: number, attack?: number, phase?: number): void {
    if (freq <= 0 || freq >= sr * 0.48 || amp === 0) return;
    const s0 = Math.round((start || 0) * sr);
    const att = Math.max(1, Math.round((attack === undefined ? 0.002 : attack) * sr));
    const w = (2 * Math.PI * freq) / sr;
    const r = Math.exp(-1 / (decay * sr));
    const c = 2 * r * Math.cos(w);
    const r2 = r * r;
    const ph = phase || 0;
    let y2 = (amp * Math.sin(ph - w)) / r;
    let y1 = amp * Math.sin(ph);
    const end = Math.min(out.length, s0 + Math.ceil(decay * sr * 9.3));
    for (let i = s0; i < end; i += 1) {
      const n = i - s0;
      out[i] += n < att ? (y1 * n) / att : y1;
      const y = c * y1 - r2 * y2;
      y2 = y1;
      y1 = y;
    }
  }

  type FilterType = 'lowpass' | 'highpass' | 'bandpass';

  function coefficients(type: FilterType, freq: number, q: number, sr: number): number[] {
    const f = Math.min(Math.max(freq, 10), sr * 0.45);
    const w = (2 * Math.PI * f) / sr;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    let b0 = alpha;
    let b1 = 0;
    let b2 = -alpha;
    if (type === 'lowpass') {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = b0;
    } else if (type === 'highpass') {
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = b0;
    }
    const a0 = 1 + alpha;
    return [b0 / a0, b1 / a0, b2 / a0, (-2 * cos) / a0, (1 - alpha) / a0];
  }

  /** RBJ biquad in place; `freq` may be a function of time in seconds (coefficients every 32 samples). */
  function filter(data: Float32Array, sr: number, type: FilterType, freq: number | ((t: number) => number), q?: number): Float32Array {
    const qq = q || 0.707;
    const sweep = typeof freq === 'function';
    let k = coefficients(type, sweep ? (freq as (t: number) => number)(0) : (freq as number), qq, sr);
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < data.length; i += 1) {
      if (sweep && (i & 31) === 0) k = coefficients(type, (freq as (t: number) => number)(i / sr), qq, sr);
      const x = data[i];
      const y = k[0] * x + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      data[i] = y;
    }
    return data;
  }

  function noise(n: number, rnd: () => number): Float32Array {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) out[i] = rnd() * 2 - 1;
    return out;
  }

  function shape(data: Float32Array, sr: number, env: (t: number) => number): Float32Array {
    for (let i = 0; i < data.length; i += 1) data[i] *= env(i / sr);
    return data;
  }

  function mix(out: Float32Array, src: Float32Array, gain: number, atSec?: number, sr?: number): void {
    const at = atSec && sr ? Math.round(atSec * sr) : 0;
    const n = Math.min(src.length, out.length - at);
    for (let i = 0; i < n; i += 1) out[at + i] += src[i] * gain;
  }

  /** Linear attack over `a` s, then exponential decay with time constant `d` s. */
  function ad(a: number, d: number) {
    return function (t: number) {
      return t < a ? t / a : Math.exp(-(t - a) / d);
    };
  }

  /** sin² rise over `rise` s, hold, sin² fall over `fall` s; total `len` s. */
  function swell(len: number, rise: number, fall: number) {
    return function (t: number) {
      if (t < rise) return Math.pow(Math.sin((Math.PI / 2) * (t / rise)), 2);
      if (t > len - fall) return Math.pow(Math.sin((Math.PI / 2) * Math.max(0, (len - t) / fall)), 2);
      return 1;
    };
  }

  /** Mallet or slap: a short bandpassed noise burst. */
  function burst(sr: number, rnd: () => number, seconds: number, centre: number, q: number, decay: number): Float32Array {
    const b = noise(Math.ceil(seconds * sr), rnd);
    filter(b, sr, 'bandpass', centre, q);
    return shape(b, sr, ad(0.0006, decay));
  }

  /** A sine whose frequency follows `freq(t)` (phase accumulation). */
  function glide(sr: number, seconds: number, freq: (t: number) => number, env: (t: number) => number): Float32Array {
    const out = samples(sr, seconds);
    let phase = 0;
    for (let i = 0; i < out.length; i += 1) {
      const t = i / sr;
      phase += (2 * Math.PI * freq(t)) / sr;
      out[i] = Math.sin(phase) * env(t);
    }
    return out;
  }

  /** Two decorrelated noise channels through the same filter and envelope (wide stereo beds). */
  function stereoNoise(sr: number, len: number, rnd: () => number, process: (ch: Float32Array) => void): Channels {
    const n = Math.ceil(len * sr);
    const l = noise(n, rnd);
    const r = noise(n, rnd);
    process(l);
    process(r);
    return [l, r];
  }

  function peakOf(chs: Channels): number {
    let peak = 0;
    for (let c = 0; c < chs.length; c += 1) {
      const ch = chs[c];
      for (let i = 0; i < ch.length; i += 1) {
        const a = ch[i] < 0 ? -ch[i] : ch[i];
        if (a > peak) peak = a;
      }
    }
    return peak;
  }

  /** Fades the last `fadeSec` to zero and scales to a 0.9 peak. */
  function finish(chs: Channels, sr: number, fadeSec?: number): Channels {
    const fade = Math.min(Math.round((fadeSec || 0.04) * sr), chs[0].length);
    for (let c = 0; c < chs.length; c += 1) {
      const ch = chs[c];
      for (let i = 0; i < fade; i += 1) ch[ch.length - 1 - i] *= i / fade;
    }
    const peak = peakOf(chs);
    if (peak > 0) {
      const k = 0.9 / peak;
      for (let c = 0; c < chs.length; c += 1) {
        const ch = chs[c];
        for (let i = 0; i < ch.length; i += 1) ch[i] *= k;
      }
    }
    return chs;
  }

  // ---- instruments ----------------------------------------------------------------------------------

  /**
   * Metallophone bar (saron) or kettle (bonang): additive inharmonic partials with exponential decays and
   * a mallet burst; two voices a few Hz apart beat against each other ("ombak", the gamelan shimmer).
   */
  function metallophone(sr: number, hz: number, rnd: () => number, kind: 'saron' | 'bonang'): Channels {
    const saron = kind === 'saron';
    const len = saron ? 2.6 : 2.0;
    const ratios = saron ? [1, 2.76, 5.4, 8.93] : [1, 2.01, 2.76, 4.1];
    const amps = saron ? [1, 0.38, 0.14, 0.05] : [1, 0.22, 0.16, 0.05];
    const decays = saron ? [1.7, 0.75, 0.32, 0.16] : [1.25, 0.6, 0.4, 0.22];
    const ombak = saron ? 4.6 : 3.2;
    const l = samples(sr, len);
    const r = samples(sr, len);
    for (let p = 0; p < ratios.length; p += 1) {
      const ph = rnd() * 6.28;
      addMode(l, sr, hz * ratios[p], amps[p], decays[p], 0, 0.0025, ph);
      addMode(r, sr, (hz + ombak) * ratios[p], amps[p] * 0.9, decays[p], 0, 0.0025, ph + 1);
      addMode(l, sr, (hz + ombak) * ratios[p], amps[p] * 0.35, decays[p], 0, 0.0025, ph + 2);
      addMode(r, sr, hz * ratios[p], amps[p] * 0.35, decays[p], 0, 0.0025, ph + 3);
    }
    const mallet = burst(sr, rnd, 0.03, saron ? 2600 : 1500, 1.2, 0.006);
    mix(l, mallet, 0.18);
    mix(r, mallet, 0.18);
    filter(l, sr, 'lowpass', 6500);
    filter(r, sr, 'lowpass', 6500);
    return finish([l, r], sr, 0.2);
  }

  /**
   * Gong ageng: a low fundamental (~65 Hz) and its partials, each pair a fraction of a Hz apart (slow
   * beating), a soft mallet thump and a ~6 s decay. The hero hit.
   */
  function gong(sr: number, hz: number, rnd: () => number): Channels {
    const len = 7.5;
    const l = samples(sr, len);
    const r = samples(sr, len);
    const ratios = [1, 1.49, 2.0, 2.44, 2.98, 4.1, 5.3];
    const amps = [1, 0.22, 0.55, 0.16, 0.2, 0.08, 0.05];
    const decays = [2.6, 1.3, 2.0, 1.0, 0.9, 0.5, 0.35];
    const beats = [0.75, 0.4, 1.3, 0.6, 0.9, 1.1, 1.4];
    for (let p = 0; p < ratios.length; p += 1) {
      const f = hz * ratios[p];
      const ph = rnd() * 6.28;
      addMode(l, sr, f, amps[p] * 0.6, decays[p], 0, 0.018, ph);
      addMode(l, sr, f + beats[p], amps[p] * 0.4, decays[p], 0, 0.018, ph + 0.7);
      addMode(r, sr, f + beats[p] * 0.5, amps[p] * 0.6, decays[p], 0, 0.018, ph + 1.4);
      addMode(r, sr, f - beats[p] * 0.5, amps[p] * 0.4, decays[p], 0, 0.018, ph + 2.1);
    }
    // Soft mallet: a low thump and a little felt noise.
    const thump = glide(sr, 0.25, (t) => 48 + 30 * Math.exp(-t / 0.03), ad(0.003, 0.07));
    const felt = burst(sr, rnd, 0.08, 400, 0.8, 0.02);
    mix(l, thump, 0.5);
    mix(r, thump, 0.5);
    mix(l, felt, 0.25);
    mix(r, felt, 0.25);
    filter(l, sr, 'lowpass', 3500);
    filter(r, sr, 'lowpass', 3500);
    return finish([l, r], sr, 0.6);
  }

  /** Kendang: a pitched membrane (sine with a fast pitch drop) plus a short noise slap. dang = low, tak = high. */
  function kendang(sr: number, rnd: () => number, high: boolean): Channels {
    const len = high ? 0.25 : 0.6;
    const out = high
      ? glide(sr, len, (t) => 380 + 160 * Math.exp(-t / 0.012), ad(0.001, 0.045))
      : glide(sr, len, (t) => 92 + 85 * Math.exp(-t / 0.035), ad(0.002, 0.16));
    if (!high) mix(out, glide(sr, 0.3, (t) => 150 + 60 * Math.exp(-t / 0.02), ad(0.002, 0.05)), 0.3);
    const slap = burst(sr, rnd, 0.06, high ? 2400 : 900, high ? 1.1 : 0.7, high ? 0.018 : 0.012);
    mix(out, slap, high ? 0.55 : 0.3);
    return finish([out], sr, 0.03);
  }

  /** Kecapi pluck: Karplus–Strong (a noise burst circulating in a tuned delay line with an averaging loss). */
  function kecapi(sr: number, hz: number, rnd: () => number): Channels {
    const len = 2.4;
    const out = samples(sr, len);
    const period = sr / hz;
    const n = Math.max(2, Math.floor(period));
    const frac = period - n - 0.5; // the two-point average adds half a sample of delay
    const fracDelay = frac < 0 ? frac + 1 : frac;
    const ap = (1 - fracDelay) / (1 + fracDelay);
    const line = new Float32Array(n);
    let lp = 0;
    for (let i = 0; i < n; i += 1) {
      lp += 0.5 * (rnd() * 2 - 1 - lp);
      line[i] = lp;
    }
    const loss = Math.pow(10, -3 / (1.9 * hz));
    let idx = 0;
    let apX = 0;
    let apY = 0;
    for (let i = 0; i < out.length; i += 1) {
      const cur = line[idx];
      const avg = 0.5 * (cur + line[(idx + 1) % n]) * loss;
      const y = ap * avg + apX - ap * apY;
      apX = avg;
      apY = y;
      out[i] = cur;
      line[idx] = y;
      idx = (idx + 1) % n;
    }
    // Pluck position and body: a gentle lowpass and a little attack softening.
    filter(out, sr, 'lowpass', 4200);
    shape(out, sr, (t) => Math.min(1, t / 0.002));
    return finish([out], sr, 0.15);
  }

  /** Warm pad: detuned soft triangles per note through a breathing lowpass, slow swell in and out. */
  function pad(sr: number, notes: readonly number[], len: number, rnd: () => number): Channels {
    const out: Channels = [samples(sr, len), samples(sr, len)];
    const detunes = [-7, 0, 7];
    for (let c = 0; c < 2; c += 1) {
      const ch = out[c];
      for (let k = 0; k < notes.length; k += 1) {
        for (let d = 0; d < detunes.length; d += 1) {
          const f = notes[k] * Math.pow(2, (detunes[d] + (c === 0 ? -2 : 2)) / 1200);
          const inc = f / sr;
          let p = rnd();
          const amp = 1 / (notes.length * detunes.length);
          for (let i = 0; i < ch.length; i += 1) {
            ch[i] += (4 * Math.abs(p - 0.5) - 1) * amp;
            p += inc;
            if (p >= 1) p -= 1;
          }
        }
      }
      filter(ch, sr, 'lowpass', (t) => 950 + 300 * Math.sin(2 * Math.PI * 0.11 * t + c), 0.8);
      shape(ch, sr, swell(len, Math.min(1.4, len / 3), Math.min(1.8, len / 3)));
    }
    return finish(out, sr, 0.05);
  }

  /** Low drone: a sine, two soft harmonics and a breath of filtered noise, slowly wavering. */
  function drone(sr: number, hz: number, len: number, rnd: () => number): Channels {
    const out = samples(sr, len);
    addMode(out, sr, hz, 1, 1e6, 0, 0.6);
    addMode(out, sr, hz * 2, 0.3, 1e6, 0, 0.6, 1);
    addMode(out, sr, hz * 3.01, 0.1, 1e6, 0, 0.6, 2);
    const breath = filter(noise(out.length, rnd), sr, 'lowpass', 380);
    mix(out, breath, 0.12);
    const env = swell(len, 1.0, 1.6);
    shape(out, sr, (t) => (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.21 * t)) * env(t));
    return finish([out], sr, 0.05);
  }

  /** Whoosh: bandpassed noise sweeping up (rise) or down (dive), wide stereo. */
  function whoosh(sr: number, len: number, up: boolean, rnd: () => number): Channels {
    const from = up ? 260 : 2800;
    const to = up ? 2600 : 180;
    const sweep = (t: number) => from * Math.pow(to / from, Math.min(1, t / len));
    const edges = swell(len, 0.05, 0.08);
    const env = up ? (t: number) => Math.pow(Math.min(1, t / len), 2.2) * edges(t) : swell(len, len * 0.22, len * 0.6);
    return finish(
      stereoNoise(sr, len, rnd, (ch) => {
        filter(ch, sr, 'bandpass', sweep, 1.1);
        shape(ch, sr, env);
      }),
      sr,
    );
  }

  /** Wind bed: lowpassed noise whose cutoff and level drift slowly. */
  function wind(sr: number, len: number, rnd: () => number): Channels {
    return finish(
      stereoNoise(sr, len, rnd, (ch) => {
        filter(ch, sr, 'lowpass', (t) => 420 + 260 * Math.sin(2 * Math.PI * 0.13 * t) + 120 * Math.sin(2 * Math.PI * 0.37 * t + 1), 0.9);
        filter(ch, sr, 'highpass', 90);
        const env = swell(len, 1.2, 1.4);
        shape(ch, sr, (t) => (0.7 + 0.3 * Math.sin(2 * Math.PI * 0.09 * t + 2)) * env(t));
      }),
      sr,
    );
  }

  /** A single gust: a band of noise rising and falling. */
  function gust(sr: number, len: number, rnd: () => number): Channels {
    return finish(
      stereoNoise(sr, len, rnd, (ch) => {
        filter(ch, sr, 'bandpass', (t) => 450 + 900 * Math.sin(Math.PI * Math.min(1, t / len)), 0.8);
        shape(ch, sr, swell(len, len * 0.35, len * 0.6));
      }),
      sr,
    );
  }

  /** Dust: fine crackle (sparse tiny impulses) over a soft high hiss, swelling and thinning out. */
  function dust(sr: number, len: number, rnd: () => number): Channels {
    const out: Channels = [samples(sr, len), samples(sr, len)];
    for (let c = 0; c < 2; c += 1) {
      const ch = out[c];
      const hiss = filter(noise(ch.length, rnd), sr, 'highpass', 2500);
      mix(ch, hiss, 0.08);
      const grains = Math.round(len * 55);
      for (let g = 0; g < grains; g += 1) {
        const at = Math.floor(rnd() * ch.length);
        const amp = 0.2 + rnd() * 0.5;
        for (let i = 0; i < 60 && at + i < ch.length; i += 1) ch[at + i] += (rnd() * 2 - 1) * amp * Math.exp(-i / 9);
      }
      filter(ch, sr, 'lowpass', 6000);
      shape(ch, sr, swell(len, len * 0.25, len * 0.6));
    }
    return finish(out, sr);
  }

  /** Paper swish: a short band of noise sweeping down. */
  function paper(sr: number, rnd: () => number): Channels {
    const len = 0.26;
    const out = noise(Math.ceil(len * sr), rnd);
    filter(out, sr, 'bandpass', (t) => 3600 - 6000 * t, 0.9);
    shape(out, sr, (t) => (t < 0.05 ? t / 0.05 : Math.exp(-(t - 0.05) / 0.06)));
    return finish([out], sr);
  }

  /** Soft tap: a card settling on a table. */
  function tap(sr: number, rnd: () => number): Channels {
    const out = burst(sr, rnd, 0.1, 900, 0.6, 0.012);
    addMode(out, sr, 190, 0.5, 0.03);
    return finish([out], sr);
  }

  /** Stamp: a low thump plus a paper slap. */
  function stamp(sr: number, rnd: () => number): Channels {
    const out = glide(sr, 0.5, (t) => 46 + 50 * Math.exp(-t / 0.025), ad(0.002, 0.11));
    mix(out, burst(sr, rnd, 0.12, 1700, 0.7, 0.03), 0.55);
    mix(out, burst(sr, rnd, 0.06, 350, 0.7, 0.015), 0.5);
    return finish([out], sr);
  }

  /** Congklak seed: a short wooden click (two resonances and a bandpassed tick); variants differ in pitch. */
  function seed(sr: number, rnd: () => number): Channels {
    const f = 2000 + rnd() * 500;
    const out = samples(sr, 0.09);
    addMode(out, sr, f, 1, 0.011, 0, 0.0004);
    addMode(out, sr, f * 1.58, 0.45, 0.007, 0, 0.0004);
    addMode(out, sr, 850 + rnd() * 120, 0.35, 0.02, 0, 0.0006);
    mix(out, burst(sr, rnd, 0.02, f, 5, 0.003), 0.5);
    return finish([out], sr, 0.01);
  }

  /** Gasing whirr: a bandpassed saw with a falling pitch and a fast tremolo, plus air hiss. */
  function gasing(sr: number, len: number, rnd: () => number): Channels {
    const out = samples(sr, len);
    let p = 0;
    for (let i = 0; i < out.length; i += 1) {
      const t = i / sr;
      const k = t / len;
      const f = 190 * (1 - 0.32 * k * k);
      p += f / sr;
      if (p >= 1) p -= 1;
      const trem = 0.65 + 0.35 * Math.sin(2 * Math.PI * (9 - 3 * k) * t);
      out[i] = (2 * p - 1) * trem;
    }
    filter(out, sr, 'bandpass', 950, 1.4);
    const hiss = filter(noise(out.length, rnd), sr, 'bandpass', 2600, 0.8);
    mix(out, hiss, 0.12);
    shape(out, sr, swell(len, 0.5, len * 0.3));
    return finish([out], sr);
  }

  /** Cricket: two groups of three short FM chirps around 4 kHz. */
  function cricket(sr: number, rnd: () => number): Channels {
    const len = 0.5;
    const carrier = 3900 + rnd() * 600;
    const out = samples(sr, len);
    for (let g = 0; g < 2; g += 1) {
      for (let k = 0; k < 3; k += 1) {
        const start = g * 0.24 + k * 0.034;
        const s0 = Math.round(start * sr);
        const n = Math.round(0.018 * sr);
        for (let i = 0; i < n && s0 + i < out.length; i += 1) {
          const t = i / sr;
          const fm = Math.sin(2 * Math.PI * 70 * t) * 2.2;
          out[s0 + i] += Math.sin(2 * Math.PI * carrier * t + fm) * Math.sin((Math.PI * i) / n);
        }
      }
    }
    filter(out, sr, 'lowpass', 6000);
    return finish([out], sr, 0.01);
  }

  /** Bird: two or three gliding FM syllables with vibrato. */
  function bird(sr: number, rnd: () => number): Channels {
    const syllables = 2 + Math.floor(rnd() * 2);
    const base = 2100 + rnd() * 700;
    const out = samples(sr, 0.7);
    let at = 0.02;
    for (let s = 0; s < syllables; s += 1) {
      const dur = 0.08 + rnd() * 0.07;
      const rise = 900 + rnd() * 600;
      const syl = glide(
        sr,
        dur,
        (t) => base + rise * Math.sin(Math.PI * (t / dur)) + 110 * Math.sin(2 * Math.PI * 32 * t),
        (t) => Math.pow(Math.sin(Math.PI * Math.min(1, t / dur)), 2),
      );
      mix(out, syl, 1 - s * 0.15, at, sr);
      at += dur + 0.04 + rnd() * 0.05;
    }
    filter(out, sr, 'lowpass', 5200);
    return finish([out], sr, 0.02);
  }

  /** Soft bell: bell-like partials with long decays and a slight beating pair. */
  function chime(sr: number, hz: number, rnd: () => number): Channels {
    const len = 2.6;
    const l = samples(sr, len);
    const r = samples(sr, len);
    const ratios = [1, 2.0, 3.01, 4.17, 5.43];
    const amps = [1, 0.45, 0.25, 0.12, 0.06];
    const decays = [2.0, 1.3, 0.9, 0.6, 0.4];
    for (let p = 0; p < ratios.length; p += 1) {
      const ph = rnd() * 6.28;
      addMode(l, sr, hz * ratios[p], amps[p], decays[p], 0, 0.004, ph);
      addMode(r, sr, (hz + 1.4) * ratios[p], amps[p], decays[p], 0, 0.004, ph + 1);
    }
    filter(l, sr, 'lowpass', 7000);
    filter(r, sr, 'lowpass', 7000);
    return finish([l, r], sr, 0.2);
  }

  /** "+10 XP" sparkle: a quick bright pelog arpeggio (the notes come from the cue) of short bells. */
  function sparkle(sr: number, notes: readonly number[], rnd: () => number): Channels {
    const len = 1.4;
    const l = samples(sr, len);
    const r = samples(sr, len);
    for (let k = 0; k < notes.length; k += 1) {
      const at = k * 0.055;
      const ph = rnd() * 6.28;
      const pan = notes.length > 1 ? k / (notes.length - 1) : 0.5;
      const ratios = [1, 2.0, 3.01];
      const amps = [1, 0.3, 0.12];
      for (let p = 0; p < ratios.length; p += 1) {
        addMode(l, sr, notes[k] * ratios[p], amps[p] * (1 - pan * 0.5), 0.55 / (p + 1), at, 0.002, ph);
        addMode(r, sr, (notes[k] + 2) * ratios[p], amps[p] * (0.5 + pan * 0.5), 0.55 / (p + 1), at, 0.002, ph + 1);
      }
    }
    filter(l, sr, 'lowpass', 7500);
    filter(r, sr, 'lowpass', 7500);
    return finish([l, r], sr, 0.1);
  }

  /** Shimmer: a cloud of soft high bell partials on the given notes, entering one after another. */
  function shimmer(sr: number, notes: readonly number[], len: number, rnd: () => number): Channels {
    const l = samples(sr, len);
    const r = samples(sr, len);
    for (let k = 0; k < 16; k += 1) {
      const f = notes[k % notes.length] * (1 + (rnd() - 0.5) * 0.004) * (k >= notes.length ? 2 : 1);
      const at = rnd() * Math.min(0.8, len / 3);
      const ch = rnd() < 0.5 ? l : r;
      addMode(ch, sr, f, 0.5 + rnd() * 0.5, 0.6 + rnd() * 1.2, at, 0.03, rnd() * 6.28);
    }
    filter(l, sr, 'lowpass', 7000);
    filter(r, sr, 'lowpass', 7000);
    return finish([l, r], sr, 0.3);
  }

  /** Rising swell: noise sweeping up plus the chord, both growing towards the end (where a hit lands). */
  function swellUp(sr: number, notes: readonly number[], len: number, rnd: () => number): Channels {
    const air = whoosh(sr, len, true, rnd);
    const tone = pad(sr, notes, len, rnd);
    const rise = (t: number) => Math.pow(Math.min(1, t / len), 1.6);
    for (let c = 0; c < 2; c += 1) {
      shape(tone[c], sr, rise);
      mix(tone[c], air[c], 0.35);
      shape(tone[c], sr, swell(len, 0.02, 0.06));
    }
    return finish(tone, sr, 0.03);
  }

  /**
   * Bamboo knock (Phase 23, egrang bambu steps): a hollow tube struck at its foot. A short tuned resonance
   * with a near-octave partial (an open tube), a woody third partial and a bright attack; variants (`v`)
   * are two different poles (left / right foot), a few semitones apart.
   */
  function bamboo(sr: number, v: number, rnd: () => number): Channels {
    const f = v === 1 ? 560 : 470;
    const out = samples(sr, 0.32);
    addMode(out, sr, f, 1, 0.075, 0, 0.0008);
    addMode(out, sr, f * 2.03, 0.42, 0.045, 0, 0.0008, 1.1);
    addMode(out, sr, f * 3.92, 0.14, 0.022, 0, 0.0008, 2.3);
    addMode(out, sr, 180, 0.35, 0.05, 0, 0.002);
    mix(out, burst(sr, rnd, 0.03, 1900, 1.4, 0.004), 0.45);
    filter(out, sr, 'lowpass', 5200);
    return finish([out], sr, 0.03);
  }

  /**
   * Coconut-shell "tok" (Phase 23, egrang batok steps): a small, hard, hollow shell on packed earth. A high
   * short resonance (the shell's cavity), a low body thump and a click; variants (`v`) = left / right shell.
   */
  function batokTok(sr: number, v: number, rnd: () => number): Channels {
    const f = v === 1 ? 1080 : 930;
    const out = samples(sr, 0.2);
    addMode(out, sr, f, 1, 0.032, 0, 0.0004);
    addMode(out, sr, f * 1.71, 0.3, 0.018, 0, 0.0004, 0.8);
    addMode(out, sr, 240, 0.55, 0.04, 0, 0.0015);
    mix(out, burst(sr, rnd, 0.02, 2600, 2, 0.003), 0.5);
    filter(out, sr, 'lowpass', 6500);
    return finish([out], sr, 0.02);
  }

  /**
   * Thud (Phase 23): a body landing on earth (a fall from the stilts, `v` 0) or a lighter stumble (a shell
   * slipping off, `v` 1): a falling low sine, a dull noise thump and a little scattered grit.
   */
  function thud(sr: number, v: number, rnd: () => number): Channels {
    const light = v === 1;
    const len = light ? 0.35 : 0.7;
    const out = glide(sr, len, (t) => (light ? 90 : 62) + (light ? 70 : 60) * Math.exp(-t / 0.03), ad(0.002, light ? 0.06 : 0.13));
    mix(out, filter(burst(sr, rnd, 0.2, 260, 0.6, light ? 0.03 : 0.06), sr, 'lowpass', 600), 0.7);
    const grit = filter(noise(Math.ceil(len * sr), rnd), sr, 'bandpass', 2200, 0.7);
    shape(grit, sr, (t) => (t < 0.02 ? 0 : Math.exp(-(t - 0.02) / 0.08)) * 0.25);
    mix(out, grit, light ? 0.3 : 0.45);
    return finish([out], sr, 0.05);
  }

  /** UI tick: a tiny bright click. */
  function tick(sr: number): Channels {
    const out = samples(sr, 0.06);
    addMode(out, sr, 1750, 1, 0.009, 0, 0.0003);
    addMode(out, sr, 3500, 0.2, 0.004, 0, 0.0003);
    return finish([out], sr, 0.005);
  }

  /**
   * Sample rate a sound is rendered at, from the engine's base rate (24 kHz): dark sounds (pads, drone,
   * gong, wind, gust, swell, gasing; nothing above ~5 kHz) at half of it, which halves their cost. The
   * browser resamples every buffer to the output rate when it plays.
   */
  function rateFor(id: SoundId, base: number): number {
    return id === 'pad' || id === 'drone' || id === 'gong' || id === 'wind' || id === 'gust' || id === 'swell' || id === 'gasing' ? base / 2 : base;
  }

  /** Renders a sound at sample rate `sr`. Deterministic: the random numbers are seeded from its key. */
  function renderSound(ref: SoundRef, sr: number): Channels {
    const rnd = seededRng(seedFrom(soundKey(ref)));
    const hz = ref.hz || 440;
    const notes = ref.notes || [hz];
    const len = ref.len || 2;
    switch (ref.id) {
      case 'saron':
        return metallophone(sr, hz, rnd, 'saron');
      case 'bonang':
        return metallophone(sr, hz, rnd, 'bonang');
      case 'gong':
        return gong(sr, hz, rnd);
      case 'dang':
        return kendang(sr, rnd, false);
      case 'tak':
        return kendang(sr, rnd, true);
      case 'kecapi':
        return kecapi(sr, hz, rnd);
      case 'pad':
        return pad(sr, notes, len, rnd);
      case 'drone':
        return drone(sr, hz, len, rnd);
      case 'whoosh':
        return whoosh(sr, len, !!ref.up, rnd);
      case 'wind':
        return wind(sr, len, rnd);
      case 'gust':
        return gust(sr, len, rnd);
      case 'dust':
        return dust(sr, len, rnd);
      case 'paper':
        return paper(sr, rnd);
      case 'tap':
        return tap(sr, rnd);
      case 'stamp':
        return stamp(sr, rnd);
      case 'seed':
        return seed(sr, rnd);
      case 'gasing':
        return gasing(sr, len, rnd);
      case 'cricket':
        return cricket(sr, rnd);
      case 'bird':
        return bird(sr, rnd);
      case 'chime':
        return chime(sr, hz, rnd);
      case 'sparkle':
        return sparkle(sr, notes, rnd);
      case 'shimmer':
        return shimmer(sr, notes, len, rnd);
      case 'swell':
        return swellUp(sr, notes, len, rnd);
      case 'bamboo':
        return bamboo(sr, ref.v || 0, rnd);
      case 'batok':
        return batokTok(sr, ref.v || 0, rnd);
      case 'thud':
        return thud(sr, ref.v || 0, rnd);
      default:
        return tick(sr);
    }
  }

  /**
   * Impulse response of the shared room reverb (a ConvolverNode, `engine.ts`): decorrelated stereo noise
   * with an exponential decay, darker as it decays. Seeded, so every render is the same.
   */
  function renderImpulse(sr: number, seconds: number, decay: number): Channels {
    const rnd = seededRng(seedFrom('impulse'));
    return stereoNoise(sr, seconds, rnd, (ch) => {
      filter(ch, sr, 'lowpass', (t) => 6000 * Math.exp(-t / 0.6) + 900, 0.6);
      shape(ch, sr, (t) => Math.exp(-t / decay) * Math.min(1, t / 0.004));
    });
  }

  return { seededRng, seedFrom, soundKey, rateFor, renderSound, renderImpulse, peakOf };
}

export type SoundCore = ReturnType<typeof soundCore>;
