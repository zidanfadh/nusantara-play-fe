import { notFound } from 'next/navigation';
import { CheckEmail } from '@/components/auth/local/CheckEmail';
import { authQuery, parseLoginReason, safeRedirectPath } from '@/components/auth/login-redirect';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** "Cek email kamu" after signing up (Phase 29, local mode only); keeps redirectTo / reason for the login link. */
export default async function CheckEmailPage({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NEXT_PUBLIC_AUTH_MODE !== 'local') notFound();
  const params = await searchParams;
  const query = authQuery(safeRedirectPath(first(params.redirectTo)), parseLoginReason(first(params.reason)));
  return (
    <div className="flex flex-col items-center">
      <CheckEmail loginHref={`/login${query}`} />
    </div>
  );
}
