import { notFound } from 'next/navigation';
import { ForgotPasswordForm } from '@/components/auth/local/ForgotPasswordForm';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** "Lupa kata sandi" (Phase 29): only with the self-hosted login (NEXT_PUBLIC_AUTH_MODE=local). */
export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NEXT_PUBLIC_AUTH_MODE !== 'local') notFound();
  const params = await searchParams;
  return (
    <div className="flex flex-col items-center">
      <ForgotPasswordForm legacy={params.legacy === '1'} />
    </div>
  );
}
