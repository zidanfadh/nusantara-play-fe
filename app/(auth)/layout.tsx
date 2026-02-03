import { ReactNode } from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex w-full">
      {/* Brand Panel - Hidden on mobile, takes up 40% width on large screens */}
      <div className="hidden lg:flex w-[40%] bg-secondary relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Cultural Pattern Overlay (Abstract representation using CSS gradients) */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent scale-150" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

        {/* Decorative Circle representing Sun/Earth */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight">
             <div className="w-8 h-8 bg-accent rounded-sm rotate-45" />
             Nusantara Play
          </Link>
        </div>

        <div className="relative z-10 space-y-4 max-w-md">
          <blockquote className="text-lg font-medium leading-relaxed border-l-2 border-accent pl-4">
            &quot;Melestarikan permainan tradisional bukan hanya merawat kenangan, tapi menjaga identitas bangsa di era digital.&quot;
          </blockquote>
          <p className="text-sm opacity-80">
            Bergabunglah dengan ribuan pelestari budaya lainnya.
          </p>
        </div>

        <div className="relative z-10 text-xs opacity-60">
          &copy; {new Date().getFullYear()} Nusantara Play. Hak cipta dilindungi.
        </div>
      </div>

      {/* Form Container */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
           {children}
        </div>
      </div>
    </div>
  );
}
