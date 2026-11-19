import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { POST_LOGIN_COOKIE, callbackTarget, loginRetryPath } from '@/components/auth/login-redirect';

function clearTargetCookie(response: NextResponse): NextResponse {
  response.cookies.set(POST_LOGIN_COOKIE, '', { path: '/', maxAge: 0, sameSite: 'lax' });
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Phase 18: validated target (`next` or the cookie the login page set before Google sign-in), never another site.
  const target = callbackTarget(searchParams.get('next'), request.cookies.get(POST_LOGIN_COOKIE)?.value);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return clearTargetCookie(NextResponse.redirect(new URL(target, origin)));
    }
  }

  return clearTargetCookie(NextResponse.redirect(new URL(loginRetryPath(target), origin)));
}
