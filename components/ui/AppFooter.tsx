import Link from 'next/link';
import { Globe, Share2, Send } from 'lucide-react';

export function AppFooter() {
  return (
    <footer className="bg-muted/50 w-full pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-1">
          <Link href="/" className="text-xl font-bold text-primary mb-4 block">
            Nusantara Legacy
          </Link>
          <p className="text-foreground/60 mb-8 leading-relaxed text-sm">
            Platform digital terdesentralisasi pertama yang fokus pada
            pelestarian warisan permainan tradisional Indonesia.
          </p>
          <div className="flex space-x-4">
            <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
              <Globe className="w-5 h-5" />
            </span>
            <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
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
                  className="text-foreground/60 hover:text-primary transition-all hover:translate-x-1 inline-block text-sm"
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
                  className="text-foreground/60 hover:text-primary transition-all hover:translate-x-1 inline-block text-sm"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="font-bold mb-6 text-foreground">Newsletter</h5>
          <p className="text-sm text-foreground/60 mb-4">
            Dapatkan update mingguan tentang warisan budaya terbaru.
          </p>
          <div className="flex">
            <input
              className="bg-muted border-none rounded-l-lg px-4 py-3 w-full focus:ring-1 focus:ring-primary text-sm"
              placeholder="Email Anda"
              type="email"
            />
            <button className="bg-primary text-primary-foreground px-4 py-3 rounded-r-lg hover:opacity-90 transition-opacity">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-border/10 text-center">
        <p className="text-foreground/60 text-sm">
          &copy; {new Date().getFullYear()} Nusantara Legacy. Menjaga Warisan,
          Memainkan Masa Depan.
        </p>
      </div>
    </footer>
  );
}
