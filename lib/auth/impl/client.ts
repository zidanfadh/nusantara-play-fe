/**
 * Build-time switch point (Phase 29). This file is the SUPABASE implementation (default). With
 * NEXT_PUBLIC_AUTH_MODE=local, `next.config.ts` aliases the import path `@/lib/auth/impl/client` to
 * `lib/auth/local/impl-client.ts`, so the Supabase code is not bundled at all. Always import it through
 * `@/lib/auth/client` (never relatively).
 */
export { supabaseAuthClient as authClient } from '@/lib/auth/supabase/client';
