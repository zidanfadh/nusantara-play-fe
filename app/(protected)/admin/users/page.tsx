'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUsers } from '@/hooks/useUsers';
import {
    createUserByAdmin,
    getUserStats,
    updateUserRole,
    updateUserStatus,
} from '@/lib/api/users';
import { UsersTable } from '@/components/users/UsersTable';
import { Pagination } from '@/components/audit/Pagination';
import { DaerahSelector } from '@/components/daerah/DaerahSelector';
import type { AdminCreateUserDto, UserStats, UserRole, UserStatus } from '@/types/user';

const initialCreateForm: AdminCreateUserDto = {
    email: '',
    password: '',
    full_name: '',
    role: 'publik',
    status: 'active',
    phone: '',
    institution: '',
    daerah_id: '',
    send_email: false,
};

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export default function UsersManagementPage() {
    const router = useRouter();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
    const [selectedStatus, setSelectedStatus] = useState<UserStatus | ''>('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState<AdminCreateUserDto>(initialCreateForm);
    const [createProvinceId, setCreateProvinceId] = useState('');
    const [createError, setCreateError] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const {
        data,
        isLoading,
        error,
        updateFilters,
        changePage,
        fetchData,
        refresh,
    } = useUsers({
        page: 1,
        limit: 20,
    });

    useEffect(() => {
        fetchData();

        // Fetch stats
        getUserStats()
            .then(setStats)
            .catch((err) => console.error('Error loading stats:', err));
    }, [fetchData]);

    const handleFilterChange = () => {
        updateFilters({
            role: selectedRole || undefined,
            status: selectedStatus || undefined,
            page: 1,
            limit: 20,
        });
    };

    const handleReset = () => {
        setSelectedRole('');
        setSelectedStatus('');
        updateFilters({ page: 1, limit: 20 });
    };

    const refreshStats = () => {
        getUserStats()
            .then(setStats)
            .catch((err) => console.error('Error loading stats:', err));
    };

    const handleCreateFieldChange = (
        field: keyof AdminCreateUserDto,
        value: string | boolean
    ) => {
        setCreateForm((prev) => ({ ...prev, [field]: value }));
        setCreateError('');
    };

    const handleCreateRoleChange = (role: UserRole) => {
        setCreateForm((prev) => ({
            ...prev,
            role,
            daerah_id: role === 'kurator_daerah' ? prev.daerah_id : '',
        }));
        if (role !== 'kurator_daerah') {
            setCreateProvinceId('');
        }
        setCreateError('');
    };

    const handleCreateProvinceChange = (provinceId: string) => {
        setCreateProvinceId(provinceId);
        setCreateForm((prev) => ({ ...prev, daerah_id: '' }));
        setCreateError('');
    };

    const handleCreateDaerahChange = (daerahId: string) => {
        setCreateForm((prev) => ({ ...prev, daerah_id: daerahId }));
        setCreateError('');
    };

    const handleCreateSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (createForm.role === 'kurator_daerah' && !createForm.daerah_id) {
            setCreateError('Wilayah wajib dipilih untuk Kurator Daerah');
            return;
        }

        setIsCreating(true);
        setCreateError('');

        try {
            const payload: AdminCreateUserDto = {
                email: createForm.email,
                password: createForm.password,
                full_name: createForm.full_name,
                role: createForm.role,
                status: createForm.status,
                send_email: createForm.send_email,
            };

            if (createForm.phone) payload.phone = createForm.phone;
            if (createForm.institution) payload.institution = createForm.institution;
            if (createForm.daerah_id) payload.daerah_id = createForm.daerah_id;

            await createUserByAdmin(payload);
            setCreateForm(initialCreateForm);
            setCreateProvinceId('');
            setShowCreateForm(false);
            refresh();
            refreshStats();
            alert('User berhasil dibuat!');
        } catch (error: unknown) {
            setCreateError(getErrorMessage(error, 'Gagal membuat user'));
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateRole = async (
        userId: string,
        role: UserRole,
        daerahId?: string
    ) => {
        try {
            await updateUserRole(userId, { role, daerah_id: daerahId });
            refresh();
            alert('Role berhasil diubah!');
        } catch (error: unknown) {
            alert(`Gagal mengubah role: ${getErrorMessage(error, 'Unknown error')}`);
        }
    };

    const handleUpdateStatus = async (userId: string, status: UserStatus) => {
        try {
            await updateUserStatus(userId, { status });
            refresh();
            alert('Status berhasil diubah!');
        } catch (error: unknown) {
            alert(`Gagal mengubah status: ${getErrorMessage(error, 'Unknown error')}`);
        }
    };

    const handleViewDetails = (userId: string) => {
        router.push(`/users/${userId}`);
    };

    return (
        <div className="space-y-5">
            <div className="bg-card rounded-xl shadow-sm p-5 border-l-4 border-[#C04A21]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Manajemen User</h1>
                        <p className="mt-1 text-muted-foreground text-xs">
                            Kelola semua user di sistem
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCreateForm((prev) => !prev)}
                        className="bg-[#1A5F7A] text-white py-2 px-4 rounded-lg text-sm hover:bg-[#237A9A] transition-colors"
                    >
                        {showCreateForm ? 'Tutup Form' : 'Tambah User'}
                    </button>
                </div>
            </div>

            {showCreateForm && (
                <form onSubmit={handleCreateSubmit} className="bg-card p-4 rounded-lg shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-foreground">Tambah User</h3>

                    {createError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {createError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Nama Lengkap
                            </label>
                            <input
                                type="text"
                                required
                                value={createForm.full_name}
                                onChange={(e) => handleCreateFieldChange('full_name', e.target.value)}
                                className="w-full px-3 py-2 text-foreground/80 text-sm border border-border rounded-md bg-input focus:outline-none focus:ring-2 focus:ring-[#1A5F7A]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                value={createForm.email}
                                onChange={(e) => handleCreateFieldChange('email', e.target.value)}
                                className="w-full px-3 py-2 text-foreground/80 text-sm border border-border rounded-md bg-input focus:outline-none focus:ring-2 focus:ring-[#1A5F7A]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={createForm.password}
                                onChange={(e) => handleCreateFieldChange('password', e.target.value)}
                                className="w-full px-3 py-2 text-foreground/80 text-sm border border-border rounded-md bg-input focus:outline-none focus:ring-2 focus:ring-[#1A5F7A]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Role
                            </label>
                            <select
                                value={createForm.role}
                                onChange={(e) => handleCreateRoleChange(e.target.value as UserRole)}
                                className="w-full px-3 py-2 text-foreground/80 text-sm border border-border rounded-md bg-input focus:outline-none focus:ring-2 focus:ring-[#1A5F7A]"
                            >
                                <option value="publik">Publik</option>
                                <option value="pakar">Pakar</option>
                                <option value="kurator_daerah">Kurator Daerah</option>
                                <option value="admin_kpoti">Admin KPOTI</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Status
                            </label>
                            <select
                                value={createForm.status}
                                onChange={(e) => handleCreateFieldChange('status', e.target.value as UserStatus)}
                                className="w-full px-3 py-2 text-foreground/80 text-sm border border-border rounded-md bg-input focus:outline-none focus:ring-2 focus:ring-[#1A5F7A]"
                            >
                                <option value="active">Aktif</option>
                                <option value="inactive">Tidak Aktif</option>
                                <option value="suspended">Ditangguhkan</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Nomor Telepon
                            </label>
                            <input
                                type="tel"
                                value={createForm.phone}
                                onChange={(e) => handleCreateFieldChange('phone', e.target.value)}
                                className="w-full px-3 py-2 text-foreground/80 text-sm border border-border rounded-md bg-input focus:outline-none focus:ring-2 focus:ring-[#1A5F7A]"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Institusi
                            </label>
                            <input
                                type="text"
                                value={createForm.institution}
                                onChange={(e) => handleCreateFieldChange('institution', e.target.value)}
                                className="w-full px-3 py-2 text-foreground/80 text-sm border border-border rounded-md bg-input focus:outline-none focus:ring-2 focus:ring-[#1A5F7A]"
                            />
                        </div>
                    </div>

                    {createForm.role === 'kurator_daerah' && (
                        <div className="max-w-xl">
                            <DaerahSelector
                                provinceValue={createProvinceId}
                                kabupatenKotaValue={createForm.daerah_id}
                                onProvinceChange={handleCreateProvinceChange}
                                onKabupatenKotaChange={(daerahId) => handleCreateDaerahChange(daerahId)}
                                required
                            />
                        </div>
                    )}

                    <label className="flex items-center gap-2 text-sm text-foreground/80">
                        <input
                            type="checkbox"
                            checked={!!createForm.send_email}
                            onChange={(e) => handleCreateFieldChange('send_email', e.target.checked)}
                            className="h-4 w-4 rounded border-border"
                        />
                        Kirim email berisi email dan password
                    </label>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowCreateForm(false);
                                setCreateForm(initialCreateForm);
                                setCreateProvinceId('');
                                setCreateError('');
                            }}
                            disabled={isCreating}
                            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80 disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="bg-[#1A5F7A] text-white py-2 px-4 rounded-lg text-sm hover:bg-[#237A9A] disabled:opacity-50 transition-colors"
                        >
                            {isCreating ? 'Membuat...' : 'Buat User'}
                        </button>
                    </div>
                </form>
            )}

            {/* Statistics Card */}
            {stats && (
                <div className="bg-card rounded-lg shadow-sm p-4">
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold tracking-wide">Total User</p>
                    <p className="text-2xl font-bold text-[#1A5F7A]">{stats.total}</p>
                </div>
            )}

            {/* Filters */}
            <div className="bg-card p-4 rounded-lg shadow-sm">
                <h3 className="text-base font-bold mb-3 text-foreground">Filter</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="role" className="block text-xs font-medium text-muted-foreground mb-1">
                            Role
                        </label>
                        <select
                            id="role"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as UserRole | '')}
                            className="w-full px-3 py-2 text-foreground/80 text-sm border border-border rounded-md bg-input focus:outline-none focus:ring-2 focus:ring-[#1A5F7A]"
                        >
                            <option value="">Semua Role</option>
                            <option value="publik">Publik</option>
                            <option value="pakar">Pakar</option>
                            <option value="kurator_daerah">Kurator Daerah</option>
                            <option value="admin_kpoti">Admin KPOTI</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-xs font-medium text-muted-foreground mb-1">
                            Status
                        </label>
                        <select
                            id="status"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value as UserStatus | '')}
                            className="w-full px-3 text-foreground/80 py-2 text-sm border border-border rounded-md bg-input focus:outline-none focus:ring-2 focus:ring-[#1A5F7A]"
                        >
                            <option value="">Semua Status</option>
                            <option value="active">Aktif</option>
                            <option value="inactive">Tidak Aktif</option>
                            <option value="suspended">Ditangguhkan</option>
                        </select>
                    </div>

                    <div className="flex items-end gap-2">
                        <button
                            onClick={handleFilterChange}
                            className="flex-1 bg-[#1A5F7A] text-white py-2 px-4 rounded-lg text-sm hover:bg-[#237A9A] focus:outline-none focus:ring-2 focus:ring-[#1A5F7A] transition-colors"
                        >
                            Terapkan Filter
                        </button>
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80 focus:outline-none transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    <p className="font-medium text-sm">Error:</p>
                    <p className="text-xs">{error.message}</p>
                </div>
            )}

            {/* Users Table */}
            <UsersTable
                users={data?.data || []}
                isLoading={isLoading}
                onUpdateRole={handleUpdateRole}
                onUpdateStatus={handleUpdateStatus}
                onViewDetails={handleViewDetails}
            />

            {/* Pagination */}
            {data?.pagination && (
                <div>
                    <Pagination pagination={data.pagination} onPageChange={changePage} />
                </div>
            )}
        </div>
    );
}
