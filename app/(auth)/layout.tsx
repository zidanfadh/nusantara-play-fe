import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SITE_NAME } from '@/lib/brand';
import { Logotype } from '@/components/brand/Logotype';
import { BatikBand, BatikCorner } from '@/components/brand/Batik';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex w-full">
      {/* Brand panel (Phase 27): the cover look in both themes. Dark brown, amber batik corners, the gradient
          logotype. Hidden on phones, 40% of the width on large screens. */}
      <div className="hidden lg:flex w-[40%] bg-brand-brown border-r border-brand-amber/30 relative overflow-hidden flex-col justify-between p-12 text-brand-cream">
        <BatikCorner corner="top-right" className="absolute right-0 top-0 w-36 xl:w-44 text-brand-amber!" />
        <BatikCorner corner="bottom-right" className="absolute right-0 bottom-0 w-36 xl:w-44 text-brand-amber!" />

        <div className="relative z-10">
          <Link href="/" aria-label={SITE_NAME} className="text-2xl xl:text-3xl">
            <Logotype variant="gradient" />
          </Link>
        </div>

        <div className="relative z-10 space-y-4 max-w-md">
          <blockquote className="text-lg font-medium leading-relaxed border-l-2 border-brand-amber pl-4">
            &quot;Melestarikan permainan tradisional bukan hanya merawat kenangan, tapi menjaga identitas bangsa di era digital.&quot;
          </blockquote>
          <p className="text-sm text-brand-cream/90">
            Bergabunglah dengan ribuan pelestari budaya lainnya.
          </p>
        </div>

        <div className="relative z-10 text-xs text-brand-cream/80">
          &copy; {new Date().getFullYear()} {SITE_NAME}. Hak cipta dilindungi.
        </div>
      </div>

      {/* Form Container */}
      <div className="flex-1 flex flex-col bg-background relative">
        <div className="lg:hidden">
          <BatikBand />
        </div>
        <div className="flex-1 flex items-center justify-center p-6 relative">
          <div className="absolute top-6 left-6 md:top-8 md:left-8">
            <Link
              href="/"
              className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Beranda
            </Link>
          </div>
          <div className="w-full max-w-md pt-12 lg:pt-0">
            <div className="mb-8 text-center lg:hidden">
              <Link href="/" aria-label={SITE_NAME} className="text-3xl">
                <Logotype />
              </Link>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
