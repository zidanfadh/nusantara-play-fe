'use client';

import { useRouter } from 'next/navigation';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';

export default function ChangePasswordPage() {
  const router = useRouter();

  const handleSuccess = () => {
    // Redirect to profile or dashboard after successful password change
    router.push('/profile');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Kembali
        </button>

        <h1 className="text-3xl font-bold text-gray-900">Ubah Password</h1>
        <p className="mt-2 text-gray-600">
          Pastikan password baru Anda kuat dan mudah diingat
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <ChangePasswordForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">📌 Informasi Penting</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Setelah password diubah, Anda perlu login ulang dengan password baru</li>
          <li>Password tidak boleh sama dengan password sebelumnya</li>
          <li>Gunakan kombinasi huruf, angka, dan simbol untuk keamanan lebih baik</li>
          <li>Jangan bagikan password Anda kepada siapa pun</li>
        </ul>
      </div>
    </div>
  );
}
