import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ResetPasswordForm } from '@/components/auth/local/ResetPasswordForm';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// The URL carries a one-time token: never send it to another site as a referrer.
export const metadata: Metadata = { referrer: 'no-referrer' };

/** Linked from the reset email: `{APP_PUBLIC_URL}/reset-password?token=…` (Phase 29, local mode only). */
export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NEXT_PUBLIC_AUTH_MODE !== 'local') notFound();
  const { token } = await searchParams;
  return (
    <div className="flex flex-col items-center">
      <ResetPasswordForm token={typeof token === 'string' && token ? token : null} />
    </div>
  );
}
