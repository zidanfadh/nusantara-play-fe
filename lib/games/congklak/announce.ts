/**
 * Texts of the congklak page (Phase 17): player names, the screen-reader announcement after every move
 * (aria-live) and the result line. Pure.
 */
import type { MoveResult } from './engine';
import type { GameMode } from './settings';
import type { Player, Winner } from './state';

export function playerNames(mode: GameMode): [string, string] {
  return mode === 'komputer' ? ['Kamu', 'Komputer'] : ['Pemain 1', 'Pemain 2'];
}

/** "Kamu memainkan lubang 3. …" — holes are numbered 1 to 7 in sowing order on each side. */
export function describeMove(result: MoveResult, hole: number, names: [string, string]): string {
  const { summary, state } = result;
  const who = names[summary.player];
  const parts = [`${who} memainkan lubang ${hole + 1}, ${summary.sown} biji ditabur.`];
  if (summary.relays > 0) parts.push(`Lanjut menabur ${summary.relays} kali.`);
  if (summary.captured > 0) parts.push(`Menangkap ${summary.captured} biji ke lumbung.`);
  if (summary.safetyLimit) parts.push('Batas tabur tercapai, giliran berakhir.');
  if (state.over) {
    parts.push(resultText(state.winner as Winner, names));
  } else if (summary.extraTurn) {
    parts.push(`Biji terakhir masuk lumbung: ${who} main lagi.`);
  } else {
    parts.push(`Giliran ${names[state.toMove]}.`);
  }
  return parts.join(' ');
}

export function resultText(winner: Winner, names: [string, string]): string {
  if (winner === 'draw') return 'Permainan selesai: seri.';
  return `Permainan selesai: ${names[winner]} menang.`;
}

/** The end screen's heading. */
export function resultHeading(winner: Winner, names: [string, string], mode: GameMode): string {
  if (winner === 'draw') return 'Seri!';
  if (mode === 'komputer') return winner === 0 ? 'Kamu menang!' : 'Komputer menang';
  return `${names[winner]} menang!`;
}

export function turnText(player: Player, names: [string, string]): string {
  return `Giliran ${names[player]}`;
}
