'use client';

import { useState } from 'react';
import { updateCurrentUser } from '@/lib/api/users';
import { DaerahSelector } from '@/components/daerah/DaerahSelector';
import type { UpdateUserProfileDto, UserProfile } from '@/types/user';
import type { Daerah } from '@/types/daerah';

interface EditProfileFormProps {
  currentUser: UserProfile;
  onSuccess?: (updatedUser: UserProfile) => void;
  onCancel?: () => void;
}

export function EditProfileForm({ currentUser, onSuccess, onCancel }: EditProfileFormProps) {
  const [formData, setFormData] = useState<UpdateUserProfileDto>({
    full_name: currentUser.full_name,
    phone: currentUser.phone || '',
    avatar_url: currentUser.avatar_url || '',
    bio: currentUser.bio || '',
    daerah_id: currentUser.daerah_id || '',
    institution: currentUser.institution || '',
    expertise: currentUser.expertise || [],
  });

  const [expertiseInput, setExpertiseInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (field: keyof UpdateUserProfileDto, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAddExpertise = () => {
    const trimmed = expertiseInput.trim();
    if (trimmed && !formData.expertise?.includes(trimmed)) {
      handleChange('expertise', [...(formData.expertise || []), trimmed]);
      setExpertiseInput('');
    }
  };

  const handleRemoveExpertise = (index: number) => {
    handleChange('expertise', formData.expertise?.filter((_, i) => i !== index) || []);
  };

  const handleDaerahChange = (daerahId: string) => {
    handleChange('daerah_id', daerahId);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name?.trim()) newErrors.full_name = 'Nama lengkap wajib diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const dataToSubmit: UpdateUserProfileDto = {};
      if (formData.full_name) dataToSubmit.full_name = formData.full_name;
      if (formData.phone) dataToSubmit.phone = formData.phone;
      if (formData.avatar_url) dataToSubmit.avatar_url = formData.avatar_url;
      if (formData.bio) dataToSubmit.bio = formData.bio;
      if (formData.daerah_id) dataToSubmit.daerah_id = formData.daerah_id;
      if (formData.institution) dataToSubmit.institution = formData.institution;
      if (formData.expertise && formData.expertise.length > 0) {
        dataToSubmit.expertise = formData.expertise;
      }

      const updatedUser = await updateCurrentUser(dataToSubmit);
      setSuccessMessage('Profil berhasil diperbarui!');
      if (onSuccess) setTimeout(() => onSuccess(updatedUser), 1500);
    } catch (error: any) {
      const msg = error.response?.data?.message ?? error.message ?? 'Gagal memperbarui profil';
      setErrors({ general: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const labelClass = 'block text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-2';
  const inputClass = (field?: string) =>
    `w-full bg-warm-field border-0 border-b-2 ${
      field && errors[field] ? 'border-red-500' : 'border-transparent focus:border-primary'
    } focus:ring-0 px-4 py-3 text-base font-medium transition-all rounded-t outline-none`;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {errors.general}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {successMessage}
        </div>
      )}

      {/* Name + Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative group">
          <label className={labelClass}>Nama Lengkap</label>
          <input
            type="text"
            value={formData.full_name || ''}
            onChange={(e) => handleChange('full_name', e.target.value)}
            className={inputClass('full_name')}
            placeholder="Nama lengkap Anda"
            disabled={isLoading}
          />
          {errors.full_name && (
            <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>
          )}
        </div>

        <div className="relative group">
          <label className={labelClass}>Nomor Telepon</label>
          <input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={inputClass()}
            placeholder="+62 ..."
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Email — locked */}
      <div className="relative opacity-60">
        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/40 mb-2">
          Email (Terkunci)
        </label>
        <div className="w-full bg-warm-field/60 border-b border-border/20 px-4 py-3 text-base font-medium text-foreground/50 rounded-t cursor-not-allowed">
          {currentUser.email}
        </div>
      </div>

      {/* Bio */}
      <div className="relative group">
        <label className={labelClass}>Bio</label>
        <textarea
          value={formData.bio || ''}
          onChange={(e) => handleChange('bio', e.target.value)}
          rows={4}
          placeholder="Ceritakan sedikit tentang Anda..."
          className={`${inputClass()} resize-none`}
          disabled={isLoading}
        />
      </div>

      {/* Region */}
      <div className="relative group">
        <label className={labelClass}>Wilayah</label>
        <DaerahSelector
          kabupatenKotaValue={formData.daerah_id}
          onProvinceChange={() => {}}
          onKabupatenKotaChange={(id) => handleDaerahChange(id)}
          disabled={isLoading}
        />
      </div>

      {/* Institution */}
      <div className="relative group">
        <label className={labelClass}>Institusi</label>
        <input
          type="text"
          value={formData.institution || ''}
          onChange={(e) => handleChange('institution', e.target.value)}
          className={inputClass()}
          placeholder="Nama institusi atau organisasi"
          disabled={isLoading}
        />
      </div>

      {/* Expertise */}
      <div className="relative">
        <label className={labelClass}>Keahlian</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={expertiseInput}
            onChange={(e) => setExpertiseInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExpertise())}
            placeholder="Tambah keahlian..."
            className={`${inputClass()} flex-1`}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleAddExpertise}
            disabled={isLoading}
            className="bg-primary text-white px-6 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Tambah
          </button>
        </div>
        {formData.expertise && formData.expertise.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {formData.expertise.map((exp, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold"
              >
                {exp}
                <button
                  type="button"
                  onClick={() => handleRemoveExpertise(i)}
                  className="hover:text-primary/60 transition-colors leading-none"
                  disabled={isLoading}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border/10">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-primary text-white font-bold py-4 px-8 rounded-lg shadow-lg hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 bg-warm-btn text-[#636262] font-bold py-4 px-8 rounded-lg hover:bg-warm-btn-hover transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
