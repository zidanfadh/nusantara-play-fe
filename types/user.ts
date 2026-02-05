export interface UserProfile {
    id: string;
    supabase_user_id: string;
    email: string;
    full_name: string;
    role: string;
    status: string;
    phone: string | null;
    avatar_url: string | null;
    bio: string | null;
    daerah_id: string | number | null; // Assuming ID could be number or string based on null value in example
    institution: string | null;
    expertise: string[] | string | null; // Can be array or string based on API response
    last_login_at: string;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
}
