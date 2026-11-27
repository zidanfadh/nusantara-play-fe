import path from "node:path";
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

/**
 * Login implementation of the build (Phase 29): NEXT_PUBLIC_AUTH_MODE "local" or "supabase" (the default for
 * anything else). Same rule as parseAuthMode() in lib/auth/mode.ts (tested).
 */
export function resolveAuthMode(raw: string | undefined): "supabase" | "local" {
  return raw === "local" ? "local" : "supabase";
}

/**
 * The three switch points of the auth facade. In local mode each import path is aliased to the local file, so
 * the Supabase implementation (and @supabase/*) is not in the build at all; in supabase mode nothing is
 * aliased and the files under lib/auth/impl/ (the Supabase implementation) are used.
 */
export const LOCAL_AUTH_ALIASES = {
  "@/lib/auth/impl/client": "./lib/auth/local/impl-client.ts",
  "@/lib/auth/impl/server": "./lib/auth/local/impl-server.ts",
  "@/lib/auth/impl/middleware": "./lib/auth/local/impl-middleware.ts",
} as const;

export function authAliases(mode: "supabase" | "local"): Record<string, string> {
  return mode === "local" ? { ...LOCAL_AUTH_ALIASES } : {};
}

/**
 * Local mode sends logins, registrations and password resets through the /backend-api rewrite, so a build or
 * dev server on a developer machine must name its backend: without BACKEND_ORIGIN the rewrite would point at
 * the PRODUCTION API. Only Vercel (VERCEL=1, where the default is the intended target) may leave it unset.
 */
export function assertLocalAuthBackend(env: Record<string, string | undefined>): void {
  if (resolveAuthMode(env.NEXT_PUBLIC_AUTH_MODE) !== "local") return;
  if (env.BACKEND_ORIGIN?.trim() || env.VERCEL === "1") return;
  throw new Error(
    "NEXT_PUBLIC_AUTH_MODE=local needs BACKEND_ORIGIN (for example http://localhost:3000) outside Vercel, " +
      "otherwise /backend-api would send auth requests to the production API.",
  );
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

/**
 * How long an optimized image stays cached before it is transformed again (Phase 14, owner decision): 31 days
 * instead of the Next 16 default of 4 hours. Safe only because every upload gets a new object key
 * (backend StorageService.uploadFile(): `<folder>/<randomUUID()>.<ext>`), so a replaced photo always has a new
 * URL and an old cache entry can never show a stale photo. If uploads ever reuse keys, lower this again.
 */
export const IMAGE_MINIMUM_CACHE_TTL_SECONDS = 2_678_400;

const AUTH_MODE = resolveAuthMode(process.env.NEXT_PUBLIC_AUTH_MODE);

const nextConfig: NextConfig = {
  // Phase 29: the auth implementation of this build (see LOCAL_AUTH_ALIASES). Turbopack is the default bundler;
  // the webpack hook covers `next build --webpack`.
  turbopack: {
    resolveAlias: authAliases(AUTH_MODE),
  },
  webpack(config) {
    const aliases = authAliases(AUTH_MODE);
    if (Object.keys(aliases).length > 0) {
      config.resolve ??= {};
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        ...Object.fromEntries(
          Object.entries(aliases).map(([key, file]) => [`${key}$`, path.resolve(process.cwd(), file)]),
        ),
      };
    }
    return config;
  },
  images: {
    minimumCacheTTL: IMAGE_MINIMUM_CACHE_TTL_SECONDS,
    // PROT photos through Vercel Image Optimization (Phase 13): only https, the PROT bucket and /prot/**,
    // no query string. Same rule as isOptimizableProtPhoto() in components/prot/ProtPhoto.tsx (tested).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nusantara-play-storage.s3.ap-southeast-2.amazonaws.com",
        port: "",
        pathname: "/prot/**",
        search: "",
      },
    ],
  },
  async redirects() {
    return domainRedirects();
  },
  async rewrites() {
    // Destination host is fixed by config; nothing in the request can choose it (no open proxy).
    assertLocalAuthBackend(process.env);
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
