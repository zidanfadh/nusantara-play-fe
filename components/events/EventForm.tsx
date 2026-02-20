import { useState, useEffect } from 'react';
import { CreateEventData, EventJenis, EVENT_JENIS_LABELS, Event } from '@/types/events';
import { ProvinceSelect } from '@/components/daerah/ProvinceSelect';

interface EventFormProps {
  initialData?: Event;
  onSubmit: (data: CreateEventData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EventForm({ initialData, onSubmit, onCancel, isLoading = false }: EventFormProps) {

  const [formData, setFormData] = useState<CreateEventData>({
    nama: initialData?.nama || '',
    deskripsi: initialData?.deskripsi || '',
    jenis: initialData?.jenis || EventJenis.TERAS_BERMAIN,
    tanggal_mulai: initialData?.tanggal_mulai
      ? new Date(initialData.tanggal_mulai).toISOString().slice(0, 16)
      : '',
    tanggal_selesai: initialData?.tanggal_selesai
      ? new Date(initialData.tanggal_selesai).toISOString().slice(0, 16)
      : '',
    lokasi: initialData?.lokasi || '',
    daerah_id: initialData?.daerah_id || '',
    latitude: initialData?.latitude,
    longitude: initialData?.longitude,
    kuota_peserta: initialData?.kuota_peserta,
    banner_url: initialData?.banner_url,
    persyaratan: initialData?.persyaratan,
    contact_person: initialData?.contact_person,
    contact_phone: initialData?.contact_phone,
    contact_email: initialData?.contact_email,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : undefined) : value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nama.trim()) newErrors.nama = 'Nama event wajib diisi';
    if (!formData.deskripsi.trim()) newErrors.deskripsi = 'Deskripsi wajib diisi';
    if (!formData.tanggal_mulai) newErrors.tanggal_mulai = 'Tanggal mulai wajib diisi';
    if (!formData.tanggal_selesai) newErrors.tanggal_selesai = 'Tanggal selesai wajib diisi';
    if (!formData.lokasi.trim()) newErrors.lokasi = 'Lokasi wajib diisi';
    if (!formData.daerah_id) newErrors.daerah_id = 'Daerah wajib dipilih';

    // Validate date
    if (formData.tanggal_mulai && formData.tanggal_selesai) {
      const start = new Date(formData.tanggal_mulai);
      const end = new Date(formData.tanggal_selesai);
      if (end <= start) {
        newErrors.tanggal_selesai = 'Tanggal selesai harus setelah tanggal mulai';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // Convert datetime-local to ISO string
      const submitData: CreateEventData = {
        ...formData,
        tanggal_mulai: new Date(formData.tanggal_mulai).toISOString(),
        tanggal_selesai: new Date(formData.tanggal_selesai).toISOString(),
      };
      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nama Event */}
      <div>
        <label htmlFor="nama" className="block text-sm font-medium text-gray-700">
          Nama Event <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="nama"
          name="nama"
          value={formData.nama}
          onChange={handleChange}
          className={`mt-1 pr-3 pl-2 w-full px-3 py-2 border text-gray-700 block w-full rounded-sm shadow-sm sm:text-sm ${
            errors.nama
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
          }`}
        />
        {errors.nama && <p className="mt-1 text-sm text-red-600">{errors.nama}</p>}
      </div>

      {/* Deskripsi */}
      <div>
        <label htmlFor="deskripsi" className="block text-sm font-medium text-gray-700">
          Deskripsi <span className="text-red-500">*</span>
        </label>
        <textarea
          id="deskripsi"
          name="deskripsi"
          rows={4}
          value={formData.deskripsi}
          onChange={handleChange}
          className={`mt-1 pr-3 pl-2 border text-gray-700 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.deskripsi
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
          }`}
        />
        {errors.deskripsi && <p className="mt-1 text-sm text-red-600">{errors.deskripsi}</p>}
      </div>

      {/* Jenis & Daerah */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="jenis" className="block text-sm font-medium text-gray-700">
            Jenis Event <span className="text-red-500">*</span>
          </label>
          <select
            id="jenis"
            name="jenis"
            value={formData.jenis}
            onChange={handleChange}
            className="w-full px-3 py-2 mt-1 pr-3 pl-2 border text-gray-700 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            {Object.entries(EVENT_JENIS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <ProvinceSelect
          value={formData.daerah_id}
          onChange={(provinceId) => {
            setFormData((prev) => ({ ...prev, daerah_id: provinceId }));
            if (errors.daerah_id) {
              setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors.daerah_id;
                return newErrors;
              });
            }
          }}
          error={errors.daerah_id}
          required
          placeholder="Pilih Daerah"
        />
      </div>

      {/* Tanggal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tanggal_mulai" className="block text-sm font-medium text-gray-700">
            Tanggal Mulai <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="tanggal_mulai"
            name="tanggal_mulai"
            value={formData.tanggal_mulai}
            onChange={handleChange}
            className={`w-full px-3 py-2 mt-1 pr-3 pl-2 border text-gray-700 block w-full rounded-md shadow-sm sm:text-sm ${
              errors.tanggal_mulai
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
          />
          {errors.tanggal_mulai && (
            <p className="mt-1 text-sm text-red-600">{errors.tanggal_mulai}</p>
          )}
        </div>

        <div>
          <label htmlFor="tanggal_selesai" className="block text-sm font-medium text-gray-700">
            Tanggal Selesai <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="tanggal_selesai"
            name="tanggal_selesai"
            value={formData.tanggal_selesai}
            onChange={handleChange}
            className={`w-full px-3 py-2 mt-1 pr-3 pl-2 border text-gray-700 block w-full rounded-md shadow-sm sm:text-sm ${
              errors.tanggal_selesai
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
          />
          {errors.tanggal_selesai && (
            <p className="mt-1 text-sm text-red-600">{errors.tanggal_selesai}</p>
          )}
        </div>
      </div>

      {/* Lokasi */}
      <div>
        <label htmlFor="lokasi" className="block text-sm font-medium text-gray-700">
          Lokasi <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="lokasi"
          name="lokasi"
          value={formData.lokasi}
          onChange={handleChange}
          placeholder="Nama venue atau alamat lengkap"
          className={`w-full px-3 py-2 mt-1 pr-3 pl-2 border text-gray-700 block w-full rounded-md shadow-sm sm:text-sm ${
            errors.lokasi
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
          }`}
        />
        {errors.lokasi && <p className="mt-1 text-sm text-red-600">{errors.lokasi}</p>}
      </div>

      {/* Koordinat (Optional) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
            Latitude (Opsional)
          </label>
          <input
            type="number"
            id="latitude"
            name="latitude"
            step="any"
            value={formData.latitude || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 mt-1 pr-3 pl-2 border text-gray-700 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
            Longitude (Opsional)
          </label>
          <input
            type="number"
            id="longitude"
            name="longitude"
            step="any"
            value={formData.longitude || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 mt-1 pr-3 pl-2 border text-gray-700 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Kuota Peserta */}
      <div>
        <label htmlFor="kuota_peserta" className="block text-sm font-medium text-gray-700">
          Kuota Peserta (Opsional)
        </label>
        <input
          type="number"
          id="kuota_peserta"
          name="kuota_peserta"
          min="1"
          value={formData.kuota_peserta || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 mt-1 pr-3 pl-2 border text-gray-700 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      {/* Banner URL */}
      <div>
        <label htmlFor="banner_url" className="block text-sm font-medium text-gray-700">
          URL Banner (Opsional)
        </label>
        <input
          type="url"
          id="banner_url"
          name="banner_url"
          value={formData.banner_url || ''}
          onChange={handleChange}
          placeholder="https://example.com/banner.jpg"
          className="w-full px-3 py-2 mt-1 pr-3 pl-2 border text-gray-700 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      {/* Persyaratan */}
      <div>
        <label htmlFor="persyaratan" className="block text-sm font-medium text-gray-700">
          Persyaratan Peserta (Opsional)
        </label>
        <textarea
          id="persyaratan"
          name="persyaratan"
          rows={3}
          value={formData.persyaratan || ''}
          onChange={handleChange}
          className="mt-1 pr-3 pl-2 border text-gray-700 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      {/* Contact Info */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Kontak Person</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700">
              Nama Kontak
            </label>
            <input
              type="text"
              id="contact_person"
              name="contact_person"
              value={formData.contact_person || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 pr-3 pl-2 border text-gray-700 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
                No. Telepon
              </label>
              <input
                type="tel"
                id="contact_phone"
                name="contact_phone"
                value={formData.contact_phone || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 mt-1 pr-3 pl-2 border text-gray-700 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="contact_email"
                name="contact_email"
                value={formData.contact_email || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 mt-1 pr-3 pl-2 border text-gray-700 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Menyimpan...' : initialData ? 'Update Event' : 'Buat Event'}
        </button>
      </div>
    </form>
  );
}
