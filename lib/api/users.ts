import { apiClient } from './client';
import type {
    UserProfile,
    UpdateUserProfileDto,
    UpdateRoleDto,
    UpdateStatusDto,
    UsersListResponse,
    UserFilters,
    UserStats,
    UserRole,
    UserStatus,
} from '@/types/user';

/**
 * Get current logged-in user profile
 * Requires authentication
 * 
 * @returns Promise with current user profile
 */
export async function getCurrentUser(): Promise<UserProfile> {
    return await apiClient.get<UserProfile>('/users/me');
}

/**
 * Update current logged-in user profile
 * Requires authentication
 * 
 * @param data - Profile fields to update
 * @returns Promise with updated user profile
 */
export async function updateCurrentUser(
    data: UpdateUserProfileDto
): Promise<UserProfile> {
    return await apiClient.patch<UserProfile>('/users/me', data);
}

/**
 * Get all users with filters and pagination
 * Requires authentication - admin_kpoti only
 * 
 * @param filters - Filter by role, status, daerah_id, page, limit
 * @returns Promise with users list and pagination metadata
 */
export async function getAllUsers(
    filters?: UserFilters
): Promise<UsersListResponse> {
    const params = new URLSearchParams();

    if (filters) {
        if (filters.role) params.append('role', filters.role);
        if (filters.status) params.append('status', filters.status);
        if (filters.daerah_id) params.append('daerah_id', filters.daerah_id);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
    }

    const queryString = params.toString();
    const url = queryString ? `/users?${queryString}` : '/users';

    return await apiClient.get<UsersListResponse>(url);
}

/**
 * Get user statistics
 * Requires authentication - admin_kpoti only
 * 
 * @returns Promise with user statistics
 */
export async function getUserStats(): Promise<UserStats> {
    return await apiClient.get<UserStats>('/users/stats');
}

/**
 * Get user by ID
 * Requires authentication - admin_kpoti, kurator_daerah
 * 
 * @param id - User ID (UUID)
 * @returns Promise with user profile
 * @throws Error if user not found (404)
 */
export async function getUserById(id: string): Promise<UserProfile> {
    return await apiClient.get<UserProfile>(`/users/${id}`);
}

/**
 * Update user role
 * Requires authentication - admin_kpoti only
 * 
 * @param id - User ID (UUID)
 * @param data - New role
 * @returns Promise with updated user profile
 * @throws Error if user not found (404)
 */
export async function updateUserRole(
    id: string,
    data: UpdateRoleDto
): Promise<UserProfile> {
    return await apiClient.patch<UserProfile>(`/users/${id}/role`, data);
}

/**
 * Update user status
 * Requires authentication - admin_kpoti only
 * 
 * @param id - User ID (UUID)
 * @param data - New status
 * @returns Promise with updated user profile
 * @throws Error if user not found (404)
 */
export async function updateUserStatus(
    id: string,
    data: UpdateStatusDto
): Promise<UserProfile> {
    return await apiClient.patch<UserProfile>(`/users/${id}/status`, data);
}

/**
 * Helper function to format user role for display
 */
export function formatUserRole(role: UserRole): string {
    const roleMap: Record<UserRole, string> = {
        admin_kpoti: 'Admin KPOTI',
        kurator_daerah: 'Kurator Daerah',
        pakar: 'Pakar',
        publik: 'Publik',
    };

    return roleMap[role] || role;
}

/**
 * Helper function to format user status for display
 */
export function formatUserStatus(status: UserStatus): string {
    const statusMap: Record<UserStatus, string> = {
        active: 'Aktif',
        inactive: 'Tidak Aktif',
        suspended: 'Ditangguhkan',
    };

    return statusMap[status] || status;
}

/**
 * Helper function to get status color for badges
 */
export function getStatusColor(status: UserStatus): string {
    const colorMap: Record<UserStatus, string> = {
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-gray-100 text-gray-800',
        suspended: 'bg-red-100 text-red-800',
    };

    return colorMap[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Helper function to get role color for badges
 */
export function getRoleColor(role: UserRole): string {
    const colorMap: Record<UserRole, string> = {
        admin_kpoti: 'bg-purple-100 text-purple-800',
        kurator_daerah: 'bg-blue-100 text-blue-800',
        pakar: 'bg-orange-100 text-orange-800',
        publik: 'bg-gray-100 text-gray-800',
    };

    return colorMap[role] || 'bg-gray-100 text-gray-800';
}
