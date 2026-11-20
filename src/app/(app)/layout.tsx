import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Protected route group (app).
 * Redirects to home if not authenticated.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  return <>{children}</>;
}
