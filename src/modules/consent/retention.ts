/**
 * Data Retention & Cleanup Worker (architecture.md §12 & phases.md §1 Phase 6)
 * - Purges ai_calls older than 30 days (Compliance §8: 30-day retention)
 * - Updates expired pending guardian consent tokens
 */
import { SupabaseClient } from '@supabase/supabase-js';

export interface RetentionJobResult {
  aiCallsPurged: number;
  consentsExpired: number;
  ranAt: string;
}

export async function runRetentionJob(
  supabase: SupabaseClient,
  nowIso = new Date().toISOString()
): Promise<RetentionJobResult> {
  const thirtyDaysAgo = new Date(new Date(nowIso).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Delete ai_calls older than 30 days
  const { data: deletedCalls, error: aiError } = await supabase
    .from('ai_calls')
    .delete()
    .lt('created_at', thirtyDaysAgo)
    .select('id');

  const aiCallsPurged = (!aiError && deletedCalls) ? deletedCalls.length : 0;

  // 2. Mark expired pending guardian consents
  const { data: expiredConsents, error: consentError } = await supabase
    .from('guardian_consents')
    .update({ status: 'expired', updated_at: nowIso })
    .eq('status', 'pending')
    .lt('token_expires_at', nowIso)
    .select('id');

  const consentsExpired = (!consentError && expiredConsents) ? expiredConsents.length : 0;

  return {
    aiCallsPurged,
    consentsExpired,
    ranAt: nowIso,
  };
}
