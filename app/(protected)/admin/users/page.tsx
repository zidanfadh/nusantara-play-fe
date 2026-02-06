'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUsers } from '@/hooks/useUsers';
import { getUserStats, updateUserRole, updateUserStatus } from '@/lib/api/users';
import { UsersTable } from '@/components/users/UsersTable';
import { Pagination } from '@/components/audit/Pagination';
import type { UserStats, UserRole, UserStatus } from '@/types/user';

export default function UsersManagementPage() {
    const router = useRouter();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
    const [selectedStatus, setSelectedStatus] = useState<UserStatus | ''>('');

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

    const handleUpdateRole = async (userId: string, role: UserRole) => {
        try {
            await updateUserRole(userId, { role });
            refresh();
            alert('Role berhasil diubah!');
        } catch (error: any) {
            alert(`Gagal mengubah role: ${error.message}`);
        }
    };

    const handleUpdateStatus = async (userId: string, status: UserStatus) => {
        try {
            await updateUserStatus(userId, { status });
            refresh();
            alert('Status berhasil diubah!');
        } catch (error: any) {
            alert(`Gagal mengubah status: ${error.message}`);
        }
    };

    const handleViewDetails = (userId: string) => {
        router.push(`/users/${userId}`);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Manajemen User</h1>
                <p className="mt-2 text-gray-600">
                    Kelola semua user di sistem
                </p>
            </div>

            {/* Statistics Card */}
            {stats && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <p className="text-sm text-gray-600 mb-1">Total User</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="text-lg font-semibold mb-3">Filter</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                            Role
                        </label>
                        <select
                            id="role"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as UserRole | '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Semua Role</option>
                            <option value="publik">Publik</option>
                            <option value="pakar">Pakar</option>
                            <option value="kurator_daerah">Kurator Daerah</option>
                            <option value="admin_kpoti">Admin KPOTI</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            id="status"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value as UserStatus | '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Terapkan Filter
                        </button>
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-medium">Error:</p>
                    <p>{error.message}</p>
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
                <div className="mt-4">
                    <Pagination pagination={data.pagination} onPageChange={changePage} />
                </div>
            )}
        </div>
    );
}
