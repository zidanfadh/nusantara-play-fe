import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StandPanel } from '@/components/jelajah/StandPanel';
import type { SceneProt } from '@/lib/jelajah/engine/scene-prot';

const root = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Phase 23 (Phase 22 observation): on landscape phones the reward toast covered the PROT panel's title and close
 * button. The panel's whole header is now an avoided overlay, and the panel re-measures the overlays when it opens.
 */
describe('StandPanel keeps toasts off its header (Phase 23)', () => {
  const prot = { id: 'x', nama: 'Egrang Bambu', deskripsi: null, foto: null } as unknown as SceneProt;

  it('marks the header (title and close button) with data-toast-avoid', () => {
    const html = renderToStaticMarkup(<StandPanel content={{ kind: 'prot', prot }} onClose={() => {}} onSelectProt={() => {}} />);
    const header = /<div[^>]*data-testid="stand-panel-header"[^>]*>/.exec(html)?.[0] ?? '';
    expect(header).toContain('data-toast-avoid');
    // Title and close button are inside that header.
    const after = html.slice(html.indexOf(header));
    expect(after.indexOf('Egrang Bambu')).toBeLessThan(after.indexOf('</div></div>') + 200);
    expect(after).toContain('aria-label="Tutup"');
  });

  it('re-measures the overlays when it opens, after the next frame and when it closes', () => {
    const src = readFileSync(`${root}components/jelajah/StandPanel.tsx`, 'utf8');
    expect(src).toMatch(/useEffect\(\(\) => \{\s*placeToasts\(\);\s*const raf = requestAnimationFrame\(\(\) => placeToasts\(\)\);/);
  });
});
