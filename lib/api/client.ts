import { authClient } from '@/lib/auth/client';
import { getBackendApiUrl } from './base-url';

/**
 * Error thrown by `apiClient` for a non-2xx answer. `message` is the backend's message (as before Phase 29);
 * `status` and `code` (e.g. "EMAIL_NOT_VERIFIED") are extra fields for callers that need them.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Fired on `window` when the backend answers 403 EMAIL_NOT_VERIFIED (local mode shows a notice). */
export const EMAIL_NOT_VERIFIED_EVENT = 'np:email-not-verified';

/** Build-time constant (literal env read, inlined by Next), not `authClient.mode`: no import cycle at load time. */
const LOCAL = process.env.NEXT_PUBLIC_AUTH_MODE === 'local';

/**
 * Extra request options in local mode (Phase 29): cookies stay with the request (same-origin anyway) and the
 * CSRF header the cookie-based auth endpoints need. Supabase mode adds nothing (unchanged requests).
 */
function modeInit(): RequestInit {
  return LOCAL ? { credentials: 'include' } : {};
}

function modeHeaders(): Record<string, string> {
  return LOCAL ? { 'X-Requested-With': 'nusantara-play' } : {};
}

/**
 * `fetch` with the visitor's access token. After a 401 the auth client may hand out a new token (local mode:
 * one refresh); the request is then retried ONCE. Supabase mode never retries (as before). Used by
 * `apiClient` and by the raw multipart uploads (they must not set Content-Type).
 */
export async function authorizedFetch(
  url: string,
  init: RequestInit = {},
  baseHeaders: Record<string, string> = {},
): Promise<Response> {
  const send = (token: string | null) => {
    const headers: Record<string, string> = { ...baseHeaders, ...modeHeaders() };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, {
      ...modeInit(),
      ...init,
      headers: {
        ...headers,
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  };

  const token = await authClient.getAccessToken();
  const response = await send(token);
  if (response.status !== 401) return response;
  const retryToken = await authClient.handleUnauthorized();
  return retryToken ? send(retryToken) : response;
}

/** Reads the error body and throws `ApiError` (message as before Phase 29). */
export async function throwApiError(response: Response, fallback: string): Promise<never> {
  const error = await response.json().catch(() => ({ message: fallback }));
  const code = typeof error?.code === 'string' ? error.code : undefined;
  if (LOCAL && response.status === 403 && code === 'EMAIL_NOT_VERIFIED' && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EMAIL_NOT_VERIFIED_EVENT));
  }
  throw new ApiError(error.message || `HTTP error! status: ${response.status}`, response.status, code);
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await authorizedFetch(`${getBackendApiUrl()}${endpoint}`, options, {
    'Content-Type': 'application/json',
  });

  if (!response.ok) {
    await throwApiError(response, 'Request failed');
  }

  return response.json();
}

export const apiClient = {
  get<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'GET' });
  },

  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  put<T>(endpoint: string, data?: unknown): Promise<T> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  delete<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};
