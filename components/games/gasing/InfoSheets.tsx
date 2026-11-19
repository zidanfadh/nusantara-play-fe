'use client';

/**
 * "Cara bermain" (the implemented ruleset, generated from rules.ts) and "Tentang permainan ini" (the
 * published archive record, paraphrased and credited, with a link to its page). Phase 20. Both reuse the
 * native-<dialog> DemoDialog like congklak's rules sheet.
 */
import Link from 'next/link';
import { DemoDialog } from '@/components/jelajah/DemoDialog';
import { DEFAULT_RULES } from '@/lib/games/gasing/rules';
import {
  ABOUT_CREDIT,
  ABOUT_LINK,
  ABOUT_TEXT,
  ARCHIVE_RECORD,
  RULES_CURATOR_NOTE,
  RULES_VARIANT_NOTE,
  SIMPLIFICATIONS,
  UI,
  rulesSections,
} from '@/lib/games/gasing/texts';
import { SWATCH_CSS } from './render';

export function RulesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DemoDialog open={open} onClose={onClose} title={UI.rulesTitle} subtitle={DEFAULT_RULES.name}>
      <div className="flex items-center justify-center gap-4 text-xs" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="h-5 w-5 rounded-full" style={{ background: SWATCH_CSS[0] }} /> {UI.legendPlayer}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-5 w-5 rounded-full" style={{ background: SWATCH_CSS[1] }} /> {UI.legendComputer}
        </span>
      </div>
      <ol className="mt-4 space-y-3 text-sm leading-relaxed">
        {rulesSections(DEFAULT_RULES).map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
            <p>
              <span className="font-semibold">{s.title}.</span> {s.text}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{UI.keyboardHint}</p>
      <div className="mt-3 space-y-1 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        <p>{RULES_VARIANT_NOTE}</p>
        <p>{SIMPLIFICATIONS}</p>
        <p className="font-semibold">{RULES_CURATOR_NOTE}</p>
      </div>
    </DemoDialog>
  );
}

export function AboutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DemoDialog open={open} onClose={onClose} title={UI.about} subtitle={`${ARCHIVE_RECORD.name} · ${ARCHIVE_RECORD.province}`}>
      <div className="space-y-3 text-sm leading-relaxed" data-testid="gasing-about">
        {ABOUT_TEXT.map((a) => (
          <section key={a.title}>
            <h3 className="font-semibold">{a.title}</h3>
            <p>{a.text}</p>
          </section>
        ))}
      </div>
      <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {ABOUT_CREDIT}{' '}
        <Link href={ARCHIVE_RECORD.href} prefetch={false} className="font-semibold text-primary underline-offset-2 hover:underline" data-testid="gasing-about-link">
          {ABOUT_LINK}
        </Link>
      </p>
    </DemoDialog>
  );
}
