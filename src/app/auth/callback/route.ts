/**
 * Auth callback handler.
 * Handles Supabase auth redirects (magic link, OAuth).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/today';

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(new URL(next, requestUrl.origin));
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
