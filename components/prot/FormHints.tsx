/**
 * Phase 26: small presentational pieces of the PROT form (badge, help text, character counter). No state.
 */
import { deskripsiCounter, JELAJAH_BADGE_LABEL } from '@/lib/prot/form-fields';

export function JelajahBadge() {
  return (
    <span
      data-jelajah-badge
      className="ml-2 inline-block align-middle rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider normal-case"
      title="Isian ini dipakai untuk tampilan di peta dan desa Jelajah"
    >
      {JELAJAH_BADGE_LABEL}
    </span>
  );
}

export function FieldHelp({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-xs text-warm-label leading-relaxed">
      {children}
    </p>
  );
}

export function DeskripsiCounter({ id, text }: { id: string; text: string | null | undefined }) {
  const counter = deskripsiCounter(text);
  return (
    <p
      id={id}
      aria-live="polite"
      data-over-jelajah={counter.overJelajah ? 'true' : 'false'}
      className={`mt-1 text-xs ${counter.overJelajah ? 'text-amber-700 dark:text-amber-400' : 'text-warm-label'}`}
    >
      {counter.text}
    </p>
  );
}
