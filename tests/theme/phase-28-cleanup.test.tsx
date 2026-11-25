/**
 * Phase 28 addendum: the Phase 27 cleanup items fixed (form hint overlap, Indonesian-only auth headings and Google
 * labels, accessible names, the border-input token on every text control, egrang start buttons without wrapping).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (p: string) => readFileSync(join(root, p), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(join(root, rel)).isDirectory() ? walk(rel) : rel.endsWith('.tsx') ? [rel] : [];
  });
}

/** The JSX tag starting at `start` (brace and quote aware). */
function tagAt(s: string, start: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start + 1; i < s.length; i += 1) {
    const ch = s[i];
    if (quote) {
      if (ch === quote && s[i - 1] !== '\\') quote = null;
    } else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '>' && depth === 0) return s.slice(start, i + 1);
  }
  return s.slice(start);
}

describe('auth pages: Indonesian only', () => {
  it('no English headings; Google buttons say "Masuk dengan Google" / "Daftar dengan Google"', () => {
    for (const p of ['app/(auth)/login/page.tsx', 'app/(auth)/signup/page.tsx', 'components/auth/SocialAuthButtons.tsx']) {
      expect(read(p)).not.toMatch(/Sign In|Create Account|Continue with Google/);
    }
    expect(read('components/auth/LoginForm.tsx')).toContain('label="Masuk dengan Google"');
    expect(read('components/auth/SignupForm.tsx')).toContain('label="Daftar dengan Google"');
    // One h1 per page: the Indonesian form heading.
    expect(read('components/auth/LoginForm.tsx')).toMatch(/<h1[^>]*>Masuk<\/h1>/);
    expect(read('components/auth/SignupForm.tsx')).toMatch(/<h1[^>]*>Daftar<\/h1>/);
  });
});

describe('accessible names', () => {
  it('the navbar account button and the landing carousel controls are named', () => {
    const nav = read('components/ui/UserNav.tsx');
    expect(nav.match(/aria-label=(?:"Menu akun"|\{`Menu akun)/g)).toHaveLength(2);
    const carousel = read('components/ui/HeroCarousel.tsx');
    for (const label of ['aria-label="Slide sebelumnya"', 'aria-label="Slide berikutnya"', 'aria-label={`Tampilkan slide ${idx + 1}`}'])
      expect(carousel).toContain(label);
  });

  it('every <select> on /prot, /events, /calendar and the PROT form has an id (with a label) or an aria-label', () => {
    for (const p of [
      'app/prot/page.tsx',
      'components/prot/ProtFilter.tsx',
      'components/events/EventFilter.tsx',
      'components/calendar/CalendarFilter.tsx',
      'components/prot/ProtForm.tsx',
      'components/daerah/ProvinceSelect.tsx',
      'components/daerah/KabupatenKotaSelect.tsx',
    ]) {
      const s = read(p);
      for (const m of s.matchAll(/<select\b/g)) {
        const tag = tagAt(s, m.index!);
        const id = tag.match(/\bid="([^"]+)"/)?.[1];
        const named = /aria-label=/.test(tag) || (id !== undefined && s.includes(`htmlFor="${id}"`));
        expect(named, `${p}: ${tag.slice(0, 80)}`).toBe(true);
      }
    }
  });
});

describe('form controls use the border-input token (3:1 boundary, WCAG 1.4.11)', () => {
  const files = [...walk('app'), ...walk('components')].filter((f) => !f.startsWith('app/landing-page/'));

  it('every text input, select and textarea has border-input (directly or through its shared class), never bg-input', () => {
    const missing: string[] = [];
    let checked = 0;
    for (const f of files) {
      const s = read(f);
      for (const m of s.matchAll(/<(input|select|textarea)\b/g)) {
        const tag = tagAt(s, m.index!);
        if (/type="(checkbox|radio|file|hidden|range|color)"/.test(tag)) continue;
        checked += 1;
        expect(tag, f).not.toMatch(/(?<![\w:/-])bg-input(?![\w/-])/);
        // ProtForm, ChangePasswordForm and EditProfileForm build the class from a shared constant / helper.
        const shared = /\b(inputCls|inputClass)\b/.test(tag);
        if (!tag.includes('border-input') && !shared) missing.push(`${f}: ${tag.slice(0, 70)}`);
      }
    }
    expect(missing).toEqual([]);
    expect(checked).toBeGreaterThan(100);
  });

  it('the shared input classes use the token too', () => {
    expect(read('components/prot/ProtForm.tsx')).toMatch(/const inputCls = '[^']*border-input/);
    expect(read('components/auth/ChangePasswordForm.tsx')).toContain("'border-input focus:border-primary'");
    expect(read('components/users/EditProfileForm.tsx')).toContain("'border-input focus:border-primary'");
  });
});

describe('layout fixes', () => {
  it('PROT form: the province hint has its own row (no negative margin over the "PROVINSI" label)', () => {
    const s = read('components/prot/ProtForm.tsx');
    const hint = s.indexOf('Provinsi dan kabupaten/kota');
    expect(s.slice(hint - 200, hint)).not.toContain('-mb-2');
    expect(s.slice(hint - 300, hint)).toContain('<div className="space-y-3">');
  });

  it('egrang start screen: the three buttons never wrap their labels', () => {
    const s = read('components/games/egrang/StartScreen.tsx');
    const buttons = [...s.matchAll(/<button\b/g)].map((m) => tagAt(s, m.index!)).filter((t) => /onStart|onRules|onAbout/.test(t));
    expect(buttons).toHaveLength(3);
    for (const b of buttons) expect(b).toContain('whitespace-nowrap');
  });
});
