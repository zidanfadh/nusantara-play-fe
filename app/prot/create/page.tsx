'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtForm } from '@/components/prot/ProtForm';
import { protApi } from '@/lib/api/prot';
import { PROTEntity } from '@/types/prot';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getDaerahAncestors } from '@/lib/api/daerah';

export default function CreateProtPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pakarProvinceKodes, setPakarProvinceKodes] = useState<string[] | undefined>(undefined);

  const isPakarWithoutDaerah = user?.role === 'pakar' && !user?.daerah_id;

  useEffect(() => {
    if (!user || user.role !== 'pakar' || !user.daerah_id) return;

    getDaerahAncestors(user.daerah_id)
      .then((ancestors) => {
        // First ancestor (index 0) is the province
        const province = ancestors[0];
        if (province?.kode) {
          setPakarProvinceKodes([province.kode]);
        }
      })
      .catch((err) => {
        console.error('Error fetching province for pakar:', err);
      });
  }, [user]);

  const handleSubmit = async (data: Partial<PROTEntity> & {
    fotoFiles?: File[];
    videoFiles?: File[];
    dokumenFiles?: File[];
    peralatanFotoFiles?: Record<number, File[]>;
    existingFotos?: string[];
    existingVideos?: string[];
    existingDokumen?: string[];
  }) => {
    setIsLoading(true);
    setError(null);

    let createdProtId: string | null = null;
    const uploadErrors: string[] = [];

    try {
      const { fotoFiles, videoFiles, dokumenFiles, peralatanFotoFiles, existingFotos, existingVideos, existingDokumen, ...protData } = data;

      const response = await protApi.create(protData);

      if (response && response.id) {
        createdProtId = response.id;

        if (fotoFiles && fotoFiles.length > 0) {
          try {
            const formData = new FormData();
            fotoFiles.forEach(file => { formData.append('files', file); });
            await protApi.uploadFoto(response.id, formData);
          } catch (uploadError: any) {
            uploadErrors.push(`Gagal upload foto: ${uploadError.message || 'Unknown error'}`);
          }
        }

        if (videoFiles && videoFiles.length > 0) {
          try {
            const formData = new FormData();
            videoFiles.forEach(file => { formData.append('files', file); });
            await protApi.uploadVideo(response.id, formData);
          } catch (uploadError: any) {
            uploadErrors.push(`Gagal upload video: ${uploadError.message || 'Unknown error'}`);
          }
        }

        if (dokumenFiles && dokumenFiles.length > 0) {
          try {
            const formData = new FormData();
            dokumenFiles.forEach(file => { formData.append('files', file); });
            await protApi.uploadDokumenKurikulum(response.id, formData);
          } catch (uploadError: any) {
            uploadErrors.push(`Gagal upload dokumen: ${uploadError.message || 'Unknown error'}`);
          }
        }

        if (peralatanFotoFiles) {
          for (const [indexStr, files] of Object.entries(peralatanFotoFiles)) {
            if (files && files.length > 0) {
              const peralatanIndex = parseInt(indexStr);
              try {
                const formData = new FormData();
                files.forEach(file => { formData.append('files', file); });
                await protApi.uploadFotoAlat(response.id, peralatanIndex, formData);
              } catch (uploadError: any) {
                uploadErrors.push(`Gagal upload foto alat [${peralatanIndex}]: ${uploadError.message || 'Unknown error'}`);
              }
            }
          }
        }

        router.push(`/prot/${response.id}`);
      } else {
        router.push('/prot');
      }
    } catch (err: any) {
      console.error('Failed to create PROT:', err);

      if (createdProtId) {
        setError(`Data PROT berhasil disimpan, namun ada masalah saat upload media: ${uploadErrors.join(', ')}. Anda dapat menambahkan foto/video/dokumen nanti melalui halaman edit.`);
        setTimeout(() => router.push(`/prot/${createdProtId}`), 3000);
      } else {
        setError('Gagal membuat data PROT. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-background">
         <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2 text-sm mb-2">
               <Link href="/" className="hover:text-primary">Beranda</Link>
               <span>/</span>
               <Link href="/prot" className="hover:text-primary">Daftar PROT</Link>
               <span>/</span>
               <span className="font-medium text-gray-900">Tambah Baru</span>
            </div>
            <h1 className="text-2xl font-bold">Tambah Permainan & Olahraga Tradisional</h1>
         </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-10">
        {error && (
            <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 text-sm">
                {error}
            </div>
        )}

        {userLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            <p className="mt-4 text-warm-label">Memuat...</p>
          </div>
        ) : isPakarWithoutDaerah ? (
          <div className="text-center py-12 bg-yellow-50 rounded-xl border border-yellow-200 px-6">
            <svg className="w-12 h-12 text-yellow-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-bold text-yellow-800 mb-2">Data Daerah Diperlukan</h3>
            <p className="text-yellow-700 mb-6 max-w-md mx-auto">
              Anda belum memiliki data daerah. Sebagai Pakar, Anda harus memperbarui profil dengan memilih daerah tempat Anda bertugas terlebih dahulu sebelum menambahkan PROT.
            </p>
            <Link href="/profile" className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Perbarui Profil
            </Link>
          </div>
        ) : (
          <ProtForm
              title="Form Data Baru"
              onSubmit={handleSubmit}
              isLoading={isLoading}
              provinceFilterKodes={pakarProvinceKodes}
          />
        )}
      </div>
    </>
  );
}
