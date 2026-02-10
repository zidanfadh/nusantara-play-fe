import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DaerahSelector } from '@/components/daerah/DaerahSelector';
import { PROTEntity, PROTJenis, TargetUsia, Peralatan } from '@/types/prot';

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

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
      if (initialData.peralatan) {
        setPeralatan(initialData.peralatan);
      }
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDaerahChange = (type: 'provinsi' | 'kabkota', id: string) => {
    if (type === 'provinsi') {
      setFormData((prev) => ({ ...prev, provinsiKode: id, kabkotaKode: '' }));
    } else {
      setFormData((prev) => ({ ...prev, kabkotaKode: id }));
    }
  };

  const handlePeralatanChange = (index: number, field: keyof Peralatan, value: string) => {
    const newPeralatan = [...peralatan];
    newPeralatan[index] = { ...newPeralatan[index], [field]: value };
    setPeralatan(newPeralatan);
    setFormData((prev) => ({ ...prev, peralatan: newPeralatan }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-background p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="border-b pb-4 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nama */}
        <div className="space-y-2">
          <label htmlFor="nama" className="block text-sm font-medium text-gray-700">
            Nama Permainan/Olahraga <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="nama"
            name="nama"
            required
            value={formData.nama || ''}
            onChange={handleChange}
            className="bg-gray-50 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Contoh: Gobak Sodor"
          />
        </div>

        {/* Jenis */}
        <div className="space-y-2">
          <label htmlFor="jenis" className="block text-sm font-medium text-gray-700">
            Jenis <span className="text-red-500">*</span>
          </label>
          <select
            id="jenis"
            name="jenis"
            required
            value={formData.jenis || PROTJenis.PERMAINAN_RAKYAT}
            onChange={handleChange}
            className="bg-gray-50 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value={PROTJenis.PERMAINAN_RAKYAT}>Permainan Rakyat</option>
            <option value={PROTJenis.OLAHRAGA_TRADISIONAL}>Olahraga Tradisional</option>
          </select>
        </div>

        {/* Target Usia */}
        <div className="space-y-2">
          <label htmlFor="targetUsia" className="block text-sm font-medium text-gray-700">
            Target Usia <span className="text-red-500">*</span>
          </label>
          <select
            id="targetUsia"
            name="targetUsia"
            required
            value={formData.targetUsia || TargetUsia.SEMUA_USIA}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
        <label className="block text-sm font-medium text-gray-700">
          Lokasi Asal <span className="text-red-500">*</span>
        </label>
        <div className="p-4 border border-gray-200 rounded-md bg-background">
          <DaerahSelector
            provinceValue={formData.provinsiKode}
            kabupatenKotaValue={formData.kabkotaKode}
            onProvinceChange={(id) => handleDaerahChange('provinsi', id)}
            onKabupatenKotaChange={(id) => handleDaerahChange('kabkota', id)}
            required
          />
        </div>
      </div>

      {/* Alamat Lengkap */}
      <div className="space-y-2">
        <label htmlFor="alamatLengkap" className="block text-sm font-medium text-gray-700">
          Alamat Lengkap / Detail Lokasi
        </label>
        <textarea
          id="alamatLengkap"
          name="alamatLengkap"
          rows={3}
          value={formData.alamatLengkap || ''}
          onChange={handleChange}
          className="w-full bg-gray-50 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Detail lokasi spesifik..."
        />
      </div>

      {/* Status Asal Usul */}
      <div className="space-y-2">
        <label htmlFor="statusAsalUsul" className="block text-sm font-medium text-gray-700">
          Sejarah / Asal Usul
        </label>
        <textarea
          id="statusAsalUsul"
          name="statusAsalUsul"
          rows={4}
          value={formData.statusAsalUsul || ''}
          onChange={handleChange}
          className="w-full bg-gray-50 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Jelaskan sejarah atau asal usul permainan ini..."
        />
      </div>

      {/* Cara Bermain */}
      <div className="space-y-2">
        <label htmlFor="caraBermain" className="block text-sm font-medium text-gray-700">
          Cara Bermain
        </label>
        <textarea
          id="caraBermain"
          name="caraBermain"
          rows={6}
          value={formData.caraBermain || ''}
          onChange={handleChange}
          className="w-full bg-gray-50 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Langkah-langkah cara bermain..."
        />
      </div>

      {/* Nilai Moral */}
      <div className="space-y-2">
        <label htmlFor="nilaiMoral" className="block text-sm font-medium text-gray-700">
          Nilai Moral / Filosofi
        </label>
        <textarea
          id="nilaiMoral"
          name="nilaiMoral"
          rows={3}
          value={formData.nilaiMoral || ''}
          onChange={handleChange}
          className="bg-gray-50 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Nilai-nilai yang terkandung..."
        />
      </div>

      {/* Peralatan */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700">
            Peralatan
          </label>
          <button
            type="button"
            onClick={addPeralatan}
            className="text-sm px-3 py-1 bg-gray-50 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            + Tambah Alat
          </button>
        </div>

        {peralatan.map((alat, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-md bg-background relative">
            <button
              type="button"
              onClick={() => removePeralatan(index)}
              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Nama Alat</label>
                <input
                  type="text"
                  value={alat.nama}
                  onChange={(e) => handlePeralatanChange(index, 'nama', e.target.value)}
                  className="w-full bg-gray-50 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  placeholder="Nama alat..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Kisaran Harga</label>
                <input
                  type="text"
                  value={alat.kisaranHarga || ''}
                  onChange={(e) => handlePeralatanChange(index, 'kisaranHarga', e.target.value)}
                  className="w-full bg-gray-50 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  placeholder="Contoh: Rp 50.000"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-gray-600">Deskripsi</label>
                <textarea
                  value={alat.deskripsi || ''}
                  onChange={(e) => handlePeralatanChange(index, 'deskripsi', e.target.value)}
                  className="w-full bg-gray-50 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  rows={2}
                  placeholder="Deskripsi alat..."
                />
              </div>
            </div>
          </div>
        ))}
        {peralatan.length === 0 && (
          <p className="text-sm text-gray-500 italic">Belum ada peralatan yang ditambahkan.</p>
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
