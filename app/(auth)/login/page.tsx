import { LoginForm } from '@/components/auth/LoginForm';
import { parseLoginReason, safeRedirectPath } from '@/components/auth/login-redirect';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return (
    <div className="flex flex-col items-center">
      <LoginForm
        redirectTo={safeRedirectPath(first(params.redirectTo))}
        reason={parseLoginReason(first(params.reason))}
        callbackError={first(params.error) === 'auth_callback_error'}
      />
    </div>
  );
}
