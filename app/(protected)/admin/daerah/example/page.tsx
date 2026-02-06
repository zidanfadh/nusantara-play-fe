// Example usage of DaerahSelector in a form

'use client';

import { useState } from 'react';
import { DaerahSelector } from '@/components/daerah/DaerahSelector';
import type { Daerah } from '@/types/daerah';

export default function DaerahExamplePage() {
  const [formData, setFormData] = useState({
    provinceId: '',
    daerahId: '',
  });

  const [selectedProvince, setSelectedProvince] = useState<Daerah | null>(null);
  const [selectedDaerah, setSelectedDaerah] = useState<Daerah | null>(null);

  const handleProvinceChange = (provinceId: string, province: Daerah | null) => {
    setFormData((prev) => ({ ...prev, provinceId, daerahId: '' }));
    setSelectedProvince(province);
    setSelectedDaerah(null);
  };

  const handleDaerahChange = (daerahId: string, daerah: Daerah | null) => {
    setFormData((prev) => ({ ...prev, daerahId }));
    setSelectedDaerah(daerah);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', {
      formData,
      selectedProvince,
      selectedDaerah,
    });
    alert('Data berhasil disimpan! Check console untuk detail.');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Contoh Penggunaan Daerah Selector
        </h1>
        <p className="mt-2 text-gray-600">
          Form dengan dropdown provinsi dan kabupaten/kota yang hierarkis
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DaerahSelector
            provinceValue={formData.provinceId}
            kabupatenKotaValue={formData.daerahId}
            onProvinceChange={handleProvinceChange}
            onKabupatenKotaChange={handleDaerahChange}
            required={true}
            showKabupatenKota={true}
          />

          {/* Display Selected Data */}
          {(selectedProvince || selectedDaerah) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Data Terpilih:</h3>
              <div className="text-sm text-blue-800 space-y-1">
                {selectedProvince && (
                  <p>
                    <span className="font-medium">Provinsi:</span> {selectedProvince.nama}
                  </p>
                )}
                {selectedDaerah && (
                  <p>
                    <span className="font-medium">Daerah:</span> {selectedDaerah.nama} (
                    {selectedDaerah.level})
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Submit
          </button>
        </form>
      </div>

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">💡 Tips Penggunaan:</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Pilih provinsi terlebih dahulu</li>
          <li>Dropdown kabupaten/kota akan otomatis ter-load setelah provinsi dipilih</li>
          <li>Saat provinsi berubah, kabupaten/kota akan otomatis di-reset</li>
          <li>Gunakan <code className="bg-gray-200 px-1 rounded">showKabupatenKota=false</code> jika hanya butuh provinsi</li>
        </ul>
      </div>
    </div>
  );
}
