import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptySummaries, type JelajahData } from '@/lib/jelajah/data';
import { CONCEPT_SCENES, CONCEPT_TEXT } from '@/lib/jelajah/concept/script';
import { SITE_NAME } from '@/lib/brand';

const reducedMock = vi.hoisted(() => ({ value: false }));
vi.mock('@/lib/jelajah/use-reduced-motion', () => ({ useReducedMotion: () => reducedMock.value }));

const { default: ConceptVideo } = await import('@/components/jelajah/concept/ConceptVideo');

const data: JelajahData = { provinces: emptySummaries(), totalProt: 0, unassignedProt: 0 };

function render(tier: 'full' | 'lite' | '2d' | null = 'full') {
  return renderToStaticMarkup(<ConceptVideo data={data} status="ready" tier={tier} debug={false} onClose={() => {}} />);
}

describe('concept video player (Phase 19)', () => {
  afterEach(() => {
    reducedMock.value = false;
  });

  it('is a modal dialog named after the brand, with Lewati from second 0 and an aria-live caption', () => {
    const html = render();
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain(`aria-label="Pengenalan ${SITE_NAME}"`);
    expect(html).toContain(`aria-label="${CONCEPT_TEXT.dialogLabel}"`);
    expect(html).toContain(`>${CONCEPT_TEXT.skip}`);
    expect(html).toContain('aria-keyshortcuts="Escape"');
    expect(html).toMatch(/min-h-\[44px\] min-w-\[44px\]/);
    expect(html).toContain('aria-live="polite"');
    // The first caption is real text, twice: visible (aria-hidden) and in the live region.
    expect(html.split(CONCEPT_SCENES[0].caption).length - 1).toBe(2);
    expect(html).toContain('data-scene="halaman"');
    expect(html).toContain('tabindex="-1"');
  });

  it('reduced motion: still frames with a "Lanjut" button and no particle canvas', () => {
    reducedMock.value = true;
    const html = render('full');
    expect(html).toContain('data-reduced="1"');
    expect(html).toContain(CONCEPT_TEXT.next);
    expect(html).not.toContain('<canvas');
  });

  it('the particle canvas exists only on the full and lite tiers', () => {
    // The canvas is a client-only effect target; on the server it is rendered for full/lite, never for 2d.
    expect(render('full')).toContain('<canvas');
    expect(render('lite')).toContain('<canvas');
    expect(render('2d')).not.toContain('<canvas');
    expect(render(null)).not.toContain('<canvas');
  });

  it('no audio or video element: the sound is Web Audio (Phase 21)', () => {
    expect(render()).not.toMatch(/<audio|<video/);
  });

  it('without Web Audio (server, old browsers) it renders without sound controls and without errors', () => {
    const html = render();
    expect(html).not.toContain('data-sound-toggle');
    expect(html).not.toContain('data-sound-enable');
    // Lewati is still there, in the top-right group.
    expect(html).toContain(`>${CONCEPT_TEXT.skip}`);
  });
});
