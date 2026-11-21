/**
 * Consent & Compliance Types (architecture.md §12 & phases.md §1 Phase 6)
 */

export type ConsentStatus = 'pending' | 'granted' | 'revoked' | 'expired';

export interface GuardianConsent {
  id: string;
  student_id: string;
  guardian_email: string;
  status: ConsentStatus;
  token: string;
  token_expires_at: string;
  consent_version: string;
  granted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsentRequestInput {
  student_id: string;
  guardian_email: string;
}

export interface ConsentDecisionInput {
  token: string;
  decision: 'grant' | 'revoke';
}

export interface MinorAccessResult {
  isMinor: boolean;
  birthYear: number | null;
  consentGranted: boolean;
  consentStatus?: ConsentStatus;
  allowed: boolean;
  reason: 'adult' | 'consent_granted' | 'guardian_consent_required' | 'consent_pending' | 'consent_revoked' | 'consent_expired';
}
