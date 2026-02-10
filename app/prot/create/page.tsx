'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtForm } from '@/components/prot/ProtForm';
import { ProtNavigation } from '@/components/prot/ProtNavigation';
import { protApi } from '@/lib/api/prot';
import { PROTEntity } from '@/types/prot';

export default function CreateProtPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Partial<PROTEntity> & { 
    fotoFiles?: File[]; 
    videoFiles?: File[];
    existingFotos?: string[];
    existingVideos?: string[];
  }) => {
    setIsLoading(true);
    setError(null);
    
    let createdProtId: string | null = null;
    const uploadErrors: string[] = [];

    try {
      // Extract files and existing media from data (not needed for create)
      const { fotoFiles, videoFiles, existingFotos, existingVideos, ...protData } = data;

      // Create PROT first
      const response = await protApi.create(protData);
      
      if (response && response.id) {
        createdProtId = response.id;

        // Upload photos if any (batch upload) - don't block if upload fails
        if (fotoFiles && fotoFiles.length > 0) {
          try {
            const formData = new FormData();
            fotoFiles.forEach(file => {
              formData.append('files', file);
            });
            await protApi.uploadFoto(response.id, formData);
          } catch (uploadError: any) {
            console.error('Failed to upload photos:', uploadError);
            uploadErrors.push(`Gagal upload foto: ${uploadError.message || 'Unknown error'}`);
          }
        }

        // Upload videos if any (batch upload) - don't block if upload fails
        if (videoFiles && videoFiles.length > 0) {
          try {
            const formData = new FormData();
            videoFiles.forEach(file => {
              formData.append('files', file);
            });
            await protApi.uploadVideo(response.id, formData);
          } catch (uploadError: any) {
            console.error('Failed to upload videos:', uploadError);
            uploadErrors.push(`Gagal upload video: ${uploadError.message || 'Unknown error'}`);
          }
        }

        // Redirect even if upload fails - PROT data is saved
        router.push(`/prot/${response.id}`);
      } else {
        router.push('/prot');
      }
    } catch (err: any) {
      console.error('Failed to create PROT:', err);
      
      // If PROT was created but uploads failed, show different message
      if (createdProtId) {
        setError(`Data PROT berhasil disimpan, namun ada masalah saat upload media: ${uploadErrors.join(', ')}. Anda dapat menambahkan foto/video nanti melalui halaman edit.`);
        setTimeout(() => router.push(`/prot/${createdProtId}`), 3000);
      } else {
        setError('Gagal membuat data PROT. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header Navigation */}
      <ProtNavigation />

      {/* Breadcrumb */}
      <div className="bg-background border-b shadow-sm">
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                {error}
            </div>
        )}
        <ProtForm
            title="Form Data Baru"
            onSubmit={handleSubmit}
            isLoading={isLoading}
        />
      </div>
    </div>
  );
}
