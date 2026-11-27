import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VerifyEmailLanding } from '@/components/auth/local/VerifyEmailLanding';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// The URL carries a one-time token: never send it to another site as a referrer.
export const metadata: Metadata = { referrer: 'no-referrer' };

/** Linked from the verification email: `{APP_PUBLIC_URL}/verify-email?token=…` (Phase 29, local mode only). */
export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NEXT_PUBLIC_AUTH_MODE !== 'local') notFound();
  const { token } = await searchParams;
  return (
    <div className="flex flex-col items-center">
      <VerifyEmailLanding token={typeof token === 'string' && token ? token : null} />
    </div>
  );
}
