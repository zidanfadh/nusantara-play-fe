/** Server-side auth of this build (Phase 29): server components and route handlers only. */
export { getServerAuth, exchangeOAuthCode } from '@/lib/auth/impl/server';
export type { ServerAuth } from './server-types';
