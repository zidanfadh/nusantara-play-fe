import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DaerahSelector } from '@/components/daerah/DaerahSelector';
import { PROTEntity, PROTJenis, TargetUsia, Peralatan } from '@/types/prot';
import type { Daerah } from '@/types/daerah';
import { getAllProvinces, getChildrenDaerah } from '@/lib/api/daerah';
import type { UserProfile } from '@/types/user';

interface ProtFormProps {
  initialData?: Partial<PROTEntity>;
  onSubmit: (data: Partial<PROTEntity>) => Promise<void>;
  isLoading: boolean;
  title: string;
  user?: UserProfile | null;
  initialProvinceId?: string;
}

export function ProtForm({ initialData, onSubmit, isLoading, title, user, initialProvinceId }: ProtFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<PROTEntity>>({
    nama: '',
    jenis: PROTJenis.PERMAINAN_RAKYAT,
    targetUsia: TargetUsia.SEMUA_USIA,
    statusAsalUsul: '',
    alamatLengkap: '',
    caraBermain: '',
    nilaiMoral: '',
    provinsiKode: '',
    kabkotaKode: '',
    peralatan: [],
    ...initialData,
  });

  const [peralatan, setPeralatan] = useState<Peralatan[]>(initialData?.peralatan || []);
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [dokumenFiles, setDokumenFiles] = useState<File[]>([]);
  const [peralatanFotoFiles, setPeralatanFotoFiles] = useState<Record<number, File[]>>({});
  const [existingFotos, setExistingFotos] = useState<string[]>(initialData?.fotoKegiatan || []);
  const [existingVideos, setExistingVideos] = useState<string[]>(initialData?.videoKegiatan || []);
  const [existingDokumen, setExistingDokumen] = useState<string[]>(initialData?.dokumenKurikulum || []);
  const [isDraggingFoto, setIsDraggingFoto] = useState(false);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingDokumen, setIsDraggingDokumen] = useState(false);

  // State for daerah - store ID for UI, kode for backend
  const [provinsiId, setProvinsiId] = useState<string>(initialProvinceId || '');
  const [kabkotaId, setKabkotaId] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
      if (initialData.peralatan) {
        setPeralatan(initialData.peralatan);
      }
      if (initialData.fotoKegiatan) {
        setExistingFotos(initialData.fotoKegiatan);
      }
      if (initialData.videoKegiatan) {
        setExistingVideos(initialData.videoKegiatan);
      }
      if (initialData.dokumenKurikulum) {
        setExistingDokumen(initialData.dokumenKurikulum);
      }

      // Lookup daerah ID from kode for edit form
      const lookupDaerahIds = async () => {
        try {
          // Lookup provinsi ID from kode
          if (initialData.provinsiKode) {
            const provincesResponse = await getAllProvinces({ page: 1, limit: 50 });
            const province = provincesResponse.data.find(p => p.kode === initialData.provinsiKode);
            if (province) {
              setProvinsiId(province.id);

              // Lookup kabkota ID from kode
              if (initialData.kabkotaKode) {
                const childrenResponse = await getChildrenDaerah({ id: province.id, page: 1, limit: 100 });
                const kabkota = childrenResponse.data.find(k => k.kode === initialData.kabkotaKode);
                if (kabkota) {
                  setKabkotaId(kabkota.id);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error looking up daerah IDs:', error);
        }
      };

      if (initialData.provinsiKode) {
        lookupDaerahIds();
      }
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProvinceChange = (provinceId: string, province: Daerah | null) => {
    setProvinsiId(provinceId);
    setKabkotaId(''); // Reset kabkota when province changes
    setFormData((prev) => ({
      ...prev,
      provinsiKode: province?.kode || '',
      kabkotaKode: ''
    }));
  };

  const handleKabupatenKotaChange = (daerahId: string, daerah: Daerah | null) => {
    setKabkotaId(daerahId);
    setFormData((prev) => ({
      ...prev,
      kabkotaKode: daerah?.kode || ''
    }));
  };

  const handlePeralatanChange = (index: number, field: keyof Peralatan, value: string | string[]) => {
    const newPeralatan = [...peralatan];
    newPeralatan[index] = { ...newPeralatan[index], [field]: value };
    setPeralatan(newPeralatan);
    setFormData((prev) => ({ ...prev, peralatan: newPeralatan }));
  };

  const handleUrlPembelianChange = (peralatanIndex: number, urlIndex: number, value: string) => {
    const newPeralatan = [...peralatan];
    const urls = [...(newPeralatan[peralatanIndex].urlPembelian || [])];
    urls[urlIndex] = value;
    newPeralatan[peralatanIndex] = { ...newPeralatan[peralatanIndex], urlPembelian: urls };
    setPeralatan(newPeralatan);
    setFormData((prev) => ({ ...prev, peralatan: newPeralatan }));
  };

  const addUrlPembelian = (peralatanIndex: number) => {
    const newPeralatan = [...peralatan];
    const urls = [...(newPeralatan[peralatanIndex].urlPembelian || []), ''];
    newPeralatan[peralatanIndex] = { ...newPeralatan[peralatanIndex], urlPembelian: urls };
    setPeralatan(newPeralatan);
    setFormData((prev) => ({ ...prev, peralatan: newPeralatan }));
  };

  const removeUrlPembelian = (peralatanIndex: number, urlIndex: number) => {
    const newPeralatan = [...peralatan];
    const urls = (newPeralatan[peralatanIndex].urlPembelian || []).filter((_, i) => i !== urlIndex);
    newPeralatan[peralatanIndex] = { ...newPeralatan[peralatanIndex], urlPembelian: urls };
    setPeralatan(newPeralatan);
    setFormData((prev) => ({ ...prev, peralatan: newPeralatan }));
  };

  const handleDokumenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setDokumenFiles((prev) => [...prev, ...files]);
    }
  };

  const handleDokumenDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingDokumen(false);
    const files = Array.from(e.dataTransfer.files).filter(file =>
      ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)
    );
    if (files.length > 0) {
      setDokumenFiles((prev) => [...prev, ...files]);
    }
  };

  const removeDokumenFile = (index: number) => {
    setDokumenFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingDokumen = (index: number) => {
    setExistingDokumen((prev) => prev.filter((_, i) => i !== index));
  };

  const addPeralatan = () => {
    const newPeralatan = [...peralatan, { nama: '', deskripsi: '', kisaranHarga: '' }];
    setPeralatan(newPeralatan);
    setFormData((prev) => ({ ...prev, peralatan: newPeralatan }));
  };

  const removePeralatan = (index: number) => {
    const newPeralatan = peralatan.filter((_, i) => i !== index);
    setPeralatan(newPeralatan);
    setFormData((prev) => ({ ...prev, peralatan: newPeralatan }));
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFotoFiles((prev) => [...prev, ...files]);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setVideoFiles((prev) => [...prev, ...files]);
    }
  };

  const handleFotoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFoto(false);
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );
    if (files.length > 0) {
      setFotoFiles((prev) => [...prev, ...files]);
    }
  };

  const handleVideoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVideo(false);
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('video/')
    );
    if (files.length > 0) {
      setVideoFiles((prev) => [...prev, ...files]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFotoDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFoto(true);
  };

  const handleFotoDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFoto(false);
  };

  const handleVideoDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVideo(true);
  };

  const handleVideoDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVideo(false);
  };

  const handlePeralatanFotoChange = (peralatanIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setPeralatanFotoFiles(prev => ({
        ...prev,
        [peralatanIndex]: [...(prev[peralatanIndex] || []), ...files],
      }));
    }
  };

  const removeNewPeralatanFotoFile = (peralatanIndex: number, fileIndex: number) => {
    setPeralatanFotoFiles(prev => ({
      ...prev,
      [peralatanIndex]: (prev[peralatanIndex] || []).filter((_, i) => i !== fileIndex),
    }));
  };

  const removeExistingFotoAlat = (peralatanIndex: number, fotoIndex: number) => {
    const newPeralatan = [...peralatan];
    const fotoAlat = [...(newPeralatan[peralatanIndex].fotoAlat || [])];
    fotoAlat.splice(fotoIndex, 1);
    newPeralatan[peralatanIndex] = { ...newPeralatan[peralatanIndex], fotoAlat };
    setPeralatan(newPeralatan);
    setFormData(prev => ({ ...prev, peralatan: newPeralatan }));
  };

  const removeFotoFile = (index: number) => {
    setFotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideoFile = (index: number) => {
    setVideoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingFoto = (index: number) => {
    setExistingFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingVideo = (index: number) => {
    setExistingVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      fotoFiles,
      videoFiles,
      dokumenFiles,
      peralatanFotoFiles,
      existingFotos,
      existingVideos,
      existingDokumen,
    };
    await onSubmit(dataToSubmit);
  };

  // Shared input class
  const inputCls = 'w-full bg-surface-container-highest dark:bg-warm-field border-0 border-b-2 border-outline-variant/50 dark:border-white/10 focus:border-primary focus:outline-none px-4 py-3 rounded-t-lg transition-all placeholder:text-warm-label/50 dark:text-foreground';
  const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-warm-label block mb-2';
  const cardCls = 'md:col-span-8 bg-warm-card p-8 rounded-xl shadow-sm space-y-6';
  const sectionLabelCls = 'text-[10px] font-bold uppercase tracking-[0.2em] text-primary block mb-2';
  const headingCls = 'text-xl font-bold text-on-surface dark:text-foreground tracking-tight';
  const uploadZoneCls = (isDragging: boolean) =>
    `relative border-2 border-dashed p-10 rounded-2xl text-center transition-colors ${
      isDragging
        ? 'border-primary bg-primary-fixed/20 dark:bg-primary/10'
        : 'bg-surface-container-low dark:bg-warm-card/60 border-outline-variant dark:border-white/10 hover:border-primary'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-16">

      {/* ── Tahap 01 — Identitas Permainan ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-4">
          <span className={sectionLabelCls}>Tahap 01</span>
          <h3 className={headingCls}>Identitas Permainan</h3>
          <p className="text-sm text-warm-label mt-2 leading-relaxed">
            Berikan nama dan kategorisasi yang tepat untuk memudahkan klasifikasi budaya.
          </p>
        </div>
        <div className={cardCls}>
          {/* Nama PROT */}
          <div>
            <label className={labelCls}>
              Nama PROT <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nama"
              required
              value={formData.nama || ''}
              onChange={handleChange}
              className={inputCls}
              placeholder="Contoh: Egrang Batok"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Jenis */}
            <div>
              <label className={labelCls}>
                Jenis <span className="text-red-500">*</span>
              </label>
              <select
                name="jenis"
                required
                value={formData.jenis || PROTJenis.PERMAINAN_RAKYAT}
                onChange={handleChange}
                className={`${inputCls} appearance-none`}
              >
                <option value={PROTJenis.PERMAINAN_RAKYAT}>Permainan Rakyat</option>
                <option value={PROTJenis.OLAHRAGA_TRADISIONAL}>Olahraga Tradisional</option>
              </select>
            </div>

            {/* Target Usia */}
            <div>
              <label className={labelCls}>
                Target Usia <span className="text-red-500">*</span>
              </label>
              <select
                name="targetUsia"
                required
                value={formData.targetUsia || TargetUsia.SEMUA_USIA}
                onChange={handleChange}
                className={`${inputCls} appearance-none`}
              >
                <option value={TargetUsia.ANAK}>Anak-anak</option>
                <option value={TargetUsia.REMAJA}>Remaja</option>
                <option value={TargetUsia.DEWASA}>Dewasa</option>
                <option value={TargetUsia.SEMUA_USIA}>Semua Usia</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tahap 02 — Geografi Budaya ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-4">
          <span className={sectionLabelCls}>Tahap 02</span>
          <h3 className={headingCls}>Geografi Budaya</h3>
          <p className="text-sm text-warm-label mt-2 leading-relaxed">
            Asal muasal daerah menentukan variasi teknik dan dialek penyebutan.
          </p>
        </div>
        <div className={cardCls}>
          <DaerahSelector
            provinceValue={provinsiId}
            kabupatenKotaValue={kabkotaId}
            onProvinceChange={handleProvinceChange}
            onKabupatenKotaChange={handleKabupatenKotaChange}
            required
            provinceDisabled={user?.role === 'pakar'}
          />

          {/* Detail Lokasi Spesifik */}
          <div>
            <label className={labelCls}>Detail Lokasi Spesifik</label>
            <input
              type="text"
              name="alamatLengkap"
              value={formData.alamatLengkap || ''}
              onChange={handleChange}
              className={inputCls}
              placeholder="Nama desa atau komunitas adat..."
            />
          </div>
        </div>
      </div>

      {/* ── Tahap 03 — Filosofi & Mekanik ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-4">
          <span className={sectionLabelCls}>Tahap 03</span>
          <h3 className={headingCls}>Filosofi &amp; Mekanik</h3>
          <p className="text-sm text-warm-label mt-2 leading-relaxed">
            Jelaskan tata cara dan nilai-nilai luhur yang terkandung di dalamnya.
          </p>
        </div>
        <div className="md:col-span-8 bg-warm-card p-8 rounded-xl shadow-sm space-y-8">
          {/* Sejarah / Asal Usul */}
          <div>
            <label className={labelCls}>Sejarah / Asal Usul</label>
            <textarea
              name="statusAsalUsul"
              rows={4}
              value={formData.statusAsalUsul || ''}
              onChange={handleChange}
              className={`${inputCls} resize-none`}
              placeholder="Jelaskan sejarah atau asal usul permainan ini..."
            />
          </div>

          {/* Cara Bermain */}
          <div>
            <label className={labelCls}>Cara Bermain</label>
            <textarea
              name="caraBermain"
              rows={5}
              value={formData.caraBermain || ''}
              onChange={handleChange}
              className={`${inputCls} resize-none`}
              placeholder="Langkah demi langkah..."
            />
          </div>

          {/* Nilai Moral */}
          <div>
            <label className={labelCls}>Nilai Moral &amp; Karakter</label>
            <textarea
              name="nilaiMoral"
              rows={3}
              value={formData.nilaiMoral || ''}
              onChange={handleChange}
              className={`${inputCls} resize-none`}
              placeholder="Apa pesan yang ingin disampaikan?"
            />
          </div>
        </div>
      </div>

      {/* ── Tahap 04 — Inventaris Alat ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-4">
          <span className={sectionLabelCls}>Tahap 04</span>
          <h3 className={headingCls}>Inventaris Alat</h3>
          <p className="text-sm text-warm-label mt-2 leading-relaxed">
            Daftarkan peralatan fisik yang dibutuhkan untuk memulai permainan.
          </p>
        </div>
        <div className="md:col-span-8 space-y-4">
          {peralatan.map((alat, index) => (
            <div key={index} className="bg-warm-card rounded-xl shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20 dark:border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-surface-container-highest dark:bg-warm-field rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                    {alat.fotoAlat && alat.fotoAlat.length > 0 ? (
                      <img src={alat.fotoAlat[0]} alt={alat.nama} className="w-full h-full object-cover" />
                    ) : peralatanFotoFiles[index]?.length > 0 ? (
                      <img src={URL.createObjectURL(peralatanFotoFiles[index][0])} alt={alat.nama} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-5 h-5 text-warm-label" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-on-surface text-sm">{alat.nama || `Peralatan #${index + 1}`}</p>
                    <p className="text-xs text-warm-label">{alat.nama ? (alat.deskripsi || 'Isi detail di bawah') : 'Belum ada nama & foto'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removePeralatan(index)}
                  className="text-warm-label hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  title="Hapus peralatan"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Expandable fields */}
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Nama Alat</label>
                    <input
                      type="text"
                      value={alat.nama}
                      onChange={(e) => handlePeralatanChange(index, 'nama', e.target.value)}
                      className={`${inputCls} text-sm py-2.5`}
                      placeholder="Nama alat..."
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Kisaran Harga</label>
                    <input
                      type="text"
                      value={alat.kisaranHarga || ''}
                      onChange={(e) => handlePeralatanChange(index, 'kisaranHarga', e.target.value)}
                      className={`${inputCls} text-sm py-2.5`}
                      placeholder="Contoh: Rp 50.000"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Deskripsi</label>
                  <textarea
                    value={alat.deskripsi || ''}
                    onChange={(e) => handlePeralatanChange(index, 'deskripsi', e.target.value)}
                    className={`${inputCls} resize-none text-sm py-2.5`}
                    rows={2}
                    placeholder="Deskripsi alat..."
                  />
                </div>

                {/* Foto Alat */}
                <div>
                  <label className={labelCls}>Foto Alat</label>
                  <div className="flex flex-wrap gap-2">
                    {(alat.fotoAlat || []).map((url, fotoIdx) => (
                      <div key={fotoIdx} className="relative group w-16 h-16">
                        <img src={url} alt={`foto alat ${fotoIdx + 1}`} className="w-full h-full object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeExistingFotoAlat(index, fotoIdx)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {(peralatanFotoFiles[index] || []).map((file, fileIdx) => (
                      <div key={fileIdx} className="relative group w-16 h-16">
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover rounded-lg border-2 border-primary/30" />
                        <button
                          type="button"
                          onClick={() => removeNewPeralatanFotoFile(index, fileIdx)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <label className="w-16 h-16 bg-surface-container-highest dark:bg-warm-field rounded-lg flex items-center justify-center cursor-pointer border border-dashed border-outline-variant dark:border-white/10 hover:border-primary hover:border-2 transition-all">
                      <svg className="w-5 h-5 text-warm-label" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePeralatanFotoChange(index, e)}
                      />
                    </label>
                  </div>
                </div>

                {/* URL Pembelian */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls}>URL Pembelian</label>
                    <button
                      type="button"
                      onClick={() => addUrlPembelian(index)}
                      className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/70 transition-colors"
                    >
                      + Tambah URL
                    </button>
                  </div>
                  {(alat.urlPembelian || []).length === 0 && (
                    <p className="text-xs text-warm-label/60 italic">Belum ada URL pembelian.</p>
                  )}
                  {(alat.urlPembelian || []).map((url, urlIdx) => (
                    <div key={urlIdx} className="flex gap-2 mt-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => handleUrlPembelianChange(index, urlIdx, e.target.value)}
                        className={`${inputCls} text-sm py-2`}
                        placeholder="https://tokopedia.com/..."
                      />
                      <button
                        type="button"
                        onClick={() => removeUrlPembelian(index, urlIdx)}
                        className="text-warm-label hover:text-red-500 px-1 transition-colors"
                        title="Hapus URL"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Add peralatan button */}
          <button
            type="button"
            onClick={addPeralatan}
            className="w-full py-4 rounded-xl border-2 border-dashed border-outline-variant/40 text-warm-label hover:text-primary hover:border-primary/40 hover:bg-primary-fixed/20 transition-all flex items-center justify-center gap-2 group"
          >
            <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest">Tambah Alat Baru</span>
          </button>
        </div>
      </div>

      {/* ── Tahap 05 — Dokumentasi Visual ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-4">
          <span className={sectionLabelCls}>Tahap 05</span>
          <h3 className={headingCls}>Dokumentasi Visual</h3>
          <p className="text-sm text-warm-label mt-2 leading-relaxed">
            Lengkapi arsip digital dengan dokumentasi yang komprehensif.
          </p>
        </div>
        <div className="md:col-span-8 space-y-8">

          {/* Foto Kegiatan */}
          <div className="space-y-4">
            <label className={labelCls}>Foto Kegiatan</label>
            <div
              onDrop={handleFotoDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleFotoDragEnter}
              onDragLeave={handleFotoDragLeave}
              className={uploadZoneCls(isDraggingFoto)}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFotoChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-14 h-14 bg-primary-fixed dark:bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-bold text-on-surface text-sm mb-1">Unggah Foto</p>
              <p className="text-[10px] text-warm-label max-w-xs mx-auto">Mendukung format JPG, PNG (Maks. 10MB/file)</p>
            </div>

            {(existingFotos.length > 0 || fotoFiles.length > 0) && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {existingFotos.map((url, idx) => (
                  <div key={`ef-${idx}`} className="aspect-square bg-surface-container-highest dark:bg-warm-field rounded-lg overflow-hidden relative group">
                    <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <button type="button" onClick={() => removeExistingFoto(idx)} className="text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                {fotoFiles.map((file, idx) => (
                  <div key={`nf-${idx}`} className="aspect-square bg-surface-container-highest dark:bg-warm-field rounded-lg overflow-hidden relative group">
                    <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <button type="button" onClick={() => removeFotoFile(idx)} className="text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video Kegiatan */}
          <div className="space-y-4">
            <label className={labelCls}>Video Kegiatan</label>
            <div
              onDrop={handleVideoDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleVideoDragEnter}
              onDragLeave={handleVideoDragLeave}
              className={uploadZoneCls(isDraggingVideo)}
            >
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={handleVideoChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-14 h-14 bg-primary-fixed dark:bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-bold text-on-surface text-sm mb-1">Unggah Video</p>
              <p className="text-[10px] text-warm-label max-w-xs mx-auto">Mendukung format MP4, MOV (Maks. 50MB)</p>
            </div>

            {(existingVideos.length > 0 || videoFiles.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {existingVideos.map((url, idx) => (
                  <div key={`ev-${idx}`} className="relative group rounded-xl overflow-hidden">
                    <video src={url} controls className="w-full h-40 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => removeExistingVideo(idx)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {videoFiles.map((file, idx) => (
                  <div key={`nv-${idx}`} className="relative group rounded-xl overflow-hidden">
                    <video src={URL.createObjectURL(file)} controls className="w-full h-40 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => removeVideoFile(idx)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dokumen Kurikulum/Panduan */}
          <div className="space-y-4">
            <label className={labelCls}>Dokumen Kurikulum/Panduan</label>
            <div
              onDrop={handleDokumenDrop}
              onDragOver={handleDragOver}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingDokumen(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingDokumen(false); }}
              className={uploadZoneCls(isDraggingDokumen)}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                onChange={handleDokumenChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-14 h-14 bg-primary-fixed dark:bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-bold text-on-surface text-sm mb-1">Unggah Dokumen</p>
              <p className="text-[10px] text-warm-label max-w-xs mx-auto">Mendukung format PDF, DOC (Maks. 20MB)</p>
            </div>

            {(existingDokumen.length > 0 || dokumenFiles.length > 0) && (
              <div className="space-y-2">
                {existingDokumen.map((url, idx) => {
                  const filename = url.split('/').pop() || `Dokumen ${idx + 1}`;
                  return (
                    <div key={`ed-${idx}`} className="flex items-center justify-between p-3 bg-warm-card rounded-lg border border-outline-variant/30 dark:border-white/10">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-primary-fixed dark:bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                          {filename}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExistingDokumen(idx)}
                        className="text-warm-label hover:text-red-500 ml-2 shrink-0 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
                {dokumenFiles.map((file, idx) => (
                  <div key={`nd-${idx}`} className="flex items-center justify-between p-3 bg-warm-card rounded-lg border border-outline-variant/30 dark:border-white/10">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 bg-primary-fixed dark:bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-sm text-on-surface truncate">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDokumenFile(idx)}
                      className="text-warm-label hover:text-red-500 ml-2 shrink-0 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer Actions ── */}
      <div className="pt-12 border-t border-outline-variant/20 dark:border-white/10 flex flex-col sm:flex-row items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full sm:w-auto px-8 py-3 text-warm-label font-bold text-[10px] uppercase tracking-widest hover:bg-surface-container-low dark:hover:bg-warm-field rounded-lg transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto px-12 py-4 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {isLoading && (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          Simpan
        </button>
      </div>
    </form>
  );
}
