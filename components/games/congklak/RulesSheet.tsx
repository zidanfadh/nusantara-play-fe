'use client';

/** "Cara bermain" (Phase 17): exactly the implemented ruleset, generated from the rules config. */
import { DemoDialog } from '@/components/jelajah/DemoDialog';
import { DEFAULT_RULES } from '@/lib/games/congklak/rules';
import { RULES_VARIANT_NOTE, rulesSections } from '@/lib/games/congklak/rules-text';

function RulesIllustration() {
  const holes = Array.from({ length: 7 }, (_, i) => 66 + i * 31.5);
  return (
    <svg viewBox="0 0 320 130" className="mx-auto h-auto w-full max-w-sm" role="img" aria-label="Gambar papan: lubangmu di bawah, lumbungmu di kanan, biji ditabur berlawanan arah jarum jam.">
      <defs>
        <marker id="ck-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--color-primary)" />
        </marker>
      </defs>
      <rect x="10" y="22" width="300" height="80" rx="40" fill="#A9693A" />
      <ellipse cx="32" cy="62" rx="15" ry="30" fill="#5A3217" />
      <ellipse cx="288" cy="62" rx="15" ry="30" fill="#5A3217" />
      {holes.map((x) => (
        <g key={x}>
          <circle cx={x} cy="44" r="10" fill="#5A3217" />
          <circle cx={x} cy="80" r="10" fill="#5A3217" />
        </g>
      ))}
      <circle cx="66" cy="80" r="10" fill="none" stroke="#FFD86B" strokeWidth="2.5" />
      <path d="M 92 112 C 180 124, 262 120, 288 100" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" markerEnd="url(#ck-arrow)" />
      <path d="M 290 18 C 250 4, 120 4, 44 16" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeDasharray="5 4" markerEnd="url(#ck-arrow)" />
      <text x="160" y="128" textAnchor="middle" fontSize="11" fill="currentColor">Sisimu (7 lubang)</text>
      <text x="288" y="66" textAnchor="middle" fontSize="8" fontWeight="700" fill="#FFF1D6">Kamu</text>
      <text x="32" y="66" textAnchor="middle" fontSize="8" fontWeight="700" fill="#FFF1D6">Lawan</text>
    </svg>
  );
}

export function RulesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DemoDialog open={open} onClose={onClose} title="Cara bermain congklak" subtitle={DEFAULT_RULES.name}>
      <RulesIllustration />
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Lumbungmu di kanan, lumbung lawan di kiri. Biji ditabur berlawanan arah jarum jam.
        <br />
        Di ponsel yang dipegang tegak, papan diputar: sisimu di kanan, lumbungmu di atas.
      </p>
      <ol className="mt-4 space-y-3 text-sm leading-relaxed">
        {rulesSections(DEFAULT_RULES).map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <p>
              <span className="font-semibold">{s.title}.</span> {s.text}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">{RULES_VARIANT_NOTE}</p>
    </DemoDialog>
  );
}
