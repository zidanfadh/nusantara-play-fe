import { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export interface AuthFormData {
  email: string;
  password: string;
}

export interface SignUpFormData extends AuthFormData {
  confirmPassword: string;
}

// Change Password Types
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

// Health Check Types
export interface HealthCheckResponse {
  status: string;
  message: string;
  timestamp: string;
}

// Password Validation
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

// Auth Error Response
export interface AuthErrorResponse {
  statusCode: number;
  message: string;
  error: string;
}
