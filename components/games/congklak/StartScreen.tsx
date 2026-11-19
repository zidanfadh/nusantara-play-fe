'use client';

/** Start screen of the congklak page (Phase 17): mode, difficulty, who starts, animation speed. */
import { BookOpen, Play } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AiLevel } from '@/lib/games/congklak/ai';
import type { AnimationSpeed, CongklakSettings, GameMode } from '@/lib/games/congklak/settings';

export type Starter = 'pertama' | 'kedua' | 'acak';

export const NO_DATA_NOTE = 'Permainan ini tidak menyimpan data apa pun.';

interface Option<T extends string> {
  value: T;
  label: string;
}

function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
              value === o.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-card-foreground hover:bg-muted'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface StartScreenProps {
  settings: CongklakSettings;
  starter: Starter;
  onSettings: (s: CongklakSettings) => void;
  onStarter: (s: Starter) => void;
  onStart: () => void;
  onRules: () => void;
  backLink?: ReactNode;
}

export function StartScreen({ settings, starter, onSettings, onStarter, onStart, onRules, backLink }: StartScreenProps) {
  const vsComputer = settings.mode === 'komputer';
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-3 sm:py-8" data-testid="congklak-start">
      {backLink}
      <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">Congklak</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kumpulkan biji sebanyak mungkin di lumbungmu.
        </p>

        <div className="mt-3 space-y-3">
          <Segmented<GameMode>
            legend="Mode"
            name="mode"
            value={settings.mode}
            options={[
              { value: 'komputer', label: 'Lawan komputer' },
              { value: 'dua-pemain', label: '2 pemain di satu perangkat' },
            ]}
            onChange={(mode) => onSettings({ ...settings, mode })}
          />
          {vsComputer && (
            <Segmented<AiLevel>
              legend="Tingkat kesulitan"
              name="level"
              value={settings.level}
              options={[
                { value: 'mudah', label: 'Mudah' },
                { value: 'sedang', label: 'Sedang' },
                { value: 'sulit', label: 'Sulit' },
              ]}
              onChange={(level) => onSettings({ ...settings, level })}
            />
          )}
          <Segmented<Starter>
            legend="Yang mulai"
            name="starter"
            value={starter}
            options={[
              { value: 'pertama', label: vsComputer ? 'Kamu' : 'Pemain 1' },
              { value: 'kedua', label: vsComputer ? 'Komputer' : 'Pemain 2' },
              { value: 'acak', label: 'Acak' },
            ]}
            onChange={onStarter}
          />
          <Segmented<AnimationSpeed>
            legend="Kecepatan animasi"
            name="speed"
            value={settings.speed}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'cepat', label: 'Cepat' },
              { value: 'tanpa', label: 'Tanpa animasi' },
            ]}
            onChange={(speed) => onSettings({ ...settings, speed })}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onStart}
            data-testid="congklak-mulai"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-base font-bold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring"
          >
            <Play className="h-5 w-5" aria-hidden /> Mulai main
          </button>
          <button
            type="button"
            onClick={onRules}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-base font-semibold transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BookOpen className="h-5 w-5" aria-hidden /> Cara bermain
          </button>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {NO_DATA_NOTE} Pilihan di atas hanya diingat di perangkat ini.
      </p>
    </div>
  );
}
