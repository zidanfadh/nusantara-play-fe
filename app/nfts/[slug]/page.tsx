"use client";

import React, { use } from 'react';
import Link from 'next/link';
import { useNft } from '@/hooks/useNft';
import { ArrowLeft, ArrowRight, ExternalLink, Loader2, Info, Layers, Hexagon, Hash, FileJson, Link as LinkIcon, Gem } from 'lucide-react';

export default function NftDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  // Unwrapping params is common in modern Next.js due to dynamic params
  const { slug } = use(params);
  const { nft, loading, error } = useNft(slug, 'slug');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Memuat detail NFT...</p>
      </div>
    );
  }

  if (error || !nft) {
    return (
      <div className="text-center py-16 max-w-2xl mx-auto">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-8 rounded-2xl">
          <h2 className="text-2xl font-bold mb-4">Waduh, NFT Tidak Ditemukan</h2>
          <p className="opacity-90 font-medium mb-8">
            {error?.message || 'Aset digital yang Anda cari tidak tersedia atau belum dipublish.'}
          </p>
          <Link 
            href="/nfts"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg transition-transform hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Katalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-4 lg:py-8">
      <Link 
        href="/nfts"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-semibold mb-8 group"
      >
        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        Kembali ke Katalog NFT
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column - Images */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl overflow-hidden border-2 bg-muted aspect-square relative flex items-center justify-center group shadow-sm hover:shadow-lg transition-all duration-500">
            {nft.image_url ? (
              <img 
                src={nft.image_url} 
                alt={nft.nama} 
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" 
              />
            ) : (
              <Gem className="w-24 h-24 text-muted-foreground/30" />
            )}
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-background/90 backdrop-blur text-foreground rounded-full text-xs font-extrabold uppercase shadow-sm tracking-wider">
                {nft.blockchain_network}
              </span>
            </div>
          </div>
          
          {nft.gallery_urls && nft.gallery_urls.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {nft.gallery_urls.map((url, idx) => (
                <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-muted border hover:border-primary/50 transition-colors cursor-pointer">
                  <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="mb-6">
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-4 leading-tight">
              {nft.nama}
            </h1>
            {nft.deskripsi && (
              <p className="text-xl text-muted-foreground font-medium leading-relaxed">
                {nft.deskripsi}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 py-6 border-b border-muted-foreground/10">
            {nft.marketplace_url && (
              <a 
                href={nft.marketplace_url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 shadow-sm"
              >
                Lihat di {nft.marketplace_name || 'Marketplace'}
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            
            {nft.external_url && (
              <a 
                href={nft.external_url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-6 py-3 rounded-xl font-bold transition-colors border"
              >
                Website Resmi
                <LinkIcon className="w-4 h-4" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
            {/* About Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-muted-foreground font-bold uppercase tracking-wider text-sm border-b pb-2">
                <span className="flex items-center gap-2"><Info className="w-4 h-4" /> Tentang Koleksi</span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                {nft.about ? (
                  <div dangerouslySetInnerHTML={{ __html: nft.about.replace(/\n/g, '<br/>') }} />
                ) : (
                  <p className="italic opacity-70">Belum ada penjelasan detail untuk koleksi ini.</p>
                )}
              </div>
            </div>

            {/* Blockchain Details */}
            <div className="space-y-4">
               <div className="flex items-center justify-between text-muted-foreground font-bold uppercase tracking-wider text-sm border-b pb-2">
                <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Spesifikasi Token</span>
              </div>
              <ul className="space-y-3">
                <li className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                  <span className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                    <Hexagon className="w-4 h-4" /> Jaringan
                  </span>
                  <span className="font-bold capitalize">{nft.blockchain_network}</span>
                </li>
                <li className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                  <span className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                    <LinkIcon className="w-4 h-4" /> Kontrak
                  </span>
                  <span className="font-mono text-sm tracking-tight border px-2 py-0.5 rounded bg-background" title={nft.contract_address}>
                    {nft.contract_address.slice(0, 6)}...{nft.contract_address.slice(-4)}
                  </span>
                </li>
                <li className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                  <span className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                    <Hash className="w-4 h-4" /> Token ID
                  </span>
                  <span className="font-mono font-bold text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {nft.token_id.length > 10 ? `${nft.token_id.slice(0, 10)}...` : nft.token_id}
                  </span>
                </li>
                {nft.token_standard && (
                  <li className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                    <span className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                      <Layers className="w-4 h-4" /> Standar
                    </span>
                    <span className="font-bold">{nft.token_standard}</span>
                  </li>
                )}
                {nft.metadata_uri && (
                  <li className="flex justify-between items-center bg-muted/30 p-3 rounded-lg text-sm">
                    <span className="text-muted-foreground flex items-center gap-2 font-medium">
                      <FileJson className="w-4 h-4" /> Metadata
                    </span>
                    <a href={nft.metadata_uri} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold inline-flex items-center gap-1">
                      JSON <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
          
          {/* Related PROT */}
          {nft.prot_id && (
            <div className="mt-auto pt-6 border-t border-muted-foreground/10">
              <Link href={`/prot/${nft.prot_id}`} className="block group">
                <div className="bg-muted/50 border hover:border-primary/50 transition-colors rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-primary mb-1 uppercase tracking-wider">Terkait PROT</h4>
                    <p className="font-medium">Lihat detail Permainan Rakyat & Olahraga Tradisional terkait</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
