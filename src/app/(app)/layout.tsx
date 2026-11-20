/**
 * Protected route group (app).
 * Phase 0: redirects to home if not authenticated.
 * When Supabase is configured, this will check the session.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Phase 0: Supabase not yet configured, so just render children.
  // This will be replaced with real auth check when credentials are provided.
  // TODO: Check session and redirect if not authenticated
  // import { redirect } from 'next/navigation';
  // const supabase = await createServerSupabaseClient();
  // const { data: { session } } = await supabase.auth.getSession();
  // if (!session) redirect('/');

  return <>{children}</>;
}
