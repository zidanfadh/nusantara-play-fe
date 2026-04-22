"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { nftsApi } from '@/lib/api/nfts';
import { useNft } from '@/hooks/useNft';
import { ArrowLeft, Upload, Loader2, Save, Trash2 } from 'lucide-react';
import { UpdateNftPayload } from '@/types/nfts';

export default function EditNftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { nft, loading: isLoadingNft, error: fetchError } = useNft(id, 'id');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<UpdateNftPayload>({});
  
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [existingGallery, setExistingGallery] = useState<string[]>([]);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string>('');

  useEffect(() => {
    if (nft) {
      setFormData({
        nama: nft.nama,
        slug: nft.slug,
        deskripsi: nft.deskripsi || '',
        about: nft.about || '',
        blockchain_network: nft.blockchain_network,
        contract_address: nft.contract_address,
        token_id: nft.token_id,
        token_standard: nft.token_standard || '',
        marketplace_name: nft.marketplace_name || '',
        marketplace_url: nft.marketplace_url || '',
        external_url: nft.external_url || '',
      });
      setExistingGallery(nft.gallery_urls || []);
      if (nft.image_url) setExistingCoverUrl(nft.image_url);
    }
  }, [nft]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setCoverFile(e.target.files[0]);
  };
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setGalleryFiles(Array.from(e.target.files));
  };

  const handleRemoveExistingGallery = (url: string) => {
    setExistingGallery(prev => prev.filter(u => u !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let image_url = existingCoverUrl || undefined;
      
      if (coverFile) {
        const coverUpload = await nftsApi.uploadImage(coverFile);
        image_url = coverUpload.url;
      }

      const newGalleryUrls: string[] = [...existingGallery];
      for (const file of galleryFiles) {
        const upload = await nftsApi.uploadImage(file);
        newGalleryUrls.push(upload.url);
      }

      await nftsApi.update(id, {
        ...formData,
        image_url,
        gallery_urls: newGalleryUrls.length > 0 ? newGalleryUrls : undefined,
      });

      router.push('/admin/nfts');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan perubahan NFT');
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingNft) {
    return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /><p className="mt-2 text-sm text-muted-foreground">Memuat data...</p></div>;
  }

  if (fetchError || !nft) {
    return <div className="p-8 text-center text-destructive">Data NFT tidak ditemukan atau gagal dimuat.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/admin/nfts" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </Link>

      <div className="bg-card shadow-sm rounded-xl p-6 sm:p-8 border">
        <h1 className="text-2xl font-bold mb-6">Edit NFT Catalog</h1>

        {error && <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-8">
           <section className="space-y-4">
             {/* Same fields largely, shortened for brevity but functional */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="text-sm font-medium mb-1 block">Nama NFT *</label>
                  <input required name="nama" value={formData.nama || ''} onChange={handleChange} className="w-full border rounded-md h-10 px-3 text-sm focus:ring-1 focus:ring-primary" />
               </div>
               <div>
                  <label className="text-sm font-medium mb-1 block">Slug *</label>
                  <input required name="slug" value={formData.slug || ''} onChange={handleChange} className="w-full border rounded-md h-10 px-3 text-sm font-mono focus:ring-1 focus:ring-primary" />
               </div>
             </div>
             
             <div className="space-y-2">
                <label className="text-sm font-medium block">Deskripsi Singkat</label>
                <textarea name="deskripsi" value={formData.deskripsi || ''} onChange={handleChange} className="w-full border rounded-md p-3 text-sm min-h-[80px]" />
             </div>
           </section>

           <section className="space-y-4 border-t pt-4">
              <h2 className="font-bold relative flex items-center justify-between text-lg">Media & Blockchain Detail</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-medium mb-1 block">Cover Image (Ganti File)</label>
                    <input type="file" accept="image/*" onChange={handleCoverChange} className="w-full text-sm block" />
                    {existingCoverUrl && !coverFile && <img src={existingCoverUrl} className="h-16 mt-2 rounded border" alt="Current Cover"/>}
                 </div>
                 <div>
                    <label className="text-sm font-medium mb-1 block">Tambah Gallery Images</label>
                    <input type="file" multiple accept="image/*" onChange={handleGalleryChange} className="w-full text-sm block" />
                    <div className="flex gap-2 flex-wrap mt-2">
                      {existingGallery.map((url, i) => (
                        <div key={i} className="relative group">
                          <img src={url} className="h-16 w-16 object-cover rounded border" alt="Gallery"/>
                          <button type="button" onClick={() => handleRemoveExistingGallery(url)} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 rounded">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                 <div>
                    <label className="text-sm font-medium block h-6">Network*</label>
                    <input required name="blockchain_network" value={formData.blockchain_network || ''} onChange={handleChange} className="w-full border rounded-md h-10 px-3 text-sm uppercase" />
                 </div>
                 <div>
                    <label className="text-sm font-medium block h-6">Contract Address*</label>
                    <input required name="contract_address" value={formData.contract_address || ''} onChange={handleChange} className="w-full border rounded-md h-10 px-3 text-sm font-mono" />
                 </div>
                 <div>
                    <label className="text-sm font-medium block h-6">Token ID*</label>
                    <input required name="token_id" value={formData.token_id || ''} onChange={handleChange} className="w-full border rounded-md h-10 px-3 text-sm font-mono" />
                 </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-medium block mb-1">Marketplace URL</label>
                    <input type="url" name="marketplace_url" value={formData.marketplace_url || ''} onChange={handleChange} className="w-full border rounded-md h-10 px-3 text-sm" />
                 </div>
              </div>
           </section>

           <div className="flex justify-end gap-3 pt-6 border-t">
              <Link href="/admin/nfts" className="px-6 py-2 border rounded-md font-medium text-sm">Batal</Link>
              <button disabled={loading} type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium text-sm flex gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Perubahan
              </button>
           </div>
        </form>
      </div>
    </div>
  );
}
