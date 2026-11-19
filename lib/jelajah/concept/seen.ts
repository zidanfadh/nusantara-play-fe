/**
 * Has this browser seen the concept video? (Phase 19.) It plays by itself only on the first /jelajah
 * visit per browser: `localStorage['np_concept_seen_v1'] = '1'` once it has played (or was skipped).
 *
 * When localStorage is unavailable (missing, its getter throws, or reading or writing throws) it counts
 * as seen after one play in this tab: `sessionStorage['np_concept_seen_v1']`, and when that fails too an
 * in-memory flag for this page load. Every storage access is in try/catch. Shares the storage helpers of
 * the bumper's once-per-day rule (lib/jelajah/bumper/session.ts).
 */
import { browserStores, type BumperStores } from '../bumper/session';

export const CONCEPT_SEEN_KEY = 'np_concept_seen_v1';

let seenInMemory = false;

function read(store: BumperStores['local']): boolean {
  if (!store) return false;
  try {
    return store.getItem(CONCEPT_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function hasSeenConcept(stores: BumperStores = browserStores()): boolean {
  return seenInMemory || read(stores.local) || read(stores.session);
}

export function markConceptSeen(stores: BumperStores = browserStores()): void {
  seenInMemory = true;
  if (stores.local) {
    try {
      stores.local.setItem(CONCEPT_SEEN_KEY, '1');
      return;
    } catch {
      // blocked or full: remember it for this tab
    }
  }
  if (!stores.session) return;
  try {
    stores.session.setItem(CONCEPT_SEEN_KEY, '1');
  } catch {
    // the in-memory flag still covers this page load
  }
}

/** Tests only. */
export function resetConceptMemoryForTests(): void {
  seenInMemory = false;
}
