'use client';

import { useEffect, useState } from 'react';
import { getChildrenDaerah } from '@/lib/api/daerah';
import type { Daerah } from '@/types/daerah';

interface KabupatenKotaSelectProps {
  provinceId: string | null;
  value?: string;
  onChange: (daerahId: string, daerah: Daerah | null) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function KabupatenKotaSelect({
  provinceId,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  placeholder = 'Pilih Kabupaten/Kota',
  className = '',
}: KabupatenKotaSelectProps) {
  const [daerahList, setDaerahList] = useState<Daerah[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Reset when province changes
    setDaerahList([]);
    setLoadError(null);

    if (!provinceId) {
      return;
    }

    const fetchDaerah = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        // Load all kabupaten/kota with high limit to avoid pagination
        const response = await getChildrenDaerah({
          id: provinceId,
          page: 1,
          limit: 100,
        });
        setDaerahList(response.data);
      } catch (err) {
        setLoadError('Gagal memuat data kabupaten/kota');
        console.error('Error loading kabupaten/kota:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDaerah();
  }, [provinceId]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedDaerah = daerahList.find((d) => d.id === selectedId) || null;
    onChange(selectedId, selectedDaerah);
  };

  const isDisabled = disabled || isLoading || !provinceId;

  return (
    <div>
      <label htmlFor="kabupaten-kota" className="text-[10px] font-bold uppercase tracking-widest text-warm-label block mb-2">
        Kabupaten / Kota {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id="kabupaten-kota"
        value={value || ''}
        onChange={handleChange}
        disabled={isDisabled}
        className={`w-full bg-surface-container-highest dark:bg-warm-field border-0 border-b-2 focus:outline-none px-4 py-3 rounded-t-lg transition-all appearance-none text-foreground dark:text-foreground disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-red-500' : 'border-outline-variant/50 dark:border-white/10 focus:border-primary'
        } ${className}`}
        required={required}
      >
        <option value="">
          {!provinceId
            ? 'Pilih provinsi terlebih dahulu'
            : isLoading
              ? 'Memuat...'
              : loadError
                ? loadError
                : placeholder}
        </option>
        {daerahList.map((daerah) => (
          <option key={daerah.id} value={daerah.id}>
            {daerah.nama}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {loadError && !error && (
        <p className="mt-1 text-sm text-red-600">{loadError}</p>
      )}
    </div>
  );
}
