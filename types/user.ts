// User Role Enum
export type UserRole = 'admin_kpoti' | 'kurator_daerah' | 'pakar' | 'publik';

// User Status Enum
export type UserStatus = 'active' | 'inactive' | 'suspended';

// Main User/UserProfile Entity
export interface UserProfile {
    id: string;
    supabase_user_id: string;
    email: string;
    full_name: string;
    role: UserRole;
    status: UserStatus;
    phone: string | null;
    avatar_url: string | null;
    bio: string | null;
    daerah_id: string | null;
    institution: string | null;
    expertise: string[] | null;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
}

// For backward compatibility
export type User = UserProfile;

// Update User Profile DTO
export interface UpdateUserProfileDto {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    bio?: string;
    daerah_id?: string;
    institution?: string;
    expertise?: string[];
}

// Update Role DTO
export interface UpdateRoleDto {
    role: UserRole;
    daerah_id?: string;
}

// Admin Create User DTO
export interface AdminCreateUserDto {
    email: string;
    password: string;
    full_name: string;
    role?: UserRole;
    status?: UserStatus;
    daerah_id?: string;
    phone?: string;
    institution?: string;
    send_email?: boolean;
}

// Update Status DTO
export interface UpdateStatusDto {
    status: UserStatus;
}

// Pagination metadata (reusing structure)
export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

// Users List Response
export interface UsersListResponse {
    data: UserProfile[];
    pagination: PaginationMeta;
}

// User Filters
export interface UserFilters {
    role?: UserRole;
    status?: UserStatus;
    daerah_id?: string;
    page?: number;
    limit?: number;
}

// User Statistics
export interface UserStats {
    total: number;
}
