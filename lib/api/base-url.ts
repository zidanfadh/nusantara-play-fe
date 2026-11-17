/**
 * Same-origin path that next.config.ts rewrites to `${BACKEND_ORIGIN}/api`.
 * Must match BACKEND_PROXY_PATH in next.config.ts (checked by tests/config/next-config.test.ts).
 */
export const BACKEND_PROXY_PATH = '/backend-api';

type ResolveBackendApiUrlOptions = {
  nodeEnv?: string;
  envBackendApiUrl?: string;
  /** window.location.origin in the browser; undefined on the server. */
  browserOrigin?: string;
};

function normalizeUrl(url?: string): string {
  return url?.trim().replace(/\/+$/, '') || '';
}

/**
 * - development: NEXT_PUBLIC_BACKEND_API_URL (browser and server).
 * - production, browser: `${window.location.origin}/backend-api` on any domain. Same-origin, so
 *   no CORS; Vercel proxies it to the backend.
 * - production, server: NEXT_PUBLIC_BACKEND_API_URL (absolute; server-side calls have no CORS).
 */
export function resolveBackendApiUrl({
  nodeEnv,
  envBackendApiUrl,
  browserOrigin,
}: ResolveBackendApiUrlOptions = {}): string {
  const envUrl = normalizeUrl(envBackendApiUrl);

  if (nodeEnv === 'development') {
    if (!envUrl) {
      throw new Error('NEXT_PUBLIC_BACKEND_API_URL is required in development');
    }

    return envUrl;
  }

  const origin = normalizeUrl(browserOrigin);

  if (origin) {
    return `${origin}${BACKEND_PROXY_PATH}`;
  }

  if (!envUrl) {
    throw new Error('NEXT_PUBLIC_BACKEND_API_URL is required for server-side backend calls');
  }

  return envUrl;
}

export function getBackendApiUrl(): string {
  return resolveBackendApiUrl({
    nodeEnv: process.env.NODE_ENV,
    envBackendApiUrl: process.env.NEXT_PUBLIC_BACKEND_API_URL,
    browserOrigin: typeof window === 'undefined' ? undefined : window.location.origin,
  });
}
