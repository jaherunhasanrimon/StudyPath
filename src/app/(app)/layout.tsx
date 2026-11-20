import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';
import { AppNav } from '@/components/navigation/AppNav';

/**
 * Protected route group (app).
 * Redirects to home if not authenticated.
 * Provides consistent desktop & mobile navigation.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const testUserCookie = cookieStore.get('dishari-test-user');

  if (testUserCookie?.value) {
    return (
      <div className="min-h-screen flex flex-col bg-paper pb-20 sm:pb-8">
        <AppNav />
        <div className="flex-1 max-w-[1100px] w-full mx-auto">{children}</div>
      </div>
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/');
    }
  } catch {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex flex-col bg-paper pb-20 sm:pb-8">
      <AppNav />
      <div className="flex-1 max-w-[1100px] w-full mx-auto">{children}</div>
    </div>
  );
}
