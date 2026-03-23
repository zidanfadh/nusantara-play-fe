'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, CheckCircle } from 'lucide-react';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';

const securityTips = [
  'Minimal 8 karakter unik',
  'Kombinasi huruf besar & kecil',
  'Gunakan angka (0–9)',
  'Gunakan simbol (e.g. !@#)',
];

export default function ChangePasswordPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="group flex items-center gap-2 mb-10 text-primary font-semibold transition-all duration-300 hover:gap-3"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm uppercase tracking-widest">Kembali</span>
      </button>

      {/* Page Header */}
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-foreground mb-4">
          Ubah Password
        </h1>
        <p className="text-foreground/60 leading-relaxed">
          Pastikan keamanan akun Anda terjaga dengan menggunakan kombinasi kata sandi yang kuat dan unik.
        </p>
      </header>

      <div className="space-y-10">
        {/* Security Tips Box */}
        <div className="bg-warm-card rounded-xl p-8 border-l-4 border-primary/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-5 -translate-y-4 translate-x-4">
            <Shield className="w-36 h-36 text-primary" />
          </div>
          <h3 className="text-foreground font-bold mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Panduan Keamanan
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {securityTips.map((tip) => (
              <li key={tip} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground/60">{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Password Form Card */}
        <div className="bg-warm-card p-8 md:p-12 rounded-xl border-b-2 border-primary/10">
          <ChangePasswordForm
            onSuccess={() => router.push('/profile')}
            onCancel={() => router.back()}
          />
        </div>
      </div>

      {/* Footnote */}
      <p className="mt-12 text-center text-sm text-foreground/60 tracking-wide">
        Lupa password lama Anda?{' '}
        <a href="#" className="text-primary font-bold underline underline-offset-4">
          Hubungi Support
        </a>
      </p>
    </div>
  );
}
