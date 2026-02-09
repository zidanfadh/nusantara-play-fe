'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { protApi } from '@/lib/api/prot';
import { ProtNavigation } from '@/components/prot/ProtNavigation';
import { PROTEntity } from '@/types/prot';

export default function ReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [protData, setProtData] = useState<PROTEntity | null>(null);
  const [loading, setLoading] = useState(true);

  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED' | 'REVISION_NEEDED'>('APPROVED');
  const [catatan, setCatatan] = useState('');
  const [saranPerbaikan, setSaranPerbaikan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadData(id as string);
    }
  }, [id]);

  const loadData = async (protId: string) => {
    try {
      const data = await protApi.getById(protId);
      setProtData(data);
    } catch (err) {
      console.error(err);
      alert('Gagal memuat data PROT');
      router.push('/prot/verifikasi/my-queue');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (reviewStatus === 'REVISION_NEEDED' && !saranPerbaikan.trim()) {
      alert('Saran perbaikan wajib diisi jika status Revisi.');
      return;
    }

    if (!confirm('Anda yakin ingin mengirim hasil verifikasi ini?')) return;

    setSubmitting(true);
    try {
      await protApi.review(id as string, {
        status: reviewStatus,
        catatan,
        saran_perbaikan: reviewStatus === 'REVISION_NEEDED' ? saranPerbaikan : undefined,
        dokumen_pendukung: [] // Optional: Add file upload logic later
      });

      alert('Review berhasil dikirim.');
      router.push('/prot/verifikasi/my-queue');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Gagal mengirim review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <ProtNavigation />
      <div className="p-8 text-center">Memuat data...</div>
    </div>
  );

  if (!protData) return (
    <div className="min-h-screen bg-background">
      <ProtNavigation />
      <div className="p-8 text-center">Data tidak ditemukan</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-12">
      <ProtNavigation />

      {/* Breadcrumb Section */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
             <Link href="/prot/verifikasi/my-queue" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
               </svg>
               Kembali
             </Link>
             <div className="h-6 w-px bg-border mx-2"></div>
             <span className="font-semibold text-foreground">Review: {protData.nama}</span>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: PROT Preview (Condensed) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-muted/30 p-6 rounded-lg border border-border">
             <h2 className="text-xl font-bold mb-4">Preview Konten</h2>

             <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                   <label className="text-xs text-muted-foreground uppercase">Jenis</label>
                   <p className="font-medium">{protData.jenis.replace(/_/g, ' ')}</p>
                </div>
                <div>
                   <label className="text-xs text-muted-foreground uppercase">Target Usia</label>
                   <p className="font-medium">{(protData.targetUsia || '').replace(/_/g, ' ')}</p>
                </div>
                <div>
                   <label className="text-xs text-muted-foreground uppercase">Lokasi</label>
                   <p className="font-medium">{protData.kabkotaName}, {protData.provinsiName}</p>
                </div>
                <div>
                   <label className="text-xs text-muted-foreground uppercase">Pembuat</label>
                   <p className="font-medium">{protData.created_by}</p>
                </div>
             </div>

             <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">Cara Bermain</h3>
                  <div className="p-3 bg-background rounded border border-border text-sm whitespace-pre-line max-h-60 overflow-y-auto">
                    {protData.caraBermain || '-'}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Nilai Moral</h3>
                  <div className="p-3 bg-background rounded border border-border text-sm whitespace-pre-line max-h-60 overflow-y-auto">
                    {protData.nilaiMoral || '-'}
                  </div>
                </div>
             </div>

             <div className="mt-4 text-right">
                <Link href={`/prot/${protData.id}`} target="_blank" className="text-primary hover:underline text-sm">
                  Lihat Detail Lengkap di Tab Baru ↗
                </Link>
             </div>
          </div>
        </div>

        {/* Right: Review Form */}
        <div className="lg:col-span-1">
          <div className="bg-background border border-border rounded-lg shadow-sm p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-6">Form Verifikasi</h2>

            <form onSubmit={handleSubmit} className="space-y-6">

              <div>
                <label className="block text-sm font-medium mb-2">Keputusan Review</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                    <input
                      type="radio"
                      name="status"
                      value="APPROVED"
                      checked={reviewStatus === 'APPROVED'}
                      onChange={() => setReviewStatus('APPROVED')}
                      className="text-green-600"
                    />
                    <span className="font-medium text-green-700">Setujui (Approve)</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                    <input
                      type="radio"
                      name="status"
                      value="REVISION_NEEDED"
                      checked={reviewStatus === 'REVISION_NEEDED'}
                      onChange={() => setReviewStatus('REVISION_NEEDED')}
                      className="text-yellow-600"
                    />
                    <span className="font-medium text-yellow-700">Perlu Revisi</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                    <input
                      type="radio"
                      name="status"
                      value="REJECTED"
                      checked={reviewStatus === 'REJECTED'}
                      onChange={() => setReviewStatus('REJECTED')}
                      className="text-red-600"
                    />
                    <span className="font-medium text-red-700">Tolak (Reject)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Catatan Reviewer
                </label>
                <textarea
                  className="w-full p-2 border border-input rounded-md h-24 text-sm"
                  placeholder="Berikan catatan umum..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                ></textarea>
              </div>

              {reviewStatus === 'REVISION_NEEDED' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-yellow-700">
                    Saran Perbaikan (Wajib)
                  </label>
                  <textarea
                    className="w-full p-2 border border-yellow-300 bg-yellow-50 rounded-md h-32 text-sm focus:ring-yellow-500"
                    placeholder="Jelaskan bagian mana yang perlu diperbaiki..."
                    value={saranPerbaikan}
                    onChange={(e) => setSaranPerbaikan(e.target.value)}
                    required
                  ></textarea>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-2.5 rounded-md font-medium text-white transition-colors
                  ${reviewStatus === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' :
                    reviewStatus === 'REVISION_NEEDED' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    'bg-red-600 hover:bg-red-700'}
                  disabled:opacity-70 disabled:cursor-not-allowed
                `}
              >
                {submitting ? 'Mengirim...' : 'Kirim Hasil Review'}
              </button>
            </form>
          </div>
        </div>

      </main>
    </div>
  );
}
