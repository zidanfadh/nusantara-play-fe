/**
 * Procedural low-poly pinisi-like ships and smoke puffs for the paper map (Phase 28). One geometry each, drawn as ONE
 * InstancedMesh each (all ships = 1 draw call, all puffs = 1 draw call). Vertex colours from the palette; no files.
 *
 * Ship model space: length along +x (bow at +x), up = +y, about 1 unit long at scale 1.
 */
import { BufferAttribute, BufferGeometry, Color, IcosahedronGeometry } from 'three';
import type { MapPalette } from '../palette';

type V = [number, number, number];

/** Ship size on the map (map units per model unit). */
export const SHIP_SCALE = 1.3;

export function shipGeometry(palette: Pick<MapPalette, 'hull' | 'sail' | 'earthBottom'>): BufferGeometry {
  const positions: number[] = [];
  const colours: number[] = [];
  const c = new Color();
  const face = (a: V, b: V, d: V, hex: string) => {
    c.set(hex);
    positions.push(...a, ...b, ...d);
    for (let k = 0; k < 3; k += 1) colours.push(c.r, c.g, c.b);
  };
  const quad = (a: V, b: V, d: V, e: V, hex: string) => {
    face(a, b, d, hex);
    face(a, d, e, hex);
  };

  // Hull: deck outline (y = 0.12) over a narrower keel outline (y = 0), bow and stern swept up a little.
  const deck: V[] = [[0.52, 0.17, 0], [0.24, 0.12, 0.13], [-0.34, 0.12, 0.14], [-0.47, 0.16, 0.08], [-0.47, 0.16, -0.08], [-0.34, 0.12, -0.14], [0.24, 0.12, -0.13]];
  const keel: V[] = [[0.38, 0, 0], [0.2, 0, 0.06], [-0.32, 0, 0.07], [-0.4, 0, 0.04], [-0.4, 0, -0.04], [-0.32, 0, -0.07], [0.2, 0, -0.06]];
  for (let k = 0; k < deck.length; k += 1) {
    const k2 = (k + 1) % deck.length;
    quad(keel[k], keel[k2], deck[k2], deck[k], palette.hull);
  }
  for (let k = 1; k + 1 < deck.length; k += 1) face(deck[0], deck[k], deck[k + 1], palette.earthBottom);

  // Two masts (thin triangular prisms).
  const mast = (x: number, h: number) => {
    const w = 0.016;
    const base: V[] = [[x + w, 0.12, 0], [x - w, 0.12, w], [x - w, 0.12, -w]];
    const top: V[] = base.map(([px, , pz]) => [px, h, pz]);
    for (let k = 0; k < 3; k += 1) quad(base[k], base[(k + 1) % 3], top[(k + 1) % 3], top[k], palette.hull);
  };
  mast(0.14, 1.02);
  mast(-0.16, 0.92);

  // Sails: each a shallow tent (two triangles meeting along the mast), so it never vanishes edge-on.
  const sail = (x: number, low: number, high: number, reach: number) => {
    const foot: V = [x + reach, low + 0.02, 0];
    face([x, low, 0], [x, high, 0], [foot[0], foot[1], 0.05], palette.sail);
    face([x, high, 0], [x, low, 0], [foot[0], foot[1], -0.05], palette.sail);
    face([x, high, 0], [foot[0], foot[1], 0.05], [foot[0], foot[1], -0.05], palette.sail);
  };
  sail(0.14, 0.2, 1.0, 0.34);
  sail(-0.16, 0.2, 0.9, 0.3);
  // Jib from the foremast to the bowsprit.
  face([0.15, 0.96, 0], [0.66, 0.18, 0.04], [0.18, 0.24, 0.03], palette.sail);
  face([0.15, 0.96, 0], [0.18, 0.24, -0.03], [0.66, 0.18, -0.04], palette.sail);

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(colours), 3));
  g.computeVertexNormals();
  return g;
}

/** A low-poly smoke puff (20 faces), radius 1; scaled per instance. */
export function puffGeometry(): BufferGeometry {
  return new IcosahedronGeometry(1, 0);
}
