'use client';

import { useState } from 'react';
import { ProvinceSelect } from './ProvinceSelect';
import { KabupatenKotaSelect } from './KabupatenKotaSelect';
import type { Daerah } from '@/types/daerah';

interface DaerahSelectorProps {
  provinceValue?: string;
  kabupatenKotaValue?: string;
  onProvinceChange: (provinceId: string, province: Daerah | null) => void;
  onKabupatenKotaChange: (daerahId: string, daerah: Daerah | null) => void;
  provinceError?: string;
  kabupatenKotaError?: string;
  disabled?: boolean;
  provinceDisabled?: boolean;
  required?: boolean;
  showKabupatenKota?: boolean;
}

/**
 * Combined component for selecting province and kabupaten/kota
 * Handles the hierarchical relationship automatically
 */
export function DaerahSelector({
  provinceValue,
  kabupatenKotaValue,
  onProvinceChange,
  onKabupatenKotaChange,
  provinceError,
  kabupatenKotaError,
  disabled = false,
  provinceDisabled = false,
  required = false,
  showKabupatenKota = true,
}: DaerahSelectorProps) {
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(
    provinceValue || null
  );

  const handleProvinceChange = (provinceId: string, province: Daerah | null) => {
    setSelectedProvinceId(provinceId || null);
    onProvinceChange(provinceId, province);
    
    // Reset kabupaten/kota when province changes
    if (showKabupatenKota) {
      onKabupatenKotaChange('', null);
    }
  };

  return (
    <div className="space-y-4">
      <ProvinceSelect
        value={provinceValue}
        onChange={handleProvinceChange}
        error={provinceError}
        disabled={disabled || provinceDisabled}
        required={required}
      />

      {showKabupatenKota && (
        <KabupatenKotaSelect
          provinceId={selectedProvinceId}
          value={kabupatenKotaValue}
          onChange={onKabupatenKotaChange}
          error={kabupatenKotaError}
          disabled={disabled}
          required={required}
        />
      )}
    </div>
  );
}
