/**
 * Gable roofs of the procedural houses (Phase 22). One builder with a few switches gives each province's houses a
 * recognisable silhouette; they are loose low-poly hints ("terinspirasi"), not reconstructions, and the UI never
 * names them. The Phase 11 `limas` roof stays in village-geometry.ts.
 *
 * Roof frame: `a` runs along the ridge, `c` across it; `axis` says whether the ridge runs along the house's local x
 * (gable ends at the sides) or local z (a gable facing the front, +z).
 *
 * Only imported by lib/jelajah/three/* (three.js isolation).
 */
import { Color, Matrix4, Vector3 } from 'three';
import type { HouseDef, HouseStyle, SceneColors } from '@/lib/jelajah/scenes/types';
import type { Builder } from './mesh-builder';

export interface GableOptions {
  /** Direction of the ridge in the house's local frame. */
  axis: 'x' | 'z';
  /** Eave overhang beyond the walls on the two sloped sides (metres). */
  overhang: number;
  /** Overhang of the ridge beyond the gable walls. */
  endOverhang: number;
  /** Length of the crossed timbers at both ridge ends (0 = none). */
  crossedEnds: number;
  /** Nested decorative triangles on both gables. */
  gablePanel: boolean;
  /** Horizontal tiers on the front gable (needs axis 'z'; 0 = none). */
  tiers: number;
  /** A trim band under the eaves along the sloped sides. */
  eaveBand: boolean;
}

/** One preset per gable style. */
export const GABLE_STYLES: Readonly<Record<Exclude<HouseStyle, 'limas'>, GableOptions>> = {
  // Kepulauan Riau: a gable along the house with crossed ridge ends.
  malay: { axis: 'x', overhang: 0.6, endOverhang: 0.3, crossedEnds: 1.2, gablePanel: false, tiers: 0, eaveBand: false },
};

export function addGableRoof(b: Builder, m: Matrix4, h: HouseDef, c: SceneColors, o: GableOptions) {
  const roof = new Color(c.houseRoof);
  const roofDark = new Color(c.houseRoof).multiplyScalar(0.88);
  const wall = new Color(c.houseWall);
  const trim = new Color(c.houseTrim);
  const dark = new Color(c.housePost).multiplyScalar(0.7);
  const y0 = h.floorHeight + h.wallHeight;
  const rh = h.roofHeight;
  const top = y0 + rh;
  const A = (o.axis === 'x' ? h.width : h.depth) / 2;
  const C = (o.axis === 'x' ? h.depth : h.width) / 2;
  const AE = A + o.endOverhang;
  const CE = C + o.overhang;
  const ye = y0 - (o.overhang * rh) / C; // the slope continues past the wall
  // Roof frame (a along the ridge, c across) → house local coordinates.
  const P = (a: number, y: number, cc: number) => (o.axis === 'x' ? new Vector3(a, y, cc) : new Vector3(cc, y, a));
  const below = P(0, y0 - 1, 0);

  // The two slopes (the front-facing one a little lighter).
  b.quad(m, P(-AE, ye, CE), P(AE, ye, CE), P(AE, top, 0), P(-AE, top, 0), below, roof);
  b.quad(m, P(-AE, ye, -CE), P(AE, ye, -CE), P(AE, top, 0), P(-AE, top, 0), below, roofDark);
  // Gable walls up to the ridge.
  for (const s of [-1, 1]) b.tri(m, P(s * A, y0, C), P(s * A, y0, -C), P(s * A, top, 0), P(0, y0, 0), wall);
  // Ridge cap.
  boxAlong(b, m, o.axis, 2 * AE + 0.1, 0.14, 0.18, P(0, top + 0.03, 0), trim);

  if (o.gablePanel) {
    for (const s of [-1, 1]) {
      const at = (k: number) => s * (A + k);
      b.tri(m, P(at(0.03), y0 + 0.12, C * 0.74), P(at(0.03), y0 + 0.12, -C * 0.74), P(at(0.03), y0 + rh * 0.8, 0), P(0, y0, 0), trim);
      b.tri(m, P(at(0.05), y0 + 0.3, C * 0.42), P(at(0.05), y0 + 0.3, -C * 0.42), P(at(0.05), y0 + rh * 0.56, 0), P(0, y0, 0), dark);
    }
  }
  if (o.eaveBand) {
    for (const s of [-1, 1]) boxAlong(b, m, o.axis, 2 * A, 0.26, 0.06, P(0, y0 - 0.14, s * (C + 0.03)), trim);
  }
  if (o.tiers > 0) {
    // Horizontal tiers across the front gable, narrowing towards the ridge.
    for (let i = 0; i < o.tiers; i += 1) {
      const t = 0.18 + (i * 0.6) / o.tiers;
      const width = 2 * C * (1 - t) + 0.2;
      const p = P(A + 0.07, y0 + rh * t, 0);
      const local = new Matrix4().makeTranslation(p.x, p.y, p.z);
      b.box(m.clone().multiply(local), o.axis === 'z' ? width : 0.16, 0.16, o.axis === 'z' ? 0.16 : width, 0, 0, 0, trim);
    }
  }
  if (o.crossedEnds > 0) {
    const rise = top - ye;
    const len = o.crossedEnds;
    for (const end of [-AE, AE]) {
      for (const side of [-1, 1]) {
        const ridge = P(end, top, 0);
        const base = new Matrix4().makeTranslation(ridge.x, ridge.y, ridge.z);
        // Rotate the stick's local +y onto the extended roof edge (rising over the ridge to the other side).
        const rot =
          o.axis === 'x'
            ? new Matrix4().makeRotationX(Math.atan2(side * CE, rise))
            : new Matrix4().makeRotationZ(Math.atan2(-side * CE, rise));
        b.box(m.clone().multiply(base).multiply(rot), 0.11, len, 0.11, 0, len * 0.22, 0, trim);
      }
    }
  }
}

/** A box whose long side follows the ridge axis. */
function boxAlong(b: Builder, m: Matrix4, axis: 'x' | 'z', length: number, height: number, thick: number, at: Vector3, color: Color) {
  const local = new Matrix4().makeTranslation(at.x, at.y, at.z);
  if (axis === 'x') b.box(m.clone().multiply(local), length, height, thick, 0, 0, 0, color);
  else b.box(m.clone().multiply(local), thick, height, length, 0, 0, 0, color);
}
