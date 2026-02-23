'use client';

import Link from 'next/link';
import { formatUserRole, formatUserStatus, getStatusColor, getRoleColor } from '@/lib/api/users';
import type { UserProfile } from '@/types/user';

interface UserProfileCardProps {
    user: UserProfile;
    onEdit?: () => void;
    isCurrentUser?: boolean;
}

export function UserProfileCard({ user, onEdit, isCurrentUser = false }: UserProfileCardProps) {
    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header with Avatar */}
            <div className="bg-primary px-6 py-8">
                <div className="flex items-center gap-6">
                    <div className="flex-shrink-0">
                        {user.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="w-24 h-24 rounded-full border-4 border-white object-cover text-white"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full border-4 border-white bg-white flex items-center justify-center">
                                <span className="text-4xl font-bold text-blue-600">
                                    {user.full_name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white">{user.full_name}</h2>
                        <p className="text-white mt-1">{user.email}</p>
                        <div className="flex gap-2 mt-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)} bg-opacity-90`}>
                                {formatUserRole(user.role)}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(user.status)} bg-opacity-90`}>
                                {formatUserStatus(user.status)}
                            </span>
                        </div>
                    </div>
                    {isCurrentUser && (
                        <div className="flex flex-col sm:flex-row gap-2">
                            {onEdit && (
                                <button
                                    onClick={onEdit}
                                    className="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 font-medium text-sm shadow-sm"
                                >
                                    Edit Profil
                                </button>
                            )}
                            <Link
                                href="/change-password"
                                className="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 font-medium text-sm shadow-sm"
                            >
                                Ganti Password
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Body with Details */}
            <div className="px-6 py-6 space-y-6">
                {/* Bio */}
                {user.bio && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                            Bio
                        </h3>
                        <p className="text-gray-900">{user.bio}</p>
                    </div>
                )}

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                            Kontak
                        </h3>
                        <div className="space-y-2">
                            <div className="flex items-center text-gray-900">
                                <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {user.email}
                            </div>
                            {user.phone && (
                                <div className="flex items-center text-gray-900">
                                    <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    {user.phone}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                            Institusi
                        </h3>
                        <p className="text-gray-900">{user.institution || '-'}</p>
                    </div>
                </div>

                {/* Expertise */}
                {user.expertise && user.expertise.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                            Keahlian
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {user.expertise.map((exp, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                                >
                                    {exp}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Last Login */}
                <div className="border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Terakhir login:</span>
                            <span className="ml-2 text-gray-900">{formatDate(user.last_login_at)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Bergabung sejak:</span>
                            <span className="ml-2 text-gray-900">{formatDate(user.created_at)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
