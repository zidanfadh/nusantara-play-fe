import { describe, expect, it } from 'vitest';
import { describeMove, playerNames, resultHeading } from '@/lib/games/congklak/announce';
import { applyMove } from '@/lib/games/congklak/engine';
import { backLinkFor, congklakHref } from '@/lib/games/congklak/from-link';
import { boardGeometry, MAX_DRAWN_SEEDS, seedOffsets, SEED_RADIUS } from '@/lib/games/congklak/layout';
import { eventDelayMs, moveDurationMs } from '@/lib/games/congklak/playback';
import { DEFAULT_RULES } from '@/lib/games/congklak/rules';
import { RULES_VARIANT_NOTE, rulesSections } from '@/lib/games/congklak/rules-text';
import { DEFAULT_SETTINGS, loadSettings, parseSettings, saveSettings, SETTINGS_KEY } from '@/lib/games/congklak/settings';
import { createInitialState, pitCount } from '@/lib/games/congklak/state';
import { GAMES } from '@/lib/games/registry';

function memoryStorage() {
  const map = new Map<string, string>();
  return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
}
const throwing = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('congklak settings (localStorage, try/catch)', () => {
  it('round-trips mode, level and speed under a versioned key', () => {
    const s = memoryStorage();
    saveSettings({ mode: 'dua-pemain', level: 'sulit', speed: 'cepat' }, s);
    expect(SETTINGS_KEY).toBe('games.congklak.settings.v1');
    expect(JSON.parse(s.map.get(SETTINGS_KEY) as string)).toEqual({ mode: 'dua-pemain', level: 'sulit', speed: 'cepat' });
    expect(loadSettings(s)).toEqual({ mode: 'dua-pemain', level: 'sulit', speed: 'cepat' });
  });

  it('falls back to the defaults for missing, broken or unknown values', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{oops')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('42')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"mode":"online","level":"sulit","speed":9}')).toEqual({ ...DEFAULT_SETTINGS, level: 'sulit' });
  });

  it('never throws when storage throws or is missing', () => {
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, throwing)).not.toThrow();
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('congklak back link (from=...)', () => {
  it('jelajah-sumatera-selatan gives "Kembali ke desa"', () => {
    expect(backLinkFor('jelajah-sumatera-selatan')).toEqual({ href: '/jelajah/sumatera-selatan', label: 'Kembali ke desa' });
    expect(congklakHref('jelajah-sumatera-selatan')).toBe('/main/congklak?from=jelajah-sumatera-selatan');
    expect(congklakHref()).toBe('/main/congklak');
  });

  it('jelajah gives "Kembali ke peta"', () => {
    expect(backLinkFor('jelajah')).toEqual({ href: '/jelajah', label: 'Kembali ke peta' });
  });

  it.each([null, '', 'https://evil.example', '//evil.example', 'jelajah-unknown', 'jelajah-../x', 'Jelajah'])(
    'no link for %s',
    (v) => {
      expect(backLinkFor(v)).toBeNull();
    },
  );
});

describe('congklak rules text', () => {
  it('describes the configured board and says other versions exist', () => {
    const text = rulesSections(DEFAULT_RULES)
      .map((s) => s.text)
      .join(' ');
    expect(text).toContain('7 lubang kecil');
    expect(text).toContain('98 biji');
    expect(text).toContain('lumbung lawan dilewati');
    expect(text).not.toContain('melewati lumbungmu');
    expect(RULES_VARIANT_NOTE).toContain('berbeda-beda');
  });

  it('follows the capture switch', () => {
    const text = rulesSections({ ...DEFAULT_RULES, captureRequiresLap: true })
      .map((s) => s.text)
      .join(' ');
    expect(text).toContain('melewati lumbungmu setidaknya sekali');
  });
});

describe('congklak announcements', () => {
  it('describes an extra turn, a relay and the next player', () => {
    const names = playerNames('komputer');
    expect(describeMove(applyMove(createInitialState(0), 0), 0, names)).toBe(
      'Kamu memainkan lubang 1, 7 biji ditabur. Biji terakhir masuk lumbung: Kamu main lagi.',
    );
    const relay = describeMove(applyMove(createInitialState(0), 1), 1, names);
    expect(relay).toMatch(/^Kamu memainkan lubang 2, \d+ biji ditabur\. Lanjut menabur \d+ kali\./);
  });

  it('result headings', () => {
    expect(resultHeading(0, playerNames('komputer'), 'komputer')).toBe('Kamu menang!');
    expect(resultHeading(1, playerNames('komputer'), 'komputer')).toBe('Komputer menang');
    expect(resultHeading(1, playerNames('dua-pemain'), 'dua-pemain')).toBe('Pemain 2 menang!');
    expect(resultHeading('draw', playerNames('dua-pemain'), 'dua-pemain')).toBe('Seri!');
  });
});

describe('congklak board geometry', () => {
  it.each(['horizontal', 'vertical'] as const)('%s: every pit inside the board, no overlapping holes', (o) => {
    const g = boardGeometry(o);
    expect(g.pits).toHaveLength(pitCount(DEFAULT_RULES));
    for (const p of g.pits) {
      expect(p.x - p.rx).toBeGreaterThan(0);
      expect(p.x + p.rx).toBeLessThan(g.width);
      expect(p.y - p.ry).toBeGreaterThan(0);
      expect(p.y + p.ry).toBeLessThan(g.height);
    }
    const holes = g.pits.filter((p) => p.kind === 'hole');
    for (const a of holes) for (const b of holes) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.rx + b.rx);
  });

  it('vertical: stores at the top and bottom, two columns of 7', () => {
    const g = boardGeometry('vertical');
    expect(g.pits[7].y).toBeLessThan(g.pits[6].y);
    expect(g.pits[15].y).toBeGreaterThan(g.pits[14].y);
    expect(new Set(g.pits.filter((p) => p.kind === 'hole').map((p) => p.x)).size).toBe(2);
    expect(g.height).toBeGreaterThan(g.width);
  });

  it('sowing runs anticlockwise on screen', () => {
    for (const o of ['horizontal', 'vertical'] as const) {
      const pts = boardGeometry(o).pits;
      let sum = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        sum += a.x * b.y - b.x * a.y;
      }
      // SVG y points down, so an anticlockwise ring on screen has a negative shoelace sum.
      expect(sum).toBeLessThan(0);
    }
  });

  it('drawn seeds stay inside their pit', () => {
    const hole = boardGeometry('horizontal').pits[0];
    for (const o of seedOffsets(99, 'hole')) expect(Math.hypot(o.dx, o.dy) + SEED_RADIUS).toBeLessThanOrEqual(hole.rx);
    expect(seedOffsets(99, 'hole')).toHaveLength(MAX_DRAWN_SEEDS.hole);
    const store = boardGeometry('horizontal').pits[7];
    for (const o of seedOffsets(98, 'store')) {
      expect(Math.hypot(o.dx, o.dy) + SEED_RADIUS).toBeLessThanOrEqual(Math.min(store.rx, store.ry));
    }
  });
});

describe('congklak animation timing', () => {
  it('no delays without animation; Cepat is faster than Normal; long moves speed up', () => {
    const { events } = applyMove(createInitialState(0), 1);
    expect(moveDurationMs(events, 'tanpa')).toBe(0);
    expect(moveDurationMs(events, 'cepat')).toBeLessThan(moveDurationMs(events, 'normal'));
    const sow = { type: 'sow', pit: 1, count: 1, hand: 1 } as const;
    expect(eventDelayMs(sow, 100, 'normal')).toBeLessThan(eventDelayMs(sow, 1, 'normal'));
  });
});

describe('games list', () => {
  it('lists congklak, gasing (Phase 20) and egrang (Phase 23), under /main', () => {
    expect(GAMES.map((g) => g.href)).toEqual(['/main/congklak', '/main/gasing', '/main/egrang']);
    expect(new Set(GAMES.map((g) => g.slug)).size).toBe(GAMES.length);
  });
});
