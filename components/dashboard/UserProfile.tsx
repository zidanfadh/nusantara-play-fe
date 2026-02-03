'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { UserProfile as UserProfileType } from '@/types/user';

export default function UserProfile() {
    const [data, setData] = useState<UserProfileType | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<UserProfileType>('/users/me');
            setData(response);
        } catch (err: any) {
            console.error('Error fetching profile:', err);
            setError(err.message || 'Failed to fetch profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Backend API Test (/users/me)</h3>
                <button
                    onClick={fetchProfile}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Fetching...' : 'Test API Connection'}
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded mb-4">
                    Error: {error}
                </div>
            )}

            {data && (
                <div className="overflow-x-auto">
                    <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-semibold text-gray-600">Name:</span> {data.full_name}
                        </div>
                        <div>
                            <span className="font-semibold text-gray-600">Email:</span> {data.email}
                        </div>
                        <div>
                            <span className="font-semibold text-gray-600">Role:</span> {data.role}
                        </div>
                        <div>
                            <span className="font-semibold text-gray-600">Status:</span> {data.status}
                        </div>
                    </div>
                    <pre className="bg-gray-800 text-green-400 p-4 rounded text-xs">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            )}

            {!data && !error && !loading && (
                <p className="text-gray-500 italic">Click the button to test the connection to the backend API.</p>
            )}
        </div>
    );
}
