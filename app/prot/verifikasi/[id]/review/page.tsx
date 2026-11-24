'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { protApi } from '@/lib/api/prot';
import { PROTEntity } from '@/types/prot';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ReviewMediaPanel, SelfReviewWarning } from '@/components/prot/ReviewMediaPanel';
import { PROT_SELF_REVIEW_RULE } from '@/lib/prot/backend-features';
import {
  OVERRIDE_REASON_MAX,
  reviewMedia,
  selfReviewState,
  validateOverrideReason,
} from '@/lib/prot/review-media';

/** Every text field, in full (Phase 26: the reviewer reads every text to the end). */
function TextBlock({ title, value }: { title: string; value?: string | null }) {
  return (
    <div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <div className="p-3 bg-background rounded border border-border text-sm whitespace-pre-line break-words">
        {value && value.trim() !== '' ? value : <span className="text-muted-foreground italic">Kosong</span>}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [protData, setProtData] = useState<PROTEntity | null>(null);
  const [loading, setLoading] = useState(true);

  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED' | 'REVISION_NEEDED'>('APPROVED');
  const [catatan, setCatatan] = useState('');
  const [saranPerbaikan, setSaranPerbaikan] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadData(id as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Phase 26: self-review. Production backend: warn only. With NEXT_PUBLIC_PROT_SELF_REVIEW_RULE (after the backend
  // deploy): non-admins are blocked, admins need a written reason (sent as selfReviewOverrideReason, audited).
  const selfReview = selfReviewState(user, protData, PROT_SELF_REVIEW_RULE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (selfReview === 'blocked') return;

    if (reviewStatus === 'REVISION_NEEDED' && !saranPerbaikan.trim()) {
      alert('Saran perbaikan wajib diisi jika status Revisi.');
      return;
    }

    if (selfReview === 'override-required') {
      const reasonError = validateOverrideReason(overrideReason);
      if (reasonError) {
        alert(reasonError);
        return;
      }
    }

    const confirmText =
      selfReview === 'warn'
        ? 'Anda adalah pembuat PROT ini. Tetap kirim hasil verifikasi? Sebaiknya PROT diperiksa orang lain.'
        : 'Anda yakin ingin mengirim hasil verifikasi ini?';
    if (!confirm(confirmText)) return;

    setSubmitting(true);
    try {
      await protApi.review(id as string, {
        status: reviewStatus,
        catatan,
        saran_perbaikan: reviewStatus === 'REVISION_NEEDED' ? saranPerbaikan : undefined,
        dokumen_pendukung: [], // Optional: Add file upload logic later
        // Only with the rule deployed: the old DTO would reject this key (forbidNonWhitelisted).
        ...(selfReview === 'override-required' ? { selfReviewOverrideReason: overrideReason.trim() } : {}),
      });

      alert('Review berhasil dikirim.');
      router.push('/prot/verifikasi/my-queue');
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error && err.message ? err.message : 'Gagal mengirim review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="p-8 text-center">Memuat data...</div>
  );

  if (!protData) return (
    <div className="p-8 text-center">Data tidak ditemukan</div>
  );

  const media = reviewMedia(protData);
  const isOwn = selfReview !== 'none';

  return (
    <>
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
             <span className="font-semibold text-foreground min-w-0 truncate">Review: {protData.nama}</span>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {selfReview !== 'none' && (
          <div className="lg:col-span-3">
            <SelfReviewWarning state={selfReview} />
          </div>
        )}

        {/* Left: everything the reviewer approves */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <div className="bg-muted/30 p-4 sm:p-6 rounded-lg border border-border">
             <h2 className="text-xl font-bold mb-4">Isi Data</h2>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
                   <label className="text-xs text-muted-foreground uppercase">Jumlah Pemain</label>
                   <p className="font-medium">{protData.jumlahPemain ?? '-'}</p>
                </div>
                <div className="sm:col-span-2">
                   <label className="text-xs text-muted-foreground uppercase">Pembuat</label>
                   <p className="font-medium break-all">
                     {protData.created_by}
                     {isOwn && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-800">Anda</span>}
                   </p>
                </div>
             </div>

             <div className="space-y-4">
                <TextBlock title="Nama" value={protData.nama} />
                <TextBlock title="Deskripsi Singkat" value={protData.deskripsi} />
                <TextBlock title="Sejarah / Asal Usul" value={protData.statusAsalUsul} />
                <TextBlock title="Cara Bermain" value={protData.caraBermain} />
                <TextBlock title="Nilai Moral" value={protData.nilaiMoral} />
                <TextBlock title="Detail Lokasi (harus tempat umum, bukan rumah pribadi)" value={protData.alamatLengkap} />
             </div>

             <div className="mt-4 text-right">
                <Link href={`/prot/${protData.id}`} target="_blank" className="text-primary-text hover:underline text-sm">
                  Lihat Detail Lengkap di Tab Baru ↗
                </Link>
             </div>
          </div>

          <div className="bg-muted/30 p-4 sm:p-6 rounded-lg border border-border">
            <h2 className="text-xl font-bold mb-4">Foto, Video, Dokumen dan Tautan</h2>
            <ReviewMediaPanel media={media} />
          </div>
        </div>

        {/* Right: Review Form */}
        <div className="lg:col-span-1">
          <div className="bg-background border border-border rounded-lg shadow-sm p-6 lg:sticky lg:top-24">
            <h2 className="text-xl font-bold mb-6">Form Verifikasi</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset disabled={selfReview === 'blocked'} className="space-y-6 disabled:opacity-60">
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
                    <span className="font-medium text-success">Setujui (Approve)</span>
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
                    <span className="font-medium text-warning">Perlu Revisi</span>
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
                    <span className="font-medium text-danger">Tolak (Reject)</span>
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
                  <label className="block text-sm font-medium mb-1 text-warning">
                    Saran Perbaikan (Wajib)
                  </label>
                  <textarea
                    className="w-full p-2 border border-yellow-300 bg-yellow-50 rounded-md h-32 text-sm focus:ring-yellow-500"
                    placeholder="Sebutkan isian dan file mana yang perlu diganti, dan jenis masalahnya (jangan menyalin data pribadi)."
                    value={saranPerbaikan}
                    onChange={(e) => setSaranPerbaikan(e.target.value)}
                    required
                  ></textarea>
                </div>
              )}

              {selfReview === 'override-required' && (
                <div>
                  <label htmlFor="self-review-reason" className="block text-sm font-medium mb-1 text-danger">
                    Alasan memeriksa PROT buatan sendiri (wajib, dicatat di log audit)
                  </label>
                  <textarea
                    id="self-review-reason"
                    className="w-full p-2 border border-red-300 rounded-md h-24 text-sm"
                    maxLength={OVERRIDE_REASON_MAX}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    required
                  ></textarea>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || selfReview === 'blocked'}
                className={`w-full py-2.5 rounded-md font-medium text-white transition-colors
                  ${reviewStatus === 'APPROVED' ? 'bg-green-700 hover:bg-green-800' :
                    reviewStatus === 'REVISION_NEEDED' ? 'bg-amber-700 hover:bg-amber-800' :
                    'bg-red-600 hover:bg-red-700'}
                  disabled:opacity-70 disabled:cursor-not-allowed
                `}
              >
                {submitting ? 'Mengirim...' : 'Kirim Hasil Review'}
              </button>
              </fieldset>
            </form>
          </div>
        </div>

      </main>
    </>
  );
}
