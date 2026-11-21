/**
 * User Data Aggregator for Self-Service Export (architecture.md §12 & phases.md §1 Phase 6)
 * Collects all student data across database tables into a clean, portable JSON object.
 */
import { SupabaseClient } from '@supabase/supabase-js';

export interface ExportedUserData {
  exported_at: string;
  user_id: string;
  profile: unknown;
  consents: unknown[];
  study_plans: unknown[];
  watch_progress: unknown[];
  notes: unknown[];
  quiz_attempts: unknown[];
  notification_preferences: unknown;
}

export async function exportUserData(
  supabase: SupabaseClient,
  userId: string
): Promise<ExportedUserData> {
  const [
    profileRes,
    consentsRes,
    plansRes,
    progressRes,
    notesRes,
    attemptsRes,
    prefRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('guardian_consents').select('*').eq('student_id', userId),
    supabase.from('study_plans').select(`
      *,
      plan_items (*)
    `).eq('user_id', userId),
    supabase.from('watch_progress').select('*').eq('user_id', userId),
    supabase.from('notes').select('*').eq('user_id', userId),
    supabase.from('attempts').select(`
      *,
      attempt_answers (*)
    `).eq('user_id', userId),
    supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  return {
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile: profileRes.data || null,
    consents: consentsRes.data || [],
    study_plans: plansRes.data || [],
    watch_progress: progressRes.data || [],
    notes: notesRes.data || [],
    quiz_attempts: attemptsRes.data || [],
    notification_preferences: prefRes.data || null,
  };
}
