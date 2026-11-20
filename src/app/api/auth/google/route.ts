/**
 * GET /api/auth/google
 * Initiates Google OAuth via Supabase.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const origin = request.headers.get('origin') ?? 'http://localhost:3000';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL('/auth/sign-in?error=oauth_failed', origin));
  }

  return NextResponse.redirect(data.url);
}
