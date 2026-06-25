'use client';

import { useState } from 'react';
import { formatUserRole, formatUserStatus, getStatusColor, getRoleColor } from '@/lib/api/users';
import { DaerahSelector } from '@/components/daerah/DaerahSelector';
import type { UserProfile, UserRole, UserStatus } from '@/types/user';

interface UsersTableProps {
    users: UserProfile[];
    isLoading?: boolean;
    onUpdateRole?: (userId: string, role: UserRole, daerahId?: string) => void;
    onUpdateStatus?: (userId: string, status: UserStatus) => void;
    onViewDetails?: (userId: string) => void;
}

export function UsersTable({
    users,
    isLoading,
    onUpdateRole,
    onUpdateStatus,
    onViewDetails,
}: UsersTableProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>({});
    const [provinceDrafts, setProvinceDrafts] = useState<Record<string, string>>({});
    const [daerahDrafts, setDaerahDrafts] = useState<Record<string, string>>({});
    const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});

    const toggleRow = (userId: string) => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(date);
    };

    const handleRoleChange = (user: UserProfile, role: UserRole) => {
        setRoleDrafts((prev) => ({ ...prev, [user.id]: role }));
        setRoleErrors((prev) => {
            const next = { ...prev };
            delete next[user.id];
            return next;
        });

        if (role !== 'kurator_daerah') {
            setProvinceDrafts((prev) => ({ ...prev, [user.id]: '' }));
            setDaerahDrafts((prev) => ({ ...prev, [user.id]: '' }));
            onUpdateRole?.(user.id, role);
        }
    };

    const handleProvinceChange = (userId: string, provinceId: string) => {
        setProvinceDrafts((prev) => ({ ...prev, [userId]: provinceId }));
        setDaerahDrafts((prev) => ({ ...prev, [userId]: '' }));
    };

    const handleDaerahChange = (userId: string, daerahId: string) => {
        setDaerahDrafts((prev) => ({ ...prev, [userId]: daerahId }));
        setRoleErrors((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
        });
    };

    const handleSaveKuratorRole = (userId: string) => {
        const daerahId = daerahDrafts[userId];

        if (!daerahId) {
            setRoleErrors((prev) => ({
                ...prev,
                [userId]: 'Wilayah wajib dipilih untuk Kurator Daerah',
            }));
            return;
        }

        onUpdateRole?.(userId, 'kurator_daerah', daerahId);
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1A5F7A] mx-auto"></div>
                <p className="mt-3 text-[#6B6B6B] text-sm">Memuat data user...</p>
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-[#6B6B6B] text-sm">Tidak ada user ditemukan.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Institusi
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Login
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <>
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                {user.avatar_url ? (
                                                    <img
                                                        className="h-10 w-10 rounded-full object-cover"
                                                        src={user.avatar_url}
                                                        alt={user.full_name}
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                                                        <span className="text-white font-medium">
                                                            {user.full_name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.full_name}
                                                </div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(
                                                user.role
                                            )}`}
                                        >
                                            {formatUserRole(user.role)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                                user.status
                                            )}`}
                                        >
                                            {formatUserStatus(user.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.institution || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(user.last_login_at)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => toggleRow(user.id)}
                                            className="text-[#1A5F7A] hover:text-[#237A9A] mr-3 text-xs font-semibold"
                                        >
                                            {expandedRows.has(user.id) ? 'Tutup' : 'Detail'}
                                        </button>
                                        {onViewDetails && (
                                            <button
                                                onClick={() => onViewDetails(user.id)}
                                                className="text-green-600 hover:text-green-700 text-xs font-semibold"
                                            >
                                                Lihat
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                {expandedRows.has(user.id) && (
                                    <tr key={`${user.id}-details`}>
                                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="font-medium text-gray-700">
                                                            User ID:
                                                        </span>
                                                        <p className="font-mono text-xs text-gray-600 mt-1">
                                                            {user.id}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">Phone:</span>
                                                        <p className="text-gray-600 mt-1">
                                                            {user.phone || '-'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">
                                                            Daerah ID:
                                                        </span>
                                                        <p className="font-mono text-xs text-gray-600 mt-1">
                                                            {user.daerah_id || '-'}
                                                        </p>
                                                    </div>
                                                    {user.bio && (
                                                        <div className="col-span-2">
                                                            <span className="font-medium text-gray-700">Bio:</span>
                                                            <p className="text-gray-600 mt-1">{user.bio}</p>
                                                        </div>
                                                    )}
                                                    {user.expertise && user.expertise.length > 0 && (
                                                        <div className="col-span-2">
                                                            <span className="font-medium text-gray-700 block mb-2">
                                                                Keahlian:
                                                            </span>
                                                            <div className="flex flex-wrap gap-2">
                                                                {user.expertise.map((exp, index) => (
                                                                    <span
                                                                        key={index}
                                                                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                                                    >
                                                                        {exp}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Admin Actions */}
                                                {(onUpdateRole || onUpdateStatus) && (
                                                    <div className="border-t pt-4 flex gap-4">
                                                        {onUpdateRole && (
                                                            <div className="min-w-[280px]">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Ubah Role:
                                                                </label>
                                                                <select
                                                                    value={roleDrafts[user.id] || user.role}
                                                                    onChange={(e) =>
                                                                        handleRoleChange(
                                                                            user,
                                                                            e.target.value as UserRole
                                                                        )
                                                                    }
                                                                    className="px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                    <option value="publik">Publik</option>
                                                                    <option value="pakar">Pakar</option>
                                                                    <option value="kurator_daerah">
                                                                        Kurator Daerah
                                                                    </option>
                                                                    <option value="admin_kpoti">
                                                                        Admin KPOTI
                                                                    </option>
                                                                </select>
                                                                {(roleDrafts[user.id] || user.role) === 'kurator_daerah' && (
                                                                    <div className="mt-3 space-y-3">
                                                                        <DaerahSelector
                                                                            provinceValue={provinceDrafts[user.id] || ''}
                                                                            kabupatenKotaValue={daerahDrafts[user.id] || ''}
                                                                            onProvinceChange={(provinceId) =>
                                                                                handleProvinceChange(user.id, provinceId)
                                                                            }
                                                                            onKabupatenKotaChange={(daerahId) =>
                                                                                handleDaerahChange(user.id, daerahId)
                                                                            }
                                                                            kabupatenKotaError={roleErrors[user.id]}
                                                                            required
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveKuratorRole(user.id)}
                                                                            className="bg-[#1A5F7A] text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-[#237A9A] transition-colors"
                                                                        >
                                                                            Simpan Role Kurator
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {onUpdateStatus && (
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Ubah Status:
                                                                </label>
                                                                <select
                                                                    value={user.status}
                                                                    onChange={(e) =>
                                                                        onUpdateStatus(
                                                                            user.id,
                                                                            e.target.value as UserStatus
                                                                        )
                                                                    }
                                                                    className="px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                    <option value="active">Aktif</option>
                                                                    <option value="inactive">Tidak Aktif</option>
                                                                    <option value="suspended">Ditangguhkan</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
