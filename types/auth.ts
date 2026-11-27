import type { AuthClient, AuthMode, AuthResult, SignUpInput } from '@/lib/auth/types';

export interface AuthState {
  /** A session exists (Phase 29: from the auth facade; the user object comes from `useCurrentUser()`). */
  signedIn: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  mode: AuthMode;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  client: AuthClient;
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
