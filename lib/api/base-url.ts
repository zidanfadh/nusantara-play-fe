type ResolveBackendApiUrlOptions = {
  nodeEnv?: string;
  envBackendApiUrl?: string;
  hostname?: string;
};

function normalizeUrl(url?: string): string {
  return url?.trim().replace(/\/+$/, '') || '';
}

function normalizeHostname(hostname?: string): string {
  return (hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
}

export function resolveBackendApiUrl({
  nodeEnv,
  envBackendApiUrl,
  hostname,
}: ResolveBackendApiUrlOptions = {}): string {
  const fallbackUrl = normalizeUrl(envBackendApiUrl);

  if (nodeEnv === 'development') {
    if (!fallbackUrl) {
      throw new Error('NEXT_PUBLIC_BACKEND_API_URL is required in development');
    }

    return fallbackUrl;
  }

  const productionHostname = normalizeHostname(hostname);

  if (productionHostname) {
    return `https://api.${productionHostname}/api`;
  }

  if (!fallbackUrl) {
    throw new Error('NEXT_PUBLIC_BACKEND_API_URL is required when hostname is unavailable');
  }

  return fallbackUrl;
}

export function getBackendApiUrl(): string {
  return resolveBackendApiUrl({
    nodeEnv: process.env.NODE_ENV,
    envBackendApiUrl: process.env.NEXT_PUBLIC_BACKEND_API_URL,
    hostname: typeof window === 'undefined' ? undefined : window.location.hostname,
  });
}
