'use client';

import { useEffect, useState } from 'react';
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
}

export function ProvinceSelect({
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  placeholder = 'Pilih Provinsi',
  className = '',
}: ProvinceSelectProps) {
  const [provinces, setProvinces] = useState<Daerah[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedProvince = provinces.find((p) => p.id === selectedId) || null;
    onChange(selectedId, selectedProvince);
  };

  return (
    <div>
      <label htmlFor="province" className="block text-sm font-medium  mb-1">
        Provinsi {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id="province"
        value={value || ''}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className={`w-full px-3 py-2 bg-gray-50 dark:bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-700'
          } ${disabled || isLoading ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
        required={required}
      >
        <option value="">
          {isLoading ? 'Memuat...' : loadError || placeholder}
        </option>
        {provinces.map((province) => (
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
