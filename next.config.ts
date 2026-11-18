import type { NextConfig } from "next";

/**
 * Same-origin path that proxies browser API calls to the NestJS backend.
 * Must match BACKEND_PROXY_PATH in lib/api/base-url.ts (checked by tests/config/next-config.test.ts).
 * Not "/api" because app/api/ already holds Next.js route handlers.
 */
export const BACKEND_PROXY_PATH = "/backend-api";

/** Production backend origin, used when BACKEND_ORIGIN is not set. */
export const DEFAULT_BACKEND_ORIGIN = "https://api.nusantaralegacy.org";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Validates BACKEND_ORIGIN (scheme + host [+ port] only). Throws, and so fails `next build`,
 * when the value is not a plain https origin (http is allowed only for localhost).
 */
export function resolveBackendOrigin(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) {
    return DEFAULT_BACKEND_ORIGIN;
  }

  const fail = (reason: string): never => {
    throw new Error(
      `Invalid BACKEND_ORIGIN "${value}": ${reason}. ` +
        `Expected an origin such as "${DEFAULT_BACKEND_ORIGIN}" ` +
        `(https, no path, no trailing slash; http only for localhost).`,
    );
  };

  if (value.endsWith("/")) {
    fail("it must not end with a slash");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail("it is not an absolute URL");
  }

  const isLocal = LOCAL_HOSTNAMES.has(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
    fail("it must use https (http is allowed only for localhost)");
  }

  if (url.origin !== value) {
    fail("it must be an origin only (lowercase host, no path, query, fragment or credentials)");
  }

  return value;
}

/** The only product domain (owner decision, Phase 10). */
export const CANONICAL_ORIGIN = "https://nusantaralegacy.org";

/**
 * Retired hosts that redirect permanently (308) to CANONICAL_ORIGIN with the same path and query.
 * www.nusantaralegacy.org is NOT listed: Vercel already redirects it to the apex (Phase 10 check), and
 * the apex itself must never be listed (it would loop if Vercel redirected the other way).
 */
export const RETIRED_HOSTS = ["nusantaravirtual.org", "www.nusantaravirtual.org"] as const;

/** Escapes a host name for the regex that Next.js applies to `has` host values. */
function hostPattern(host: string): string {
  return host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * One redirect per retired host. `/:path*` matches every path including `/` and `/backend-api/...`
 * (nothing is excluded); Next.js keeps the query string on redirects.
 */
export function domainRedirects() {
  return RETIRED_HOSTS.map((host) => ({
    source: "/:path*",
    has: [{ type: "host" as const, value: hostPattern(host) }],
    destination: `${CANONICAL_ORIGIN}/:path*`,
    permanent: true,
  }));
}

const nextConfig: NextConfig = {
  async redirects() {
    return domainRedirects();
  },
  async rewrites() {
    // Destination host is fixed by config; nothing in the request can choose it (no open proxy).
    const origin = resolveBackendOrigin(process.env.BACKEND_ORIGIN);
    return [
      {
        source: `${BACKEND_PROXY_PATH}/:path*`,
        destination: `${origin}/api/:path*`,
      },
    ];
  },
  async headers() {
    // API responses must never be cached by Vercel's CDN. Projects created on or after
    // 2026-04-06 honor upstream cache headers on external rewrites by default; this opts out.
    return [
      {
        source: `${BACKEND_PROXY_PATH}/:path*`,
        headers: [{ key: "x-vercel-enable-rewrite-caching", value: "0" }],
      },
    ];
  },
};

export default nextConfig;
