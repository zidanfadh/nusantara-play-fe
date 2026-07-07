import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const publicExactRoutes = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/about',
  '/unauthorized',
  '/menu',
  '/events',
  '/calendar',
  '/nfts',
];

const publicPrefixes = [
  /^\/events\/(?!create$|my-events$|my-registrations$)[^/]+$/,
  /^\/prot$/,
  /^\/prot\/(?!create$|verifikasi$)[^/]+$/,
  /^\/nfts\/[^/]+$/,
];

function isPublicPath(pathname: string) {
  return (
    publicExactRoutes.includes(pathname) ||
    publicPrefixes.some((pattern) => pattern.test(pathname))
  );
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublicRoute = isPublicPath(pathname);

  // Redirect ke login jika belum login dan bukan public route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect user yang sudah login dari halaman login/signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/profile';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
