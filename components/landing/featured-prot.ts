/**
 * Featured PROT of the landing page (Phase 19): only PUBLISHED PROT (status ARSIP_NASIONAL), requested
 * like the Jelajah map does. The page may send a curator's or admin's login token, and without the status
 * filter they would see unpublished PROT on the public landing page; the result is filtered again here
 * in case the API ever ignores the parameter.
 */
import { PUBLIC_PROT_STATUS } from '@/lib/jelajah/data';
import type { PROTEntity } from '@/types/prot';

export const FEATURED_PROT_LIMIT = 4;

/** Query of `GET /prot` for the featured cards. */
export function featuredProtQuery(): string {
  return new URLSearchParams({ page: '1', limit: String(FEATURED_PROT_LIMIT), status: PUBLIC_PROT_STATUS }).toString();
}

/** Only published PROT, at most FEATURED_PROT_LIMIT. */
export function onlyPublishedProt(list: readonly PROTEntity[] | null | undefined): PROTEntity[] {
  return (list ?? []).filter((p) => p?.status === PUBLIC_PROT_STATUS).slice(0, FEATURED_PROT_LIMIT);
}
