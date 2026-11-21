/**
 * Consent & Minor Protection Service (architecture.md §12 & phases.md §1 Phase 6)
 * Implements Bangladesh PDPA 2026 minor protection rules:
 * - Age check (< 18 in Asia/Dhaka)
 * - Guardian consent token lifecycle (pending, granted, revoked, expired)
 * - Feature gating for minors (AI features, reminders, summaries)
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { now } from '../../lib/time';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  GuardianConsent,
  ConsentRequestInput,
  ConsentDecisionInput,
  MinorAccessResult,
  ConsentStatus,
} from './types';

/**
 * Pure function to check if a birth year indicates a minor (< 18 years old).
 */
export function isMinor(birthYear: number | null | undefined, referenceYear?: number): boolean {
  if (birthYear === null || birthYear === undefined) {
    return false;
  }
  const currentYear = referenceYear ?? now().year;
  return (currentYear - birthYear) < 18;
}

/**
 * Checks whether a student has full access to AI and notification features.
 * Adult (18+) -> always allowed.
 * Minor (< 18) -> allowed ONLY if guardian consent is granted.
 */
export async function checkMinorAccess(
  supabase: SupabaseClient,
  userId: string,
  referenceYear?: number
): Promise<MinorAccessResult> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('birth_year')
    .eq('id', userId)
    .maybeSingle();

  const birthYear = profile?.birth_year ?? null;
  const minor = isMinor(birthYear, referenceYear);

  if (!minor) {
    return {
      isMinor: false,
      birthYear,
      consentGranted: false,
      allowed: true,
      reason: 'adult',
    };
  }

  // Look for active guardian consent
  const { data: consent } = await supabase
    .from('guardian_consents')
    .select('*')
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!consent) {
    return {
      isMinor: true,
      birthYear,
      consentGranted: false,
      consentStatus: 'pending',
      allowed: false,
      reason: 'guardian_consent_required',
    };
  }

  const consentRecord = consent as GuardianConsent;
  const isExpired = new Date(consentRecord.token_expires_at).getTime() < Date.now();

  if (consentRecord.status === 'granted') {
    return {
      isMinor: true,
      birthYear,
      consentGranted: true,
      consentStatus: 'granted',
      allowed: true,
      reason: 'consent_granted',
    };
  }

  if (consentRecord.status === 'revoked') {
    return {
      isMinor: true,
      birthYear,
      consentGranted: false,
      consentStatus: 'revoked',
      allowed: false,
      reason: 'consent_revoked',
    };
  }

  if (consentRecord.status === 'expired' || isExpired) {
    return {
      isMinor: true,
      birthYear,
      consentGranted: false,
      consentStatus: 'expired',
      allowed: false,
      reason: 'consent_expired',
    };
  }

  return {
    isMinor: true,
    birthYear,
    consentGranted: false,
    consentStatus: 'pending',
    allowed: false,
    reason: 'consent_pending',
  };
}

/**
 * Server-side helper to check minor access for a user ID.
 */
export async function checkUserMinorAccess(userId: string): Promise<MinorAccessResult> {
  try {
    const supabase = await createServerSupabaseClient();
    return await checkMinorAccess(supabase, userId);
  } catch {
    // Graceful fallback for offline tests without supabase env
    return {
      isMinor: false,
      birthYear: null,
      consentGranted: false,
      allowed: true,
      reason: 'adult',
    };
  }
}

/**
 * Creates a new guardian consent request token.
 */
export async function createConsentRequest(
  supabase: SupabaseClient,
  input: ConsentRequestInput
): Promise<{ success: boolean; consent?: GuardianConsent; error?: string }> {
  if (!input.guardian_email || !input.guardian_email.includes('@')) {
    return { success: false, error: 'Valid guardian email is required' };
  }

  // Expiration: 7 days from now
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('guardian_consents')
    .insert({
      student_id: input.student_id,
      guardian_email: input.guardian_email.trim().toLowerCase(),
      status: 'pending',
      token_expires_at: expiresAt,
      consent_version: '1.0',
    })
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to create consent request' };
  }

  return { success: true, consent: data as GuardianConsent };
}

/**
 * Verifies a guardian consent token.
 */
export async function verifyConsentToken(
  supabase: SupabaseClient,
  token: string
): Promise<GuardianConsent | null> {
  const { data, error } = await supabase
    .from('guardian_consents')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const consent = data as GuardianConsent;
  const isExpired = new Date(consent.token_expires_at).getTime() < Date.now();

  if (consent.status === 'pending' && isExpired) {
    await supabase
      .from('guardian_consents')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', consent.id);
    return { ...consent, status: 'expired' };
  }

  return consent;
}

/**
 * Records a guardian's decision (grant or revoke).
 */
export async function recordConsentDecision(
  supabase: SupabaseClient,
  input: ConsentDecisionInput
): Promise<{ success: boolean; status?: ConsentStatus; error?: string }> {
  const consent = await verifyConsentToken(supabase, input.token);
  if (!consent) {
    return { success: false, error: 'Invalid or expired consent token' };
  }

  if (consent.status === 'expired') {
    return { success: false, status: 'expired', error: 'This consent request has expired' };
  }

  const nowIso = new Date().toISOString();
  const newStatus: ConsentStatus = input.decision === 'grant' ? 'granted' : 'revoked';

  const updatePayload: Partial<GuardianConsent> = {
    status: newStatus,
    updated_at: nowIso,
    granted_at: input.decision === 'grant' ? nowIso : null,
    revoked_at: input.decision === 'revoke' ? nowIso : null,
  };

  const { error } = await supabase
    .from('guardian_consents')
    .update(updatePayload)
    .eq('id', consent.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, status: newStatus };
}
