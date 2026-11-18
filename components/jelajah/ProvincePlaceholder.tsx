'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { loadProvinceProt, type JelajahProt } from '@/lib/jelajah/data';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; prots: JelajahProt[] };

/** Province page placeholder until the V2 village scene exists. */
export function ProvincePlaceholder({ kode, nama }: { kode: string; nama: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let isMounted = true;
    loadProvinceProt(kode)
      .then((prots) => isMounted && setState({ status: 'ready', prots }))
      .catch(() => isMounted && setState({ status: 'error' }));
    return () => {
      isMounted = false;
    };
  }, [kode, refresh]);

  return (
    <div className="space-y-6">
      <Link
        href="/jelajah"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke peta
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Provinsi pilot</span>
          <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            Demo
          </span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">{nama}</h1>
      </header>

      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
        <p className="text-lg font-semibold text-foreground">Segera hadir</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Desa virtual {nama} sedang dibangun. Sementara itu, lihat PROT dari provinsi ini.
        </p>
      </div>

      <section aria-labelledby="prot-list" className="space-y-3">
        <h2 id="prot-list" className="text-xl font-bold text-foreground">
          PROT di {nama}
        </h2>
        {state.status === 'loading' && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {state.status === 'error' && (
          <div role="alert" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm">
            <p className="flex-1">Data PROT belum bisa dimuat.</p>
            <button
              type="button"
              onClick={() => {
                setState({ status: 'loading' });
                setRefresh((n) => n + 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Coba lagi
            </button>
          </div>
        )}
        {state.status === 'ready' && state.prots.length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada PROT berstatus Arsip Nasional di provinsi ini.</p>
        )}
        {state.status === 'ready' && state.prots.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {state.prots.map((prot) => (
              <li key={prot.id}>
                <Link
                  href={`/prot/${prot.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-2 transition-colors hover:bg-muted"
                >
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {prot.foto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prot.foto} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="font-medium text-foreground">{prot.nama}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
