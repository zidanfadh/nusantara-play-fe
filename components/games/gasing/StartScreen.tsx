'use client';

/** Start screen of the gasing page (Phase 20): mode (with a one-line explanation each) and difficulty. */
import { BookOpen, Info, Play } from 'lucide-react';
import type { ReactNode } from 'react';
import type { GasingSettings } from '@/lib/games/gasing/settings';
import { GAME_TAGLINE, GAME_TITLE, LEVEL_TEXTS, MODE_TEXTS, NO_DATA_NOTE, SETTINGS_NOTE, UI } from '@/lib/games/gasing/texts';
import type { AiLevel, GameMode } from '@/lib/games/gasing/types';

interface Props {
  settings: GasingSettings;
  onSettings: (s: GasingSettings) => void;
  onStart: () => void;
  onRules: () => void;
  onAbout: () => void;
  backLink?: ReactNode;
}

const optionClass = (on: boolean) =>
  `cursor-pointer rounded-xl border transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
    on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-card-foreground hover:bg-muted'
  }`;

export function StartScreen({ settings, onSettings, onStart, onRules, onAbout, backLink }: Props) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-3 sm:py-8" data-testid="gasing-start">
      {backLink}
      <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6">
        <h1 className="font-display text-2xl font-bold text-primary-text sm:text-3xl">{GAME_TITLE}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{GAME_TAGLINE}</p>

        <fieldset className="mt-3">
          <legend className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{UI.modeLegend}</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {MODE_TEXTS.map((m) => (
              <label key={m.value} className={`${optionClass(settings.mode === m.value)} flex flex-col px-3 py-2`}>
                <input
                  type="radio"
                  name="gasing-mode"
                  value={m.value}
                  checked={settings.mode === m.value}
                  onChange={() => onSettings({ ...settings, mode: m.value as GameMode })}
                  className="sr-only"
                />
                <span className="text-sm font-bold">{m.label}</span>
                <span className={`text-xs leading-snug ${settings.mode === m.value ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>{m.explain}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-3">
          <legend className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{UI.levelLegend}</legend>
          <div className="flex flex-wrap gap-1.5">
            {LEVEL_TEXTS.map((l) => (
              <label key={l.value} className={`${optionClass(settings.level === l.value)} px-3 py-1.5 text-sm font-semibold`}>
                <input
                  type="radio"
                  name="gasing-level"
                  value={l.value}
                  checked={settings.level === l.value}
                  onChange={() => onSettings({ ...settings, level: l.value as AiLevel })}
                  className="sr-only"
                />
                {l.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onStart}
            data-testid="gasing-mulai"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-base font-bold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring"
          >
            <Play className="h-5 w-5" aria-hidden /> {UI.start}
          </button>
          <button
            type="button"
            onClick={onRules}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BookOpen className="h-4 w-4" aria-hidden /> {UI.rules}
          </button>
          <button
            type="button"
            onClick={onAbout}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="gasing-about-open"
          >
            <Info className="h-4 w-4" aria-hidden /> {UI.about}
          </button>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {NO_DATA_NOTE} {SETTINGS_NOTE}
      </p>
    </div>
  );
}
