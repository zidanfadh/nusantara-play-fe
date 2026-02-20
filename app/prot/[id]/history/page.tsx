'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { protApi } from '@/lib/api/prot';
import { ProtNavigation } from '@/components/prot/ProtNavigation';
import { VerifikasiEntity } from '@/types/prot';

export default function HistoryPage() {
  const { id } = useParams();
  const [history, setHistory] = useState<VerifikasiEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadHistory(id as string);
    }
  }, [id]);

  const loadHistory = async (protId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await protApi.getHistory(protId);
      setHistory(data);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Gagal memuat riwayat verifikasi.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      REVISION_NEEDED: 'bg-amber-100 text-amber-800 border-amber-200',
      PENDING: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'REJECTED':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'REVISION_NEEDED':
        return (
          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ProtNavigation />
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat riwayat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <ProtNavigation />

      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/prot/${id}`} className="text-muted-foreground hover:text-foreground flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Kembali ke Detail
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Riwayat Verifikasi</h1>
          <p className="text-muted-foreground mt-2">Lihat semua riwayat review dan verifikasi PROT ini</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {history.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
            <svg className="w-16 h-16 text-muted-foreground mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-2">Belum Ada Riwayat</h3>
            <p className="text-muted-foreground">PROT ini belum pernah direview.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timeline */}
            <div className="relative">
              {history.map((item, index) => (
                <div key={item.id} className="relative pb-8">
                  {/* Timeline line */}
                  {index < history.length - 1 && (
                    <div className="absolute left-5 top-10 -ml-px h-full w-0.5 bg-border" />
                  )}

                  <div className="relative flex items-start space-x-4">
                    {/* Timeline icon */}
                    <div className="flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background border-2 border-border">
                        {getStatusIcon(item.status)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusBadge(item.status)}`}>
                                {item.status.replace(/_/g, ' ')}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {item.verified_at ? new Date(item.verified_at).toLocaleDateString('id-ID', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '-'}
                              </span>
                            </div>
                            {item.pakar && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>Reviewer: <span className="font-medium text-foreground">{item.pakar.full_name}</span></span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Catatan */}
                        {item.catatan && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-foreground mb-2">Catatan:</h4>
                            <p className="text-sm  bg-muted/50 p-3 rounded-md">
                              {item.catatan}
                            </p>
                          </div>
                        )}

                        {/* Saran Perbaikan */}
                        {item.saran_perbaikan && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Saran Perbaikan:
                            </h4>
                            <p className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                              {item.saran_perbaikan}
                            </p>
                          </div>
                        )}

                        {/* Dokumen Pendukung */}
                        {item.dokumen_pendukung && item.dokumen_pendukung.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2">Dokumen Pendukung:</h4>
                            <div className="flex flex-wrap gap-2">
                              {item.dokumen_pendukung.map((doc, idx) => (
                                <a
                                  key={idx}
                                  href={doc}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  Dokumen {idx + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
