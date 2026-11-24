import Link from 'next/link';
import { Globe, Share2, Send } from 'lucide-react';
import { SITE_NAME } from '@/lib/brand';
import { Logotype } from '@/components/brand/Logotype';
import { BatikBand } from '@/components/brand/Batik';

/** Site footer (landing page and app pages). Phase 27: batik band on top, the logotype, AA-safe muted text. */
export function AppFooter({ className = '' }: { className?: string }) {
  return (
    <footer className={`bg-muted/50 w-full pb-8 ${className}`}>
      <BatikBand />
      <div className="max-w-7xl mx-auto px-6 pt-16 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-1">
          <Link href="/" className="mb-4 inline-block text-xl" aria-label={SITE_NAME}>
            <Logotype />
          </Link>
          <p className="text-muted-foreground mb-8 leading-relaxed text-sm">
            Platform digital terdesentralisasi pertama yang fokus pada
            pelestarian warisan permainan tradisional Indonesia.
          </p>
          <div className="flex space-x-4">
            <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary-text hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
              <Globe className="w-5 h-5" />
            </span>
            <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary-text hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
              <Share2 className="w-5 h-5" />
            </span>
          </div>
        </div>

        <div>
          <h5 className="font-bold mb-6 text-foreground">Platform</h5>
          <ul className="space-y-4">
            {[
              { label: 'Tentang Kami', href: '#tentang' },
              { label: 'Jelajahi Permainan', href: '/prot' },
              { label: 'Kontribusi Data', href: '/signup' },
              { label: 'Sertifikasi PROT', href: '/prot' },
            ].map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-muted-foreground hover:text-primary-text transition-all hover:translate-x-1 inline-block text-sm"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="font-bold mb-6 text-foreground">Dukungan</h5>
          <ul className="space-y-4">
            {[
              { label: 'Pusat Bantuan', href: '#' },
              { label: 'Syarat & Ketentuan', href: '#' },
              { label: 'Kebijakan Privasi', href: '#' },
              { label: 'Kontak', href: '#' },
            ].map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-muted-foreground hover:text-primary-text transition-all hover:translate-x-1 inline-block text-sm"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="font-bold mb-6 text-foreground">Newsletter</h5>
          <p className="text-sm text-muted-foreground mb-4">
            Dapatkan update mingguan tentang warisan budaya terbaru.
          </p>
          <div className="flex">
            <input
              aria-label="Email untuk newsletter"
              className="bg-surface-raised border border-input rounded-l-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-focus-ring text-sm"
              placeholder="Email Anda"
              type="email"
            />
            <button type="button" aria-label="Daftar newsletter" className="bg-primary text-primary-foreground px-4 py-3 rounded-r-lg hover:bg-primary-hover transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-border/10 text-center">
        <p className="text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} {SITE_NAME}. Menjaga Warisan,
          Memainkan Masa Depan.
        </p>
      </div>
    </footer>
  );
}
