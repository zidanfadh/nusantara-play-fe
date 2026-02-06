import { apiClient } from './client';
import type {
  HealthCheckResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  PasswordValidationResult,
} from '@/types/auth';

/**
 * Health check endpoint
 * Public endpoint - no authentication required
 * 
 * @returns Promise with health check status
 */
export async function checkAuthHealth(): Promise<HealthCheckResponse> {
  return await apiClient.get<HealthCheckResponse>('/auth/health');
}

/**
 * Change password for authenticated user
 * Requires JWT token authentication
 * 
 * @param data - Current password, new password, and confirmation
 * @returns Promise with success message
 * @throws Error if validation fails or password is incorrect
 */
export async function changePassword(
  data: ChangePasswordRequest
): Promise<ChangePasswordResponse> {
  // Validate before sending to API
  const validation = validatePassword(data.newPassword);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }

  if (data.newPassword !== data.confirmPassword) {
    throw new Error('Password baru dan konfirmasi tidak cocok');
  }

  if (data.currentPassword === data.newPassword) {
    throw new Error('Password baru harus berbeda dari password saat ini');
  }

  return await apiClient.post<ChangePasswordResponse>(
    '/auth/change-password',
    data
  );
}

/**
 * Validate password requirements
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * 
 * @param password - Password to validate
 * @returns Validation result with errors if any
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password minimal 8 karakter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password harus mengandung minimal 1 huruf kapital');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password harus mengandung minimal 1 huruf kecil');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password harus mengandung minimal 1 angka');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get password strength indicator
 * 
 * @param password - Password to check
 * @returns Strength level: 'weak', 'medium', 'strong'
 */
export function getPasswordStrength(
  password: string
): 'weak' | 'medium' | 'strong' {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++; // Special characters

  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
}
