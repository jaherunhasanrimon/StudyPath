import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { AppNav } from '@/components/navigation/AppNav';

/**
 * Protected route group (app).
 * Redirects to home if not authenticated.
 * Provides consistent desktop & mobile navigation.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex flex-col bg-paper pb-20 sm:pb-8">
      <AppNav />
      <div className="flex-1 max-w-[1100px] w-full mx-auto">{children}</div>
    </div>
  );
}
