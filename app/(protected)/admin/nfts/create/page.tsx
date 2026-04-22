"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { nftsApi } from '@/lib/api/nfts';
import { ArrowLeft, Upload, Loader2, Save } from 'lucide-react';
import { CreateNftPayload } from '@/types/nfts';

export default function CreateNftPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateNftPayload>({
    nama: '',
    slug: '',
    deskripsi: '',
    about: '',
    blockchain_network: '',
    contract_address: '',
    token_id: '',
    token_standard: '',
    marketplace_name: '',
    marketplace_url: '',
    external_url: '',
  });

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'nama' && !prev.slug ? { slug: slugify(value) } : {})
    }));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0]);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setGalleryFiles(Array.from(e.target.files));
    }
  };

  const slugify = (val: string) => val.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let image_url = undefined;
      const gallery_urls: string[] = [];

      if (coverFile) {
        const coverUpload = await nftsApi.uploadImage(coverFile);
        image_url = coverUpload.url;
      }

      for (const file of galleryFiles) {
        const upload = await nftsApi.uploadImage(file);
        gallery_urls.push(upload.url);
      }

      await nftsApi.create({
        ...formData,
        image_url,
        gallery_urls: gallery_urls.length > 0 ? gallery_urls : undefined,
      });

      router.push('/admin/nfts');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan NFT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link 
        href="/admin/nfts" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Kelola Daftar
      </Link>

      <div className="bg-card shadow-sm rounded-xl p-6 sm:p-8 border">
        <h1 className="text-2xl font-bold mb-6">Tambah NFT Catalog</h1>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6 text-sm font-medium border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* 1. Basic Information */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold border-b pb-2">1. Informasi Dasar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama NFT *</label>
                <input 
                  required
                  name="nama"
                  value={formData.nama}
                  onChange={handleChange}
                  placeholder="Contoh: Gasing Heritage NFT"
                  max={200}
                  className="w-full border rounded-md h-10 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Slug *</label>
                <input 
                  required
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="gasing-heritage-nft"
                  pattern="^[a-z0-9-]+$"
                  className="w-full border rounded-md h-10 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-muted/30 font-mono"
                />
                <p className="text-xs text-muted-foreground">Huruf kecil, angka, dan tanda hubung saja.</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Deskripsi Singkat</label>
              <textarea 
                name="deskripsi"
                value={formData.deskripsi}
                onChange={handleChange}
                placeholder="Ringkasan pendek NFT ini..."
                className="w-full border rounded-md p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[80px] resize-y"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Penjelasan Detail (About)</label>
              <textarea 
                name="about"
                value={formData.about}
                onChange={handleChange}
                placeholder="Penjelasan lebih panjang dan mendalam tentang representasi digital ini..."
                className="w-full border rounded-md p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[140px] resize-y"
              />
            </div>
          </section>

          {/* 2. Media Upload */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold border-b pb-2">2. Media</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 border p-4 rounded-lg bg-muted/10">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Cover Image
                </label>
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleCoverChange}
                  className="w-full text-sm"
                />
                {coverFile && <p className="text-xs text-primary font-medium mt-2">Terpilih: {coverFile.name}</p>}
              </div>

              <div className="space-y-2 border p-4 rounded-lg bg-muted/10">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Gallery Images (Bisa pilih lebih dari 1)
                </label>
                <input 
                  type="file" 
                  multiple
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleGalleryChange}
                  className="w-full text-sm"
                />
                {galleryFiles.length > 0 && <p className="text-xs text-primary font-medium mt-2">{galleryFiles.length} file terpilih.</p>}
              </div>
            </div>
          </section>

          {/* 3. Blockchain Details */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold border-b pb-2">3. Blockchain Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Network *</label>
                <input 
                  required
                  name="blockchain_network"
                  value={formData.blockchain_network}
                  onChange={handleChange}
                  placeholder="e.g. ethereum, polygon"
                  className="w-full border rounded-md h-10 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contract Address *</label>
                <input 
                  required
                  name="contract_address"
                  value={formData.contract_address}
                  onChange={handleChange}
                  placeholder="0x..."
                  className="w-full border rounded-md h-10 px-3 font-mono text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Token ID *</label>
                <input 
                  required
                  name="token_id"
                  value={formData.token_id}
                  onChange={handleChange}
                  placeholder="1"
                  className="w-full border rounded-md h-10 px-3 font-mono text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Token Standard</label>
                <input 
                  name="token_standard"
                  value={formData.token_standard}
                  onChange={handleChange}
                  placeholder="e.g. ERC721"
                  className="w-full border rounded-md h-10 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Metadata URI</label>
                <input 
                  name="metadata_uri"
                  type="url"
                  value={formData.metadata_uri}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full border rounded-md h-10 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </section>

          {/* 4. External Links */}
          <section className="space-y-4">
             <h2 className="text-lg font-bold border-b pb-2">4. Tautan Eksternal</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Marketplace Name</label>
                  <input 
                    name="marketplace_name"
                    value={formData.marketplace_name}
                    onChange={handleChange}
                    placeholder="e.g. OpenSea, Blur"
                    className="w-full border rounded-md h-10 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Marketplace URL</label>
                  <input 
                    type="url"
                    name="marketplace_url"
                    value={formData.marketplace_url}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full border rounded-md h-10 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Official / External URL</label>
                  <input 
                    type="url"
                    name="external_url"
                    value={formData.external_url}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full border rounded-md h-10 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
             </div>
          </section>

          <div className="flex justify-end gap-3 pt-6 border-t mt-8">
            <Link 
              href="/admin/nfts"
              className="px-6 py-2 border rounded-md font-medium text-sm hover:bg-muted transition-colors flex items-center justify-center"
            >
              Batal
            </Link>
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-w-[140px]"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              ) : (
                <><Save className="w-4 h-4" /> Simpan Draft</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
