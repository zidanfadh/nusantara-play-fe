import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FEATURED_PROT_LIMIT, featuredProtQuery, onlyPublishedProt } from '@/components/landing/featured-prot';
import type { PROTEntity } from '@/types/prot';

const root = fileURLToPath(new URL('../../', import.meta.url));

const prot = (id: string, status: string) => ({ id, nama: id, status }) as unknown as PROTEntity;

describe('landing featured PROT: published only (Phase 19)', () => {
  it('requests status=ARSIP_NASIONAL, like the Jelajah map', () => {
    const q = new URLSearchParams(featuredProtQuery());
    expect(q.get('status')).toBe('ARSIP_NASIONAL');
    expect(q.get('page')).toBe('1');
    expect(q.get('limit')).toBe(String(FEATURED_PROT_LIMIT));
  });

  it('drops anything unpublished even if the API returned it (a curator token)', () => {
    const list = [prot('a', 'DRAFT'), prot('b', 'ARSIP_NASIONAL'), prot('c', 'MENUNGGU_KURASI'), prot('d', 'ARSIP_NASIONAL')];
    expect(onlyPublishedProt(list).map((p) => p.id)).toEqual(['b', 'd']);
    expect(onlyPublishedProt(undefined)).toEqual([]);
    expect(onlyPublishedProt(Array.from({ length: 9 }, (_, i) => prot(`p${i}`, 'ARSIP_NASIONAL')))).toHaveLength(FEATURED_PROT_LIMIT);
  });

  it('the landing page uses it for the featured cards', () => {
    const page = readFileSync(`${root}app/page.tsx`, 'utf8');
    expect(page).toMatch(/\/prot\?\$\{query\}/);
    expect(page).toContain('const query = featuredProtQuery();');
    expect(page).toContain('return onlyPublishedProt(result.data);');
    expect(page).not.toMatch(/limit:\s*'4',\s*\}\);/);
  });
});
