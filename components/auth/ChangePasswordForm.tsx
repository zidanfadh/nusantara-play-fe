'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { changePassword, validatePassword, getPasswordStrength } from '@/lib/api/auth';
import type { ChangePasswordRequest } from '@/types/auth';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ChangePasswordForm({ onSuccess, onCancel }: ChangePasswordFormProps) {
  const [formData, setFormData] = useState<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleChange = (field: keyof ChangePasswordRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (successMessage) setSuccessMessage('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Password saat ini wajib diisi';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Password baru wajib diisi';
    } else {
      const validation = validatePassword(formData.newPassword);
      if (!validation.isValid) {
        newErrors.newPassword = validation.errors[0];
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Konfirmasi password wajib diisi';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Password tidak cocok';
    }

    if (
      formData.currentPassword &&
      formData.newPassword &&
      formData.currentPassword === formData.newPassword
    ) {
      newErrors.newPassword = 'Password baru harus berbeda dari password saat ini';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await changePassword(formData);
      setSuccessMessage(response.message);
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      if (onSuccess) setTimeout(() => onSuccess(), 2000);
    } catch (error: any) {
      const msg = error.response?.data?.message ?? error.message ?? 'Gagal mengubah password';
      setErrors({ general: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = formData.newPassword
    ? getPasswordStrength(formData.newPassword)
    : null;

  const strengthColor = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  };
  const strengthText = { weak: 'Lemah', medium: 'Sedang', strong: 'Kuat' };
  const strengthWidth = { weak: '33%', medium: '66%', strong: '100%' };

  const inputBase =
    'w-full bg-warm-field border-0 border-b-2 focus:ring-0 px-4 py-3 text-base font-medium transition-all rounded-t outline-none';
  const inputClass = (field: string) =>
    `${inputBase} ${errors[field] ? 'border-red-500' : 'border-transparent focus:border-primary'}`;

  const labelClass =
    'block text-[0.7rem] font-bold uppercase tracking-[0.15em] text-warm-label mb-2 transition-colors group-focus-within:text-primary';

  const eyeBtn =
    'absolute right-3 top-1/2 -translate-y-1/2 text-warm-label hover:text-primary transition-colors';

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

      {/* Current Password — full width */}
      <div className="relative group">
        <label className={labelClass}>Password Saat Ini</label>
        <div className="relative">
          <input
            type={showPasswords.current ? 'text' : 'password'}
            id="currentPassword"
            value={formData.currentPassword}
            onChange={(e) => handleChange('currentPassword', e.target.value)}
            className={inputClass('currentPassword')}
            placeholder="••••••••"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
            className={eyeBtn}
          >
            {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.currentPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.currentPassword}</p>
        )}
      </div>

      {/* New Password + Confirm — 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* New Password */}
        <div className="relative group">
          <label className={labelClass}>Password Baru</label>
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              id="newPassword"
              value={formData.newPassword}
              onChange={(e) => handleChange('newPassword', e.target.value)}
              className={inputClass('newPassword')}
              placeholder="••••••••"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
              className={eyeBtn}
            >
              {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {formData.newPassword && passwordStrength && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-warm-field rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${strengthColor[passwordStrength]}`}
                  style={{ width: strengthWidth[passwordStrength] }}
                />
              </div>
              <span className="text-xs font-medium text-foreground/60">
                {strengthText[passwordStrength]}
              </span>
            </div>
          )}

          {errors.newPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.newPassword}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="relative group">
          <label className={labelClass}>Konfirmasi Password Baru</label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              className={inputClass('confirmPassword')}
              placeholder="••••••••"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
              className={eyeBtn}
            >
              {showPasswords.confirm ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row gap-4 pt-4">
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
            className="flex-1 bg-warm-btn text-warm-neutral font-bold py-4 px-8 rounded-lg hover:bg-warm-btn-hover transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
