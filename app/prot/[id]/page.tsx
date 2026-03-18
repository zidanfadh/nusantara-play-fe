'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { protApi } from '@/lib/api/prot';
import { BlockchainBadge } from '@/components/prot/BlockchainBadge';
import { BlockchainProofCard } from '@/components/prot/BlockchainProofCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PROTEntity, PROTStatus, PROTJenis } from '@/types/prot';

export default function ProtDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [item, setItem] = useState<PROTEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadData(id as string);
    }
  }, [id]);

  const loadData = async (protId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Use the API to get data
      // Note: In a real app, this might need to handle the response structure better
      // if it returns { data: ... } vs just the entity.
      // Based on lib/api/prot.ts, getById returns Promise<PROTEntity>
      const data = await protApi.getById(protId);
      setItem(data);
      if (data.fotoKegiatan && data.fotoKegiatan.length > 0) {
        setActiveImage(data.fotoKegiatan[0]);
      }
    } catch (err) {
      console.error('Error fetching details:', err);
      setError('Gagal memuat detail data. Data mungkin tidak ditemukan atau terjadi kesalahan server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!item) return;
    if (!confirm('Apakah Anda yakin ingin mengajukan data ini untuk verifikasi? Data tidak dapat diubah selama proses verifikasi.')) return;

    setSubmitting(true);
    try {
      await protApi.submitKurasi(item.id, 'Diajukan oleh pengguna');
      alert('Berhasil diajukan untuk verifikasi.');
      loadData(item.id); // Reload to update status
    } catch (err) {
      console.error(err);
      alert('Gagal mengajukan verifikasi. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!item) return;
    if (!confirm('Publish PROT ini ke Arsip Nasional? Data akan dapat diakses publik.')) return;

    setSubmitting(true);
    try {
      await protApi.publish(item.id, 'Dipublikasikan ke arsip nasional');
      alert('Berhasil dipublikasikan ke Arsip Nasional.');
      loadData(item.id);
    } catch (err) {
      console.error(err);
      alert('Gagal publish. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!confirm('Yakin ingin menghapus PROT ini? Tindakan ini tidak dapat dibatalkan!')) return;

    setSubmitting(true);
    try {
      await protApi.delete(item.id);
      alert('PROT berhasil dihapus.');
      router.push('/prot');
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-foreground mb-2">Terjadi Kesalahan</h2>
            <p className="text-muted-foreground mb-6">{error || 'Data tidak ditemukan.'}</p>
            <Link href="/prot" className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors">
              Kembali ke Daftar
            </Link>
          </div>
      </div>
    );
  }

  const isEditable = item.status === PROTStatus.DRAFT || item.status === PROTStatus.REVISI;
  const isSubmittable = item.status === PROTStatus.DRAFT || item.status === PROTStatus.REVISI;
  const isPublishable = item.status === PROTStatus.DIVERIFIKASI && user?.role === 'admin_kpoti';
  const isDeletable = user?.role === 'admin_kpoti';

  return (
    <>
      {/* Breadcrumb & Title Section */}
      <div className="bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm mb-2">
            <Link href="/" className="text-muted-foreground hover:text-foreground">Beranda</Link>
            <span className="text-muted-foreground">/</span>
            <Link href="/prot" className="text-muted-foreground hover:text-foreground">Daftar PROT</Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">{item.nama}</span>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{item.nama}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded text-sm font-semibold text-white ${
                  item.jenis === PROTJenis.PERMAINAN_RAKYAT ? 'bg-primary' : 'bg-secondary'
                }`}>
                  {item.jenis === PROTJenis.PERMAINAN_RAKYAT ? 'PERMAINAN RAKYAT' : 'OLAHRAGA TRADISIONAL'}
                </span>

                <span className="px-2.5 py-0.5 rounded text-sm font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                  {(item.status || '').replace(/_/g, ' ')}
                </span>

                {(item.status === PROTStatus.DIVERIFIKASI || item.status === PROTStatus.ARSIP_NASIONAL) && (
                  <BlockchainBadge protId={item.id} userRole={user?.role} />
                )}

                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {item.kabkotaName || item.kabkotaKode}, {item.provinsiName || item.provinsiKode}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View History */}
              <Link
                href={`/prot/${item.id}/history`}
                className="px-3 py-2 bg-background border border-border text-foreground rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History
              </Link>

              {/* Edit Button */}
              {isEditable && (
                <Link
                  href={`/prot/${item.id}/edit`}
                  className="px-3 py-2 bg-background border border-border text-foreground rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </Link>
              )}

              {/* Submit for Verification */}
              {isSubmittable && (
                <button
                  onClick={handleSubmitVerification}
                  disabled={submitting}
                  className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {submitting ? 'Memproses...' : 'Ajukan Verifikasi'}
                  {!submitting && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )}

              {/* Publish (Admin Only) */}
              {isPublishable && (
                <button
                  onClick={handlePublish}
                  disabled={submitting}
                  className="px-3 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Publish
                </button>
              )}

              {/* Delete (Admin Only) */}
              {isDeletable && (
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="px-3 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column - Media & Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Gallery */}
            <div className="bg-background border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="aspect-video bg-muted relative flex items-center justify-center overflow-hidden">
                {activeImage ? (
                  <img src={activeImage} alt={item.nama} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center">
                    <svg className="w-12 h-12 mb-2 opacity-30" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Tidak ada foto</span>
                  </div>
                )}
              </div>

              {item.fotoKegiatan && item.fotoKegiatan.length > 0 && (
                <div className="p-2 flex gap-2 overflow-x-auto">
                  {item.fotoKegiatan.map((foto, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(foto)}
                      className={`w-20 h-16 shrink-0 rounded overflow-hidden border-2 ${activeImage === foto ? 'border-primary' : 'border-transparent'}`}
                    >
                      <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Basic Info Card */}
            <div className="bg-background border border-border rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-lg mb-4 pb-2 border-b border-border">Informasi Dasar</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Target Usia</label>
                  <p className="font-medium text-foreground">{(item.targetUsia || '').replace(/_/g, ' ')}</p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Status Asal Usul</label>
                  <p className="font-medium text-foreground">{item.statusAsalUsul || '-'}</p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Lokasi</label>
                  <p className="font-medium text-foreground">
                    {item.desaKode && `Desa ${item.desaKode}, `}
                    {item.kecamatanKode && `Kec. ${item.kecamatanKode}, `}
                    <br />
                    {item.kabkotaName || item.kabkotaKode}, {item.provinsiName || item.provinsiKode}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Alamat Lengkap</label>
                  <p className="text-sm text-foreground">{item.alamatLengkap || '-'}</p>
                </div>
              </div>
            </div>

            {/* Video Section if exists */}
            {item.videoKegiatan && item.videoKegiatan.length > 0 && (
              <div className="bg-background border border-border rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-lg mb-4 pb-2 border-b border-border">Video Kegiatan</h3>
                <div className="space-y-4">
                  {item.videoKegiatan.map((video, idx) => (
                    <div key={idx} className="aspect-video bg-black rounded overflow-hidden">
                       <video src={video} controls className="w-full h-full" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">

            {/* Cara Bermain */}
            <div className="bg-background border border-border rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-lg mb-4 pb-2 border-b border-border text-primary">Cara Bermain</h3>
              <div className="prose max-w-none text-foreground whitespace-pre-line">
                {item.caraBermain || <span className="text-muted-foreground italic">Belum ada deskripsi cara bermain.</span>}
              </div>
            </div>

            {/* Nilai Moral */}
            <div className="bg-background border border-border rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-lg mb-4 pb-2 border-b border-border text-primary">Nilai Moral / Budaya</h3>
              <div className="prose max-w-none text-foreground whitespace-pre-line">
                {item.nilaiMoral || <span className="text-muted-foreground italic">Belum ada deskripsi nilai moral.</span>}
              </div>
            </div>

            {/* Peralatan */}
            <div className="bg-background border border-border rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-lg mb-4 pb-2 border-b border-border text-primary">Peralatan yang Dibutuhkan</h3>

              {Array.isArray(item.peralatan) && item.peralatan.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {item.peralatan.map((alat, idx) => (
                    <div key={idx} className="border border-border rounded-md p-4 bg-muted/20">
                      <div className="flex gap-4">
                        {alat.fotoAlat && alat.fotoAlat.length > 0 ? (
                          <div className="w-20 h-20 bg-muted rounded shrink-0 overflow-hidden">
                            <img src={alat.fotoAlat[0]} alt={alat.nama} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-muted rounded shrink-0 flex items-center justify-center text-muted-foreground">
                            <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground">{alat.nama}</h4>
                          <p className="text-sm text-muted-foreground mb-1">{alat.deskripsi || 'Tidak ada deskripsi'}</p>
                          {alat.kisaranHarga && (
                            <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded inline-block">
                              Rp {alat.kisaranHarga}
                            </div>
                          )}
                          {alat.urlPembelian && alat.urlPembelian.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">Beli di:</p>
                              {alat.urlPembelian.map((url, urlIdx) => (
                                <a
                                  key={urlIdx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs text-blue-600 hover:underline truncate"
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* All fotoAlat */}
                      {alat.fotoAlat && alat.fotoAlat.length > 1 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto">
                          {alat.fotoAlat.slice(1).map((foto, fotoIdx) => (
                            <div key={fotoIdx} className="w-16 h-16 shrink-0 rounded overflow-hidden border border-border">
                              <img src={foto} alt={`${alat.nama} foto ${fotoIdx + 2}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">Tidak ada peralatan khusus yang diperlukan.</p>
              )}
            </div>

            {/* Dokumen Kurikulum */}
            {item.dokumenKurikulum && item.dokumenKurikulum.length > 0 && (
              <div className="bg-background border border-border rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-lg mb-4 pb-2 border-b border-border text-primary">Dokumen Kurikulum / Panduan</h3>
                <div className="space-y-2">
                  {item.dokumenKurikulum.map((url, idx) => {
                    const filename = url.split('/').pop() || `Dokumen ${idx + 1}`;
                    return (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border border-border rounded-md hover:bg-muted/50 transition-colors group"
                      >
                        <svg className="w-6 h-6 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm text-blue-600 group-hover:underline truncate">{filename}</span>
                        <svg className="w-4 h-4 text-muted-foreground ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Blockchain Proof Card */}
            {(item.status === PROTStatus.DIVERIFIKASI || item.status === PROTStatus.ARSIP_NASIONAL) && (
              <BlockchainProofCard protId={item.id} userRole={user?.role} />
            )}

            {/* Metadata Footer */}
            <div className="text-xs text-muted-foreground border-t border-border pt-4 flex flex-wrap gap-4">
              <span>Dibuat: {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}</span>
              <span>Terakhir Update: {item.updated_at ? new Date(item.updated_at).toLocaleDateString('id-ID') : '-'}</span>
              <span>ID: {item.id}</span>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
