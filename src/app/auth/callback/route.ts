/**
 * Auth callback handler.
 * Handles Supabase auth redirects (magic link, OAuth).
 * Phase 0: placeholder.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // TODO: Exchange code for session when Supabase is configured
    // const supabase = await createServerSupabaseClient();
    // await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
