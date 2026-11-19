/** Messages between the page and the congklak AI worker (Phase 17). Types only. */
import type { AiLevel } from './ai';
import type { CongklakRules } from './rules';
import type { CongklakState } from './state';

export interface AiRequest {
  id: number;
  state: CongklakState;
  level: AiLevel;
  seed: number;
  rules: CongklakRules;
  timeLimitMs?: number;
}

export type AiResponse =
  | { id: number; hole: number; depth: number; ms: number; error?: undefined }
  | { id: number; error: string; hole?: undefined };
