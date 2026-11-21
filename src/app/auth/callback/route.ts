/**
 * Auth callback handler.
 * Handles Supabase auth redirects (magic link, OAuth).
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/today';

  if (code) {
    try {
      const cookieStore = await cookies();
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const response = NextResponse.redirect(new URL(next, requestUrl.origin));
        cookieStore.getAll().forEach((c) => {
          response.cookies.set(c.name, c.value);
        });
        return response;
      }

      console.error('Failed to exchange code for session:', error);
    } catch (err) {
      console.error('Error during auth code exchange:', err);
    }
  }

  return NextResponse.redirect(
    new URL('/auth/sign-in?error=auth_callback_failed', requestUrl.origin)
  );
}
