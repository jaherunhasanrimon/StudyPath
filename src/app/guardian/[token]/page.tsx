'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { GuardianConsentView } from '@/components/consent/GuardianConsentView';

export default function GuardianConsentPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [consentData, setConsentData] = useState<{
    status: 'pending' | 'granted' | 'revoked' | 'expired';
    guardian_email: string;
    student_name: string | null;
    token_expires_at: string;
  } | null>(null);

  useEffect(() => {
    async function loadConsent() {
      if (!token) return;
      try {
        const res = await fetch(`/api/consent/verify?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (res.ok && json.ok) {
          setConsentData(json.consent);
        }
      } catch (err) {
        console.error('Failed to load consent:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConsent();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 text-center shadow-xl space-y-4">
          <div className="h-8 w-48 mx-auto animate-pulse rounded bg-slate-700" />
          <div className="h-20 animate-pulse rounded bg-slate-700" />
        </div>
      </div>
    );
  }

  if (!consentData) {
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

  return (
    <GuardianConsentView
      token={token}
      initialStatus={consentData.status}
      guardianEmail={consentData.guardian_email}
      studentName={consentData.student_name}
      expiresAt={consentData.token_expires_at}
      isExpired={consentData.status === 'expired'}
    />
  );
}
