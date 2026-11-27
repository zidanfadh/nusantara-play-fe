'use client';

import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * The first name on /menu in local mode (Phase 29): the server has no access token there, so the name comes
 * from the signed-in user on the client. Shows `fallback` ("Kawan") while loading or when signed out.
 */
export function WelcomeName({ fallback }: { fallback: string }) {
  const { user } = useCurrentUser();
  return <>{user?.full_name?.trim().split(/\s+/)[0] || fallback}</>;
}
