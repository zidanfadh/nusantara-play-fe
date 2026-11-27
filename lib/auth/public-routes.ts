/**
 * Pages a logged-out visitor may open (moved from middleware.ts in Phase 29 so the client can use it too: the
 * local session sends a visitor whose session ended to /login only from a protected page). Edge-safe, pure.
 */

const publicExactRoutes = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/unauthorized',
  '/menu',
  '/events',
  '/calendar',
  '/nfts',
  // Games hosted on the site (Phase 17): /main lists them, /main/<game> plays one. No login (Phase 18 too).
  '/main',
];

/**
 * Phase 29, local mode only: the email-link and password pages of the self-hosted login. They do not exist in
 * supabase mode (404), so supabase mode keeps exactly the old list.
 */
const localAuthRoutes = ['/forgot-password', '/reset-password', '/verify-email', '/cek-email'];

const publicPrefixes = [
  /^\/events\/(?!create$|my-events$|my-registrations$)[^/]+$/,
  /^\/prot$/,
  /^\/prot\/(?!create$|verifikasi(?:\/.*)?$)[^/]+$/,
  /^\/nfts\/[^/]+$/,
  // Jelajah pages need a login since Phase 18 (owner decision). Only the static files under
  // public/jelajah/ stay public (map geometry, 3D assets, the local DEMO photo): they are data, not pages.
  /^\/jelajah\/(?:geo|assets|demo)\/.+$/,
  /^\/main\/.+$/,
];

export function isPublicPath(pathname: string) {
  return (
    publicExactRoutes.includes(pathname) ||
    (process.env.NEXT_PUBLIC_AUTH_MODE === 'local' && localAuthRoutes.includes(pathname)) ||
    publicPrefixes.some((pattern) => pattern.test(pathname))
  );
}
