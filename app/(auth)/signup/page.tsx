import { SignupForm } from '@/components/auth/SignupForm';
import { parseLoginReason, safeRedirectPath } from '@/components/auth/login-redirect';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">Create Account</h1>
      <SignupForm
        redirectTo={safeRedirectPath(first(params.redirectTo))}
        reason={parseLoginReason(first(params.reason))}
      />
    </div>
  );
}
