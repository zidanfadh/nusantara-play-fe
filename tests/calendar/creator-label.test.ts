import { describe, expect, it } from 'vitest';
import { formatCreatorLabel } from '@/components/calendar/CalendarItemDetail';

describe('CalendarItemDetail creator label (Phase 07)', () => {
  it('shows "Name (email)" when the email is present', () => {
    expect(
      formatCreatorLabel({ full_name: 'DEMO Kurator', email: 'demo@example.test' }),
    ).toBe('DEMO Kurator (demo@example.test)');
  });

  it.each([undefined, null, '', '   '])(
    'shows only the name when the email is %j (public items, Phase 06 P1)',
    (email) => {
      expect(formatCreatorLabel({ full_name: 'DEMO Kurator', email })).toBe(
        'DEMO Kurator',
      );
    },
  );

  it('works with the public user shape returned by the backend', () => {
    const publicCreator = {
      id: '00000000-0000-4000-8000-00000000de01',
      full_name: 'DEMO Kurator',
      avatar_url: null,
      institution: null,
    };
    expect(formatCreatorLabel(publicCreator)).toBe('DEMO Kurator');
    expect(formatCreatorLabel(publicCreator)).not.toContain('(');
  });
});
