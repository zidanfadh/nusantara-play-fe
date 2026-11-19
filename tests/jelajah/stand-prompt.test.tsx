import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EMPTY_STAND_SHORT, emptyStandMessage, StandPrompt } from '@/components/jelajah/StandPrompt';
import type { SceneProt } from '@/lib/jelajah/engine/scene-prot';

const noop = () => {};
const prot = { id: 'p1', nama: 'DEMO PROT Sumsel 1 dengan nama yang cukup panjang' } as SceneProt;

describe('StandPrompt (Phase 13 phone polish)', () => {
  it('phone, empty stand: only the short text, the full message waits for a tap', () => {
    const html = renderToStaticMarkup(
      <StandPrompt content={{ kind: 'empty' }} provinsiNama="Sumatera Selatan" compact onOpen={noop} />,
    );
    expect(html).toContain(EMPTY_STAND_SHORT);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain(emptyStandMessage('Sumatera Selatan'));
  });

  it('desktop, empty stand: the full neutral message', () => {
    const html = renderToStaticMarkup(
      <StandPrompt content={{ kind: 'empty' }} provinsiNama="Sumatera Selatan" compact={false} onOpen={noop} />,
    );
    expect(html).toContain('Segera hadir. Stand ini menunggu PROT dari Sumatera Selatan.');
  });

  it('phone, PROT stand: the name is clamped to two lines next to Lihat', () => {
    const html = renderToStaticMarkup(
      <StandPrompt content={{ kind: 'prot', prot }} provinsiNama="Sumatera Selatan" compact onOpen={noop} />,
    );
    expect(html).toContain('line-clamp-2');
    expect(html).toContain('>Lihat<');
  });

  it('notice board: the number of other PROT', () => {
    const html = renderToStaticMarkup(
      <StandPrompt content={{ kind: 'board', prots: [prot, prot] }} provinsiNama="X" compact={false} onOpen={noop} />,
    );
    expect(html).toContain('2 PROT lainnya');
  });
});
