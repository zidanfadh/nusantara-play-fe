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
        <div className="space-y-5">
            <div className="bg-card rounded-xl shadow-sm p-5 border-l-4 border-[#C04A21]">
                <h1 className="text-xl font-bold text-foreground">Manajemen User</h1>
                <p className="mt-1 text-muted-foreground text-xs">
                    Kelola semua user di sistem
                </p>
            </div>

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
