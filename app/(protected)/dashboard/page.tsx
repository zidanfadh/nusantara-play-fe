import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="rounded-lg shadow p-6">
        <p className="">Welcome back, {user?.email}!</p>
        <p className="text-sm mt-2">
          You are now authenticated and can access protected content.
        </p>
      </div>
    </div>
  );
}
