/**
 * The ONE pitch set of the sound engine (Phase 21): a pelog-inspired seven-tone scale. Gamelan tunings
 * differ from set to set; these cents are a common average of Javanese pelog, not any particular gamelan.
 *
 * Degree (pelog name)   cents   octave 0 (Hz)   octave -1   octave +1
 * 1 (panunggul)            0       293.7          146.8       587.3
 * 2 (gulu)               120       314.7          157.4       629.5
 * 3 (dhadha)             270       343.2          171.6       686.4
 * 4 (pelog)              540       401.2          200.6       802.3
 * 5 (lima)               675       433.7          216.8       867.4
 * 6 (nem)                785       462.1          231.1       924.3
 * 7 (barang)             950       508.3          254.2      1016.7
 *
 * Octave -2 of degree 1 (73.4 Hz) is the drone; the gong ageng sits at GONG_HZ (65 Hz), below the scale's
 * tonic like a real gong. Melodies mostly use the pelog bem subset 1 2 3 5 6.
 */

export const PELOG_TONIC_HZ = 293.66;
export const PELOG_CENTS = [0, 120, 270, 540, 675, 785, 950] as const;
export type PelogDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Frequency of a pelog degree (1..7) in an octave relative to the tonic's (0 = 293.7 Hz upwards). */
export function pelog(degree: PelogDegree, octave = 0): number {
  return PELOG_TONIC_HZ * 2 ** (PELOG_CENTS[degree - 1] / 1200 + octave);
}

/** Pelog bem (degrees 1 2 3 5 6), the pentatonic subset used for the melodies. */
export const BEM: readonly PelogDegree[] = [1, 2, 3, 5, 6];

/** The n-th note of pelog bem counted upwards from degree 1 of `baseOctave` (n may exceed 4). */
export function bemStep(n: number, baseOctave = 0): number {
  const octave = Math.floor(n / BEM.length);
  const k = ((n % BEM.length) + BEM.length) % BEM.length;
  return pelog(BEM[k], baseOctave + octave);
}

/** Gong ageng fundamental (Hz). */
export const GONG_HZ = 65;
