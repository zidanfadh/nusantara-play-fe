/**
 * Build-time switch point (Phase 29) for `middleware.ts`; SUPABASE implementation (default). Local mode:
 * aliased to `lib/auth/local/impl-middleware.ts` by `next.config.ts`.
 */
export { middlewareSession } from '@/lib/auth/supabase/middleware';
