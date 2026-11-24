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
    <form onSubmit={handleSubmit} className="space-y-16 mt-8">
      {/* SECTION: Informasi Dasar */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-8 h-[2px] bg-primary"></div>
          <h2 className="text-lg font-bold text-foreground">Informasi Dasar</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          <div className="flex flex-col gap-2">
            <label htmlFor="nama" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Nama Event <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="nama"
              name="nama"
              value={formData.nama}
              onChange={handleChange}
              placeholder="Contoh: Festival Gasing Nusantara"
              className={`bg-transparent border-t-0 border-x-0 border-b px-0 py-3 text-lg focus:ring-0 placeholder:text-stone-400 dark:placeholder:text-stone-600 transition-colors ${
                errors.nama ? 'border-red-500 focus:border-red-500' : 'border-border/40 dark:border-border focus:border-primary'
              }`}
            />
            {errors.nama && <p className="text-sm text-danger">{errors.nama}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="jenis" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Jenis Event <span className="text-red-500">*</span>
            </label>
            <select
              id="jenis"
              name="jenis"
              value={formData.jenis}
              onChange={handleChange}
              className="bg-transparent border-t-0 border-x-0 border-b border-border/40 dark:border-border px-0 py-3 text-lg focus:ring-0 focus:border-primary appearance-none transition-colors cursor-pointer text-foreground [&>option]:bg-white dark:[&>option]:bg-background"
            >
              {Object.entries(EVENT_JENIS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="tanggal_mulai" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tanggal Mulai <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="tanggal_mulai"
              name="tanggal_mulai"
              value={formData.tanggal_mulai}
              onChange={handleChange}
              className={`bg-transparent border-t-0 border-x-0 border-b px-0 py-3 text-lg focus:ring-0 transition-colors text-foreground dark:text-foreground dark:[color-scheme:dark] ${
                errors.tanggal_mulai ? 'border-red-500 focus:border-red-500' : 'border-border/40 dark:border-border focus:border-primary'
              }`}
            />
            {errors.tanggal_mulai && <p className="text-sm text-danger">{errors.tanggal_mulai}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="tanggal_selesai" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tanggal Selesai <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="tanggal_selesai"
              name="tanggal_selesai"
              value={formData.tanggal_selesai}
              onChange={handleChange}
              className={`bg-transparent border-t-0 border-x-0 border-b px-0 py-3 text-lg focus:ring-0 transition-colors text-foreground dark:text-foreground dark:[color-scheme:dark] ${
                errors.tanggal_selesai ? 'border-red-500 focus:border-red-500' : 'border-border/40 dark:border-border focus:border-primary'
              }`}
            />
            {errors.tanggal_selesai && <p className="text-sm text-danger">{errors.tanggal_selesai}</p>}
          </div>
        </div>
      </section>

      {/* SECTION: Lokasi & Kapasitas */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-8 h-[2px] bg-primary"></div>
          <h2 className="text-lg font-bold text-foreground">Lokasi & Kapasitas</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-10">
          <div className="md:col-span-2 flex flex-col gap-2">
            <label htmlFor="lokasi" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Lokasi Spesifik <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="lokasi"
              name="lokasi"
              value={formData.lokasi}
              onChange={handleChange}
              placeholder="Nama gedung, lapangan, atau area"
              className={`bg-transparent border-t-0 border-x-0 border-b px-0 py-3 text-lg focus:ring-0 placeholder:text-stone-400 dark:placeholder:text-stone-600 transition-colors ${
                errors.lokasi ? 'border-red-500 focus:border-red-500' : 'border-border/40 dark:border-border focus:border-primary'
              }`}
            />
            {errors.lokasi && <p className="text-sm text-danger">{errors.lokasi}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Daerah (Prov/Kab/Kota) <span className="text-red-500">*</span>
            </label>
            <div className="pt-1">
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
                placeholder="Pilih Daerah..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="kuota_peserta" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Kuota Peserta
            </label>
            <input
              type="number"
              id="kuota_peserta"
              name="kuota_peserta"
              min="1"
              value={formData.kuota_peserta || ''}
              onChange={handleChange}
              placeholder="0 (Opsional)"
              className="bg-transparent border-t-0 border-x-0 border-b border-border/40 dark:border-border px-0 py-3 text-lg focus:ring-0 focus:border-primary placeholder:text-stone-400 dark:placeholder:text-stone-600 transition-colors"
            />
          </div>
          
          {/* Koordinat optional */}
          <div className="flex flex-col gap-2">
            <label htmlFor="latitude" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Latitude
            </label>
            <input
              type="number"
              id="latitude"
              name="latitude"
              step="any"
              value={formData.latitude || ''}
              onChange={handleChange}
              placeholder="(Opsional)"
              className="bg-transparent border-t-0 border-x-0 border-b border-border/40 dark:border-border px-0 py-3 text-lg focus:ring-0 focus:border-primary placeholder:text-stone-400 dark:placeholder:text-stone-600 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="longitude" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Longitude
            </label>
            <input
              type="number"
              id="longitude"
              name="longitude"
              step="any"
              value={formData.longitude || ''}
              onChange={handleChange}
              placeholder="(Opsional)"
              className="bg-transparent border-t-0 border-x-0 border-b border-border/40 dark:border-border px-0 py-3 text-lg focus:ring-0 focus:border-primary placeholder:text-stone-400 dark:placeholder:text-stone-600 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* SECTION: Detail & Konten */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-8 h-[2px] bg-primary"></div>
          <h2 className="text-lg font-bold text-foreground">Detail Narasumber & Konten</h2>
        </div>
        <div className="space-y-10">
          <div className="flex flex-col gap-2">
            <label htmlFor="deskripsi" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Deskripsi Event <span className="text-red-500">*</span>
            </label>
            <textarea
              id="deskripsi"
              name="deskripsi"
              rows={4}
              value={formData.deskripsi}
              onChange={handleChange}
              placeholder="Ceritakan keunikan event Anda..."
              className={`bg-card dark:bg-card border-none rounded-xl p-4 text-lg focus:ring-2 focus:ring-focus-ring/20 dark:focus:ring-focus-ring/20 placeholder:text-stone-400 dark:placeholder:text-stone-600 transition-shadow ${
                errors.deskripsi ? 'ring-2 ring-red-500/50' : ''
              }`}
            />
            {errors.deskripsi && <p className="text-sm text-danger">{errors.deskripsi}</p>}
          </div>
          
          <div className="flex flex-col gap-2">
            <label htmlFor="persyaratan" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Persyaratan Peserta
            </label>
            <textarea
              id="persyaratan"
              name="persyaratan"
              rows={3}
              value={formData.persyaratan || ''}
              onChange={handleChange}
              placeholder="Apa yang perlu dibawa atau disiapkan peserta?"
              className="bg-card border-none rounded-xl p-4 text-lg focus:ring-2 focus:ring-focus-ring/20 placeholder:text-stone-400 dark:placeholder:text-stone-600 transition-shadow"
            />
          </div>
        </div>
      </section>

      {/* SECTION: Media & Banner */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-8 h-[2px] bg-primary"></div>
          <h2 className="text-lg font-bold text-foreground">Media & Banner</h2>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="banner_url" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            URL Banner Event
          </label>
          <input
            type="url"
            id="banner_url"
            name="banner_url"
            value={formData.banner_url || ''}
            onChange={handleChange}
            placeholder="https://example.com/banner.jpg"
            className="bg-transparent border-t-0 border-x-0 border-b border-border/40 dark:border-border px-0 py-3 text-lg focus:ring-0 focus:border-primary placeholder:text-stone-400 dark:placeholder:text-stone-600 transition-colors"
          />
          <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">
            Rekomendasi 16:9 (Min. 1200x675px) - Sementara hanya support URL gambar.
          </p>
        </div>
      </section>

      {/* SECTION: Informasi Kontak */}
      <section className="space-y-8 pb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-8 h-[2px] bg-primary"></div>
          <h2 className="text-lg font-bold text-foreground">Informasi Kontak</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-10">
          <div className="flex flex-col gap-2">
            <label htmlFor="contact_person" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Nama Penanggung Jawab
            </label>
            <input
              type="text"
              id="contact_person"
              name="contact_person"
              value={formData.contact_person || ''}
              onChange={handleChange}
              placeholder="Nama lengkap panitia"
              className="bg-transparent border-t-0 border-x-0 border-b border-border/40 dark:border-border px-0 py-3 text-lg focus:ring-0 focus:border-primary placeholder:text-stone-400 dark:placeholder:text-stone-600 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="contact_phone" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Nomor Telepon
            </label>
            <input
              type="tel"
              id="contact_phone"
              name="contact_phone"
              value={formData.contact_phone || ''}
              onChange={handleChange}
              placeholder="0812..."
              className="bg-transparent border-t-0 border-x-0 border-b border-border/40 dark:border-border px-0 py-3 text-lg focus:ring-0 focus:border-primary placeholder:text-stone-400 dark:placeholder:text-stone-600 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="contact_email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              id="contact_email"
              name="contact_email"
              value={formData.contact_email || ''}
              onChange={handleChange}
              placeholder="kontak@nusantara.com"
              className="bg-transparent border-t-0 border-x-0 border-b border-border/40 dark:border-border px-0 py-3 text-lg focus:ring-0 focus:border-primary placeholder:text-stone-400 dark:placeholder:text-stone-600 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Form Actions */}
      <div className="pt-12 flex flex-col md:flex-row gap-4 items-center justify-end border-t border-muted dark:border-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="w-full md:w-auto px-10 py-4 text-muted-foreground font-bold hover:text-foreground transition-colors disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full md:w-auto bg-primary text-primary-foreground px-12 py-4 rounded-xl font-bold shadow-[0_8px_24px_rgba(158,60,36,0.15)] hover:shadow-[0_12px_32px_rgba(158,60,36,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
        >
          {isLoading ? 'Menyimpan...' : initialData ? 'Update Event' : 'Buat Event'}
        </button>
      </div>
    </form>
  );
}
