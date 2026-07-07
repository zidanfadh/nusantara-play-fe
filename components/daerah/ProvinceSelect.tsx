'use client';

import { useEffect, useState, useRef } from 'react';
import { getAllProvinces } from '@/lib/api/daerah';
import type { Daerah } from '@/types/daerah';

interface ProvinceSelectProps {
  value?: string;
  onChange: (provinceId: string, province: Daerah | null) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  filterKodes?: string[];
}

export function ProvinceSelect({
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  placeholder = 'Pilih Provinsi',
  className = '',
  filterKodes,
}: ProvinceSelectProps) {
  const [provinces, setProvinces] = useState<Daerah[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    const fetchProvinces = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        // Load all provinces with high limit to avoid pagination
        const response = await getAllProvinces({ page: 1, limit: 50 });
        setProvinces(response.data);
      } catch (err) {
        setLoadError('Gagal memuat data provinsi');
        console.error('Error loading provinces:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProvinces();
  }, []);

  // Filter provinces by kodes if provided
  const displayedProvinces = filterKodes
    ? provinces.filter((p) => filterKodes.includes(p.kode))
    : provinces;

  // Auto-select when filtered to a single province
  useEffect(() => {
    if (autoSelectedRef.current) return;
    if (!filterKodes || filterKodes.length === 0) return;
    if (isLoading || provinces.length === 0) return;

    const matches = provinces.filter((p) => filterKodes.includes(p.kode));
    if (matches.length === 1) {
      autoSelectedRef.current = true;
      onChange(matches[0].id, matches[0]);
    }
  }, [provinces, filterKodes, isLoading, onChange]);

  // Reset auto-select when filterKodes changes
  useEffect(() => {
    autoSelectedRef.current = false;
  }, [filterKodes]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedProvince = provinces.find((p) => p.id === selectedId) || null;
    onChange(selectedId, selectedProvince);
  };

  return (
    <div>
      <label htmlFor="province" className="text-[10px] font-bold uppercase tracking-widest text-warm-label block mb-2">
        Provinsi {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id="province"
        value={value || ''}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className={`w-full bg-surface-container-highest dark:bg-warm-field border-0 border-b-2 focus:outline-none px-4 py-3 rounded-t-lg transition-all appearance-none text-foreground dark:text-foreground disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-red-500' : 'border-outline-variant/50 dark:border-white/10 focus:border-primary'
        } ${className}`}
        required={required}
      >
        <option value="">
          {isLoading ? 'Memuat...' : loadError || placeholder}
        </option>
        {displayedProvinces.map((province) => (
          <option key={province.id} value={province.id}>
            {province.nama}
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
