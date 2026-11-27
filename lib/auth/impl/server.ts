/**
 * Build-time switch point (Phase 29) for server components and route handlers; SUPABASE implementation
 * (default). Local mode: aliased to `lib/auth/local/impl-server.ts` by `next.config.ts`.
 */
export { getServerAuth, exchangeOAuthCode } from '@/lib/auth/supabase/server';
