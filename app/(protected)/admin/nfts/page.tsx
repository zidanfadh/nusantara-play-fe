"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useNfts } from '@/hooks/useNfts';
import { nftsApi } from '@/lib/api/nfts';
import { Plus, Edit, Trash2, Power, EyeOff, CheckCircle2, ImageOff, Search } from 'lucide-react';

export default function AdminNftsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { nfts, loading, pagination, updateParams, refresh } = useNfts({ page: 1, limit: 20 }, true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchTerm, page: 1 });
  };

  const handlePublishToggle = async (id: string, currentStatus: string) => {
    if (!confirm(`Apakah Anda yakin ingin ${currentStatus === 'DRAFT' ? 'me-publish' : 'unpublish'} NFT ini?`)) return;
    
    try {
      setIsProcessing(id);
      if (currentStatus === 'DRAFT') {
        await nftsApi.publish(id);
      } else {
        await nftsApi.unpublish(id);
      }
      refresh();
    } catch (error) {
      alert((error as Error).message || 'Gagal mengubah status publish.');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Peringatan: NFT ini akan dihapus secara (soft delete) dari sistem. Lanjutkan?')) return;
    
    try {
      setIsProcessing(id);
      await nftsApi.remove(id);
      refresh();
    } catch (error) {
      alert((error as Error).message || 'Gagal menghapus NFT.');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kelola Katalog NFT</h1>
        </div>
        <Link 
          href="/admin/nfts/create" 
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Tambah NFT Baru
        </Link>
      </div>

      <div className="bg-card shadow rounded-xl p-4 sm:p-6 mb-8 border">
        <form onSubmit={handleSearch} className="relative max-w-md mb-6">
          <input 
            type="text"
            placeholder="Cari berdasarkan nama / deskripsi..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 h-10 rounded-md border text-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <button type="submit" className="hidden">Cari</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 font-semibold text-muted-foreground">Thumbnail</th>
                <th className="p-3 font-semibold text-muted-foreground">Nama NFT</th>
                <th className="p-3 font-semibold text-muted-foreground">Network / Token</th>
                <th className="p-3 font-semibold text-muted-foreground">Status</th>
                <th className="p-3 font-semibold text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Memuat data...</td></tr>
              ) : nfts.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Tidak ada NFT ditemukan.</td></tr>
              ) : (
                nfts.map((nft) => (
                  <tr key={nft.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="p-3">
                      {nft.image_url ? (
                        <img src={nft.image_url} alt={nft.nama} className="w-16 h-16 object-cover rounded-md border" />
                      ) : (
                        <div className="w-16 h-16 bg-muted border rounded-md flex items-center justify-center">
                          <ImageOff className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-base mb-1">{nft.nama}</div>
                      <div className="text-xs text-muted-foreground opacity-80">{nft.slug}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium capitalize">{nft.blockchain_network}</div>
                      <div className="text-xs font-mono text-muted-foreground opacity-80 bg-muted inline-block px-1 rounded mt-1">
                        ID: {nft.token_id.length > 8 ? `${nft.token_id.slice(0, 8)}...` : nft.token_id}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        nft.status === 'PUBLISHED' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                      }`}>
                        {nft.status === 'PUBLISHED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {nft.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handlePublishToggle(nft.id, nft.status)}
                          disabled={isProcessing === nft.id}
                          className="p-2 text-muted-foreground hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors"
                          title={nft.status === 'DRAFT' ? 'Publish NFT' : 'Unpublish NFT'}
                        >
                          <Power className={`w-4 h-4 ${isProcessing === nft.id ? 'animate-spin' : ''}`} />
                        </button>
                        <Link 
                          href={`/admin/nfts/${nft.id}/edit`}
                          className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(nft.id)}
                          disabled={isProcessing === nft.id}
                          className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors ml-1"
                        >
                          <Trash2 className={`w-4 h-4 ${isProcessing === nft.id ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">
              Menampilkan Halaman {pagination.page} dari {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => updateParams({ page: pagination.page - 1 })}
                disabled={!pagination.hasPrev}
                className="px-3 py-1.5 border rounded text-sm disabled:opacity-50 hover:bg-muted font-medium transition-colors"
              >
                Prev
              </button>
              <button 
                onClick={() => updateParams({ page: pagination.page + 1 })}
                disabled={!pagination.hasNext}
                className="px-3 py-1.5 border rounded text-sm disabled:opacity-50 hover:bg-muted font-medium transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
