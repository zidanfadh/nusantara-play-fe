import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DaerahSelector } from '@/components/daerah/DaerahSelector';
import { PROTEntity, PROTJenis, TargetUsia, Peralatan } from '@/types/prot';
import type { Daerah } from '@/types/daerah';
import { getAllProvinces, getChildrenDaerah } from '@/lib/api/daerah';

interface ProtFormProps {
  initialData?: Partial<PROTEntity>;
  onSubmit: (data: Partial<PROTEntity>) => Promise<void>;
  isLoading: boolean;
  title: string;
}

export function ProtForm({ initialData, onSubmit, isLoading, title }: ProtFormProps) {
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
  const [provinsiId, setProvinsiId] = useState<string>('');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-background dark:bg-background p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="border-b pb-4 mb-4">
        <h2 className="text-xl font-semibold ">{title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nama */}
        <div className="space-y-2">
          <label htmlFor="nama" className="block text-sm font-medium ">
            Nama Permainan/Olahraga <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="nama"
            name="nama"
            required
            value={formData.nama || ''}
            onChange={handleChange}
            className="bg-gray-50 dark:bg-background w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Contoh: Gobak Sodor"
          />
        </div>

        {/* Jenis */}
        <div className="space-y-2">
          <label htmlFor="jenis" className="block text-sm font-medium ">
            Jenis <span className="text-red-500">*</span>
          </label>
          <select
            id="jenis"
            name="jenis"
            required
            value={formData.jenis || PROTJenis.PERMAINAN_RAKYAT}
            onChange={handleChange}
            className="bg-gray-50 dark:bg-background w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value={PROTJenis.PERMAINAN_RAKYAT}>Permainan Rakyat</option>
            <option value={PROTJenis.OLAHRAGA_TRADISIONAL}>Olahraga Tradisional</option>
          </select>
        </div>

        {/* Target Usia */}
        <div className="space-y-2">
          <label htmlFor="targetUsia" className="block text-sm font-medium ">
            Target Usia <span className="text-red-500">*</span>
          </label>
          <select
            id="targetUsia"
            name="targetUsia"
            required
            value={formData.targetUsia || TargetUsia.SEMUA_USIA}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-background border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value={TargetUsia.ANAK}>Anak-anak</option>
            <option value={TargetUsia.REMAJA}>Remaja</option>
            <option value={TargetUsia.DEWASA}>Dewasa</option>
            <option value={TargetUsia.SEMUA_USIA}>Semua Usia</option>
          </select>
        </div>
      </div>

      {/* Lokasi */}
      <div className="space-y-2">
        <label className="block text-sm font-medium ">
          Lokasi Asal <span className="text-red-500">*</span>
        </label>
        <div className="p-4 border border-gray-200 rounded-md bg-background dark:bg-background">
          <DaerahSelector
            provinceValue={provinsiId}
            kabupatenKotaValue={kabkotaId}
            onProvinceChange={handleProvinceChange}
            onKabupatenKotaChange={handleKabupatenKotaChange}
            required
          />
        </div>
      </div>

      {/* Alamat Lengkap */}
      <div className="space-y-2">
        <label htmlFor="alamatLengkap" className="block text-sm font-medium ">
          Alamat Lengkap / Detail Lokasi
        </label>
        <textarea
          id="alamatLengkap"
          name="alamatLengkap"
          rows={3}
          value={formData.alamatLengkap || ''}
          onChange={handleChange}
          className="w-full bg-gray-50 dark:bg-background px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Detail lokasi spesifik..."
        />
      </div>

      {/* Status Asal Usul */}
      <div className="space-y-2">
        <label htmlFor="statusAsalUsul" className="block text-sm font-medium">
          Sejarah / Asal Usul
        </label>
        <textarea
          id="statusAsalUsul"
          name="statusAsalUsul"
          rows={4}
          value={formData.statusAsalUsul || ''}
          onChange={handleChange}
          className="w-full bg-gray-50 dark:bg-background px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Jelaskan sejarah atau asal usul permainan ini..."
        />
      </div>

      {/* Cara Bermain */}
      <div className="space-y-2">
        <label htmlFor="caraBermain" className="block text-sm font-medium">
          Cara Bermain
        </label>
        <textarea
          id="caraBermain"
          name="caraBermain"
          rows={6}
          value={formData.caraBermain || ''}
          onChange={handleChange}
          className="w-full bg-gray-50 dark:bg-background px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Langkah-langkah cara bermain..."
        />
      </div>

      {/* Nilai Moral */}
      <div className="space-y-2">
        <label htmlFor="nilaiMoral" className="block text-sm font-medium">
          Nilai Moral / Filosofi
        </label>
        <textarea
          id="nilaiMoral"
          name="nilaiMoral"
          rows={3}
          value={formData.nilaiMoral || ''}
          onChange={handleChange}
          className="bg-gray-50 dark:bg-background w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Nilai-nilai yang terkandung..."
        />
      </div>

      {/* Peralatan */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium">
            Peralatan
          </label>
          <button
            type="button"
            onClick={addPeralatan}
            className="text-sm px-3 py-1 bg-gray-50 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            + Tambah Alat
          </button>
        </div>

        {peralatan.map((alat, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-md bg-background dark:bg-background relative">
            <button
              type="button"
              onClick={() => removePeralatan(index)}
              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
              title="Hapus peralatan"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Nama Alat</label>
                <input
                  type="text"
                  value={alat.nama}
                  onChange={(e) => handlePeralatanChange(index, 'nama', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-background px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  placeholder="Nama alat..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Kisaran Harga</label>
                <input
                  type="text"
                  value={alat.kisaranHarga || ''}
                  onChange={(e) => handlePeralatanChange(index, 'kisaranHarga', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-background px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  placeholder="Contoh: Rp 50.000"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium">Deskripsi</label>
                <textarea
                  value={alat.deskripsi || ''}
                  onChange={(e) => handlePeralatanChange(index, 'deskripsi', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-background px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  rows={2}
                  placeholder="Deskripsi alat..."
                />
              </div>
              {/* Foto Alat per peralatan */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-medium">Foto Alat</label>
                {/* Existing foto alat */}
                {alat.fotoAlat && alat.fotoAlat.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {alat.fotoAlat.map((url, fotoIdx) => (
                      <div key={fotoIdx} className="relative group w-16 h-16">
                        <img src={url} alt={`foto alat ${fotoIdx + 1}`} className="w-full h-full object-cover rounded border border-gray-300" />
                        <button
                          type="button"
                          onClick={() => removeExistingFotoAlat(index, fotoIdx)}
                          title="Hapus foto alat"
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* New foto alat files */}
                {(peralatanFotoFiles[index] || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(peralatanFotoFiles[index] || []).map((file, fileIdx) => (
                      <div key={fileIdx} className="relative group w-16 h-16">
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover rounded border border-blue-300" />
                        <button
                          type="button"
                          onClick={() => removeNewPeralatanFotoFile(index, fileIdx)}
                          title="Batal upload foto alat"
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="inline-flex items-center gap-1.5 cursor-pointer px-2 py-1 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Foto
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => handlePeralatanFotoChange(index, e)}
                  />
                </label>
              </div>

              <div className="md:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">URL Pembelian (Tokopedia, Shopee, dll.)</label>
                  <button
                    type="button"
                    onClick={() => addUrlPembelian(index)}
                    className="text-xs px-2 py-0.5 bg-gray-50 border border-gray-300 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    + Tambah URL
                  </button>
                </div>
                {(alat.urlPembelian || []).map((url, urlIdx) => (
                  <div key={urlIdx} className="flex gap-2 mt-1">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleUrlPembelianChange(index, urlIdx, e.target.value)}
                      className="flex-1 bg-gray-50 dark:bg-background px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                      placeholder="https://tokopedia.com/..."
                    />
                    <button
                      type="button"
                      onClick={() => removeUrlPembelian(index, urlIdx)}
                      className="text-red-500 hover:text-red-700 px-1"
                      title="Hapus URL"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
                {(!alat.urlPembelian || alat.urlPembelian.length === 0) && (
                  <p className="text-xs text-gray-400 italic">Belum ada URL pembelian.</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {peralatan.length === 0 && (
          <p className="text-sm  italic">Belum ada peralatan yang ditambahkan.</p>
        )}
      </div>

      {/* Dokumentasi Kegiatan - Foto */}
      <div className="space-y-4">
        <label className="block text-sm font-medium">
          Dokumentasi Foto Kegiatan
        </label>

        {/* Drag and Drop Zone */}
        <div
          onDrop={handleFotoDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleFotoDragEnter}
          onDragLeave={handleFotoDragLeave}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDraggingFoto
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 hover:border-blue-400 bg-gray-50 dark:bg-background'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFotoChange}
            className="hidden"
            id="foto-input"
          />
          <label
            htmlFor="foto-input"
            className="cursor-pointer flex flex-col items-center justify-center"
          >
            <svg
              className={`w-12 h-12 mb-3 ${isDraggingFoto ? 'text-blue-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span className="font-semibold text-blue-600">Klik untuk upload</span> atau drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG, JPEG hingga 10MB</p>
          </label>
        </div>

        {/* Existing Photos */}
        {existingFotos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Foto yang sudah ada:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {existingFotos.map((url, index) => (
                <div key={`existing-foto-${index}`} className="relative group">
                  <img
                    src={url}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingFoto(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus foto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Photo Files */}
        {fotoFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Foto baru yang akan diupload:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {fotoFiles.map((file, index) => (
                <div key={`new-foto-${index}`} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-32 object-cover rounded-md border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeFotoFile(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus foto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dokumentasi Kegiatan - Video */}
      <div className="space-y-4">
        <label className="block text-sm font-medium">
          Dokumentasi Video Kegiatan
        </label>

        {/* Drag and Drop Zone */}
        <div
          onDrop={handleVideoDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleVideoDragEnter}
          onDragLeave={handleVideoDragLeave}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDraggingVideo
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-300 hover:border-purple-400 bg-gray-50 dark:bg-background'
          }`}
        >
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={handleVideoChange}
            className="hidden"
            id="video-input"
          />
          <label
            htmlFor="video-input"
            className="cursor-pointer flex flex-col items-center justify-center"
          >
            <svg
              className={`w-12 h-12 mb-3 ${isDraggingVideo ? 'text-purple-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span className="font-semibold text-purple-600">Klik untuk upload</span> atau drag and drop
            </p>
            <p className="text-xs text-gray-500">MP4, MOV, AVI hingga 100MB</p>
          </label>
        </div>

        {/* Existing Videos */}
        {existingVideos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Video yang sudah ada:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {existingVideos.map((url, index) => (
                <div key={`existing-video-${index}`} className="relative group border border-gray-300 rounded-md p-2 bg-background dark:bg-background">
                  <video
                    src={url}
                    controls
                    className="w-full h-48 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingVideo(index)}
                    className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus video"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Video Files */}
        {videoFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Video baru yang akan diupload:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videoFiles.map((file, index) => (
                <div key={`new-video-${index}`} className="relative group border border-gray-300 rounded-md p-2 bg-background dark:bg-background">
                  <video
                    src={URL.createObjectURL(file)}
                    controls
                    className="w-full h-48 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => removeVideoFile(index)}
                    className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus video"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dokumen Kurikulum */}
      <div className="space-y-4">
        <label className="block text-sm font-medium">
          Dokumen Kurikulum / Panduan Permainan
        </label>

        <div
          onDrop={handleDokumenDrop}
          onDragOver={handleDragOver}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingDokumen(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingDokumen(false); }}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDraggingDokumen
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
              : 'border-gray-300 hover:border-amber-400 bg-gray-50 dark:bg-background'
          }`}
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            onChange={handleDokumenChange}
            className="hidden"
            id="dokumen-input"
          />
          <label
            htmlFor="dokumen-input"
            className="cursor-pointer flex flex-col items-center justify-center"
          >
            <svg
              className={`w-12 h-12 mb-3 ${isDraggingDokumen ? 'text-amber-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span className="font-semibold text-amber-600">Klik untuk upload</span> atau drag and drop
            </p>
            <p className="text-xs text-gray-500">PDF, DOC, DOCX (max 10 file)</p>
          </label>
        </div>

        {/* Existing Documents */}
        {existingDokumen.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Dokumen yang sudah ada:</p>
            <div className="space-y-2">
              {existingDokumen.map((url, index) => {
                const filename = url.split('/').pop() || `Dokumen ${index + 1}`;
                return (
                  <div key={`existing-dok-${index}`} className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-background">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">{filename}</a>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExistingDokumen(index)}
                      className="text-red-500 hover:text-red-700 ml-2 shrink-0"
                      title="Hapus dokumen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* New Document Files */}
        {dokumenFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Dokumen baru yang akan diupload:</p>
            <div className="space-y-2">
              {dokumenFiles.map((file, index) => (
                <div key={`new-dok-${index}`} className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-background">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 truncate">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDokumenFile(index)}
                    className="text-red-500 hover:text-red-700 ml-2 shrink-0"
                    title="Hapus dokumen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
