"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useNfts } from '@/hooks/useNfts';
import { Search, Filter, Loader2, ImageOff, Gem, ArrowRight } from 'lucide-react';

export default function NftsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeNetwork, setActiveNetwork] = useState<string>('');
  
  const { nfts, loading, error, pagination, updateParams } = useNfts({
    page: 1,
    limit: 12,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchTerm, page: 1, blockchain_network: activeNetwork });
  };

  const networks = ['Semua', 'ethereum', 'polygon', 'base'];

  return (
    <div className="w-full">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Katalog NFT Nusantara</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Jelajahi representasi digital dari warisan budaya dan permainan tradisional Indonesia di dalam blockchain. Koleksi ini merupakan bentuk pelestarian arsip secara desentralisasi.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
          <input 
            type="text"
            placeholder="Cari NFT (nama, deskripsi)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 w-full rounded-lg border bg-background px-4 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <button type="submit" className="hidden">Search</button>
        </form>

        <div className="flex gap-2 overflow-x-auto pb-2 items-center">
          <Filter className="text-muted-foreground w-4 h-4 mr-2" />
          {networks.map((net) => (
            <button
              key={net}
              onClick={() => {
                const val = net === 'Semua' ? '' : net;
                setActiveNetwork(val);
                updateParams({ blockchain_network: val, search: searchTerm, page: 1 });
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                (activeNetwork === net || (net === 'Semua' && activeNetwork === ''))
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {net === 'Semua' ? net : net.charAt(0).toUpperCase() + net.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-8 border border-destructive/20">
          <p className="font-semibold">Terjadi kesalahan memuat katalog NFT.</p>
          <p className="text-sm opacity-90">{error.message}</p>
        </div>
      )}

      {loading && !nfts.length ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground animate-pulse">Memuat koleksi NFT...</p>
        </div>
      ) : (
        <>
          {nfts.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-2xl border-muted">
              <ImageOff className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Tidak ada NFT ditemukan</h3>
              <p className="text-muted-foreground">Coba ubah kata kunci atau filter jaringan untuk menemukan koleksi lainnya.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {nfts.map((nft) => (
                <Link
                  key={nft.id}
                  href={`/nfts/${nft.slug}`}
                  className="group block rounded-2xl bg-card border shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300 overflow-hidden flex flex-col h-full"
                >
                  <div className="relative aspect-square object-cover bg-muted overflow-hidden flex items-center justify-center">
                    {nft.image_url ? (
                      <img 
                        src={nft.image_url} 
                        alt={nft.nama} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                    ) : (
                      <Gem className="w-16 h-16 text-muted-foreground/30" />
                    )}
                    <div className="absolute top-4 left-4">
                      <div className="bg-background/90 backdrop-blur text-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                        {nft.blockchain_network}
                      </div>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h2 className="text-2xl font-bold tracking-tight mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                      {nft.nama}
                    </h2>
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
                      {nft.deskripsi || 'Tidak ada deskripsi singkat.'}
                    </p>
                    <div className="pt-4 border-t border-muted-foreground/10 flex justify-between items-center text-sm font-semibold text-primary">
                      <span>Lihat Detail</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 items-center">
              <button
                disabled={!pagination.hasPrev}
                onClick={() => updateParams({ page: pagination.page - 1 })}
                className="px-4 py-2 bg-muted rounded disabled:opacity-50 font-medium hover:bg-muted/80 transition-colors"
              >
                Sebelumnya
              </button>
              <span className="text-muted-foreground font-medium text-sm">
                Hal {pagination.page} dari {pagination.totalPages}
              </span>
              <button
                disabled={!pagination.hasNext}
                onClick={() => updateParams({ page: pagination.page + 1 })}
                className="px-4 py-2 bg-muted rounded disabled:opacity-50 font-medium hover:bg-muted/80 transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
