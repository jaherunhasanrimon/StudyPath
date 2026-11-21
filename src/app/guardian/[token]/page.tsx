import React from 'react';
import Link from 'next/link';
import { createAdminSupabaseClient } from '@/lib/supabase';
import { verifyConsentToken } from '@/modules/consent/service';
import { GuardianConsentView } from '@/components/consent/GuardianConsentView';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function GuardianConsentPage({ params }: PageProps) {
  const { token } = await params;
  const supabaseAdmin = createAdminSupabaseClient();
  const consent = await verifyConsentToken(supabaseAdmin, token);

  if (!consent) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 text-center shadow-xl">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-slate-100 mb-2">অনুরোধ পাওয়া যায়নি</h1>
          <p className="text-sm text-slate-400 mb-6">
            Invalid or expired consent token. Please request a new consent link from Dishari.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium text-sm transition"
          >
            হোমপেজে ফিরে যান (Return Home)
          </Link>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', consent.student_id)
    .maybeSingle();

  const isExpired = consent.status === 'expired';

  return (
    <GuardianConsentView
      token={token}
      initialStatus={consent.status}
      guardianEmail={consent.guardian_email}
      studentName={profile?.display_name || null}
      expiresAt={consent.token_expires_at}
      isExpired={isExpired}
    />
  );
}
