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
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleAddExpertise = () => {
        if (expertiseInput.trim() && !formData.expertise?.includes(expertiseInput.trim())) {
            const newExpertise = [...(formData.expertise || []), expertiseInput.trim()];
            handleChange('expertise', newExpertise);
            setExpertiseInput('');
        }
    };

    const handleRemoveExpertise = (index: number) => {
        const newExpertise = formData.expertise?.filter((_, i) => i !== index) || [];
        handleChange('expertise', newExpertise);
    };

    const handleProvinceChange = (provinceId: string, province: Daerah | null) => {
        // Don't set province as daerah_id, wait for kabupaten/kota
    };

    const handleDaerahChange = (daerahId: string, daerah: Daerah | null) => {
        handleChange('daerah_id', daerahId);
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.full_name?.trim()) {
            newErrors.full_name = 'Nama lengkap wajib diisi';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrors({});
        setSuccessMessage('');

        try {
            // Clean up data before sending
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

            if (onSuccess) {
                setTimeout(() => {
                    onSuccess(updatedUser);
                }, 1500);
            }
        } catch (error: any) {
            if (error.response?.data?.message) {
                setErrors({ general: error.response.data.message });
            } else {
                setErrors({ general: error.message || 'Gagal memperbarui profil' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {errors.general}
                </div>
            )}

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    {successMessage}
                </div>
            )}

            {/* Full Name */}
            <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lengkap *
                </label>
                <input
                    type="text"
                    id="full_name"
                    value={formData.full_name || ''}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.full_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                />
                {errors.full_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
                )}
            </div>

            {/* Email (Read-only) */}
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                </label>
                <input
                    type="email"
                    id="email"
                    value={currentUser.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">Email tidak dapat diubah</p>
            </div>

            {/* Phone */}
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor Telepon
                </label>
                <input
                    type="tel"
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+628123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
            </div>

            {/* Bio */}
            <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                </label>
                <textarea
                    id="bio"
                    value={formData.bio || ''}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    rows={4}
                    placeholder="Ceritakan sedikit tentang Anda..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
            </div>

            {/* Daerah Selector */}
            <DaerahSelector
                kabupatenKotaValue={formData.daerah_id}
                onProvinceChange={handleProvinceChange}
                onKabupatenKotaChange={handleDaerahChange}
                disabled={isLoading}
            />

            {/* Institution */}
            <div>
                <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-1">
                    Institusi
                </label>
                <input
                    type="text"
                    id="institution"
                    value={formData.institution || ''}
                    onChange={(e) => handleChange('institution', e.target.value)}
                    placeholder="Nama institusi"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
            </div>

            {/* Expertise */}
            <div>
                <label htmlFor="expertise" className="block text-sm font-medium text-gray-700 mb-1">
                    Keahlian
                </label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        id="expertise"
                        value={expertiseInput}
                        onChange={(e) => setExpertiseInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExpertise())}
                        placeholder="Tambah keahlian"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        onClick={handleAddExpertise}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    >
                        Tambah
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {formData.expertise?.map((exp, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                            {exp}
                            <button
                                type="button"
                                onClick={() => handleRemoveExpertise(index)}
                                className="hover:text-blue-900"
                                disabled={isLoading}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>

                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-6 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Batal
                    </button>
                )}
            </div>
        </form>
    );
}
