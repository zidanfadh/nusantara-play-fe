'use client';

/**
 * "Cara bermain" (the implemented ruleset of the chosen variant, generated from rules.ts) and "Tentang
 * permainan ini" (that variant's published archive record, paraphrased and credited, with a link to its page).
 * Phase 23. Both reuse the native-<dialog> DemoDialog like congklak and gasing.
 */
import Link from 'next/link';
import { DemoDialog } from '@/components/jelajah/DemoDialog';
import { DEFAULT_RULES } from '@/lib/games/egrang/rules';
import {
  ABOUT_LINK,
  ABOUT_TEXT,
  ARCHIVE_RECORDS,
  RULES_CURATOR_NOTE,
  RULES_VARIANT_NOTE,
  SIMPLIFICATIONS,
  UI,
  VARIANT_TEXTS,
  aboutCredit,
  rulesSections,
} from '@/lib/games/egrang/texts';
import type { Variant } from '@/lib/games/egrang/types';
import { SWATCH_CSS } from './render';

export function RulesSheet({ open, onClose, variant }: { open: boolean; onClose: () => void; variant: Variant }) {
  return (
    <DemoDialog open={open} onClose={onClose} title={UI.rulesTitle} subtitle={`${VARIANT_TEXTS[variant].name} · ${DEFAULT_RULES.name}`}>
      <div className="flex items-center justify-center gap-4 text-xs" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="h-5 w-5 rounded-full" style={{ background: SWATCH_CSS[0] }} /> {UI.legendPlayer}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-5 w-5 rounded-full" style={{ background: SWATCH_CSS[1] }} /> {UI.legendComputer}
        </span>
      </div>
      <ol className="mt-4 space-y-3 text-sm leading-relaxed" data-testid="egrang-rules">
        {rulesSections(DEFAULT_RULES, variant).map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-text">{i + 1}</span>
            <p>
              <span className="font-semibold">{s.title}.</span> {s.text}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{UI.keyboardHint}</p>
      <div className="mt-3 space-y-1 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        <p>{RULES_VARIANT_NOTE}</p>
        <p>{SIMPLIFICATIONS[variant]}</p>
        <p className="font-semibold">{RULES_CURATOR_NOTE}</p>
      </div>
    </DemoDialog>
  );
}

export function AboutSheet({ open, onClose, variant }: { open: boolean; onClose: () => void; variant: Variant }) {
  const record = ARCHIVE_RECORDS[variant];
  return (
    <DemoDialog open={open} onClose={onClose} title={UI.about} subtitle={`${record.name} · ${record.province}`}>
      <div className="space-y-3 text-sm leading-relaxed" data-testid="egrang-about">
        {ABOUT_TEXT[variant].map((a) => (
          <section key={a.title}>
            <h3 className="font-semibold">{a.title}</h3>
            <p>{a.text}</p>
          </section>
        ))}
      </div>
      <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {aboutCredit(variant)}{' '}
        <Link href={record.href} prefetch={false} className="font-semibold text-primary-text underline-offset-2 hover:underline" data-testid="egrang-about-link">
          {ABOUT_LINK}
        </Link>
      </p>
    </DemoDialog>
  );
}
