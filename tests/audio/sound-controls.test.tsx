import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SOUND_TEXT, SoundControls } from '@/components/audio/SoundControls';
import type { SoundStatus } from '@/lib/audio/session';

const render = (status: SoundStatus, variant: 'film' | 'site' = 'film') =>
  renderToStaticMarkup(<SoundControls status={status} onToggle={() => {}} onEnable={() => {}} variant={variant} />);

describe('sound controls (Phase 21)', () => {
  it('sound on: a 44 px toggle named "Suara", pressed', () => {
    const html = render('on');
    expect(html).toContain('aria-label="Suara"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toMatch(/min-h-\[44px\] min-w-\[44px\]/);
    expect(SOUND_TEXT.toggle).toBe('Suara');
  });

  it('muted: the same toggle, not pressed', () => {
    expect(render('muted', 'site')).toContain('aria-pressed="false"');
  });

  it('autoplay blocked: a clear "Nyalakan suara" button instead', () => {
    const html = render('blocked');
    expect(html).toContain('Nyalakan suara');
    expect(html).not.toContain('aria-pressed');
  });

  it('no Web Audio: nothing', () => {
    expect(render('unsupported')).toBe('');
  });
});
