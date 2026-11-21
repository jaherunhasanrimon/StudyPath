import { SupabaseClient } from '@supabase/supabase-js';
import { QuestionReviewItem, QuestionUpdatePayload } from './types';

/**
 * Verify whether a user has the 'admin' role in public.profiles.
 */
export async function verifyAdminRole(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.role === 'admin';
}

/**
 * Retrieve questions needing moderation or review.
 * Prioritizes reported questions (report_count > 0) and unreviewed or hidden items.
 */
export async function getReviewQueue(
  supabase: SupabaseClient,
  filter?: { reportedOnly?: boolean }
): Promise<QuestionReviewItem[]> {
  let query = supabase
    .from('questions')
    .select(
      'id, assessment_id, position, type, stem, options, answer, explanation, hints, topic, difficulty, verifier_status, report_count, is_hidden, reviewed_at, reviewed_by, created_at'
    );

  if (filter?.reportedOnly) {
    query = query.gt('report_count', 0);
  }

  // Sort reported and unreviewed first
  const { data, error } = await query
    .order('report_count', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as QuestionReviewItem[];
}

/**
 * Update question content or moderation status.
 * Automatically logs the moderation event to audit_logs.
 */
export async function updateQuestion(
  supabase: SupabaseClient,
  adminId: string,
  questionId: string,
  payload: QuestionUpdatePayload
): Promise<{ success: boolean }> {
  const updateFields: Record<string, unknown> = {
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminId,
  };

  if (payload.is_hidden !== undefined) {
    updateFields.is_hidden = payload.is_hidden;
  }
  if (payload.verifier_status !== undefined) {
    updateFields.verifier_status = payload.verifier_status;
  }
  if (payload.stem !== undefined) {
    updateFields.stem = payload.stem;
  }
  if (payload.options !== undefined) {
    updateFields.options = payload.options;
  }
  if (payload.answer !== undefined) {
    updateFields.answer = payload.answer;
  }
  if (payload.explanation !== undefined) {
    updateFields.explanation = payload.explanation;
  }

  const { error: updateError } = await supabase
    .from('questions')
    .update(updateFields)
    .eq('id', questionId);

  if (updateError) {
    return { success: false };
  }

  // Insert audit log
  const actionDescription = payload.is_hidden
    ? 'question_hidden'
    : payload.verifier_status === 'human_ok'
      ? 'question_approved'
      : 'question_updated';

  await supabase.from('audit_logs').insert({
    actor_id: adminId,
    action: actionDescription,
    target: `question:${questionId}`,
  });

  return { success: true };
}

/**
 * Convenience helper: 1-click hide question.
 */
export async function hideQuestion(
  supabase: SupabaseClient,
  adminId: string,
  questionId: string
): Promise<{ success: boolean }> {
  return updateQuestion(supabase, adminId, questionId, { is_hidden: true });
}

/**
 * Convenience helper: 1-click approve question (sets verifier_status to human_ok and unhides).
 */
export async function approveQuestion(
  supabase: SupabaseClient,
  adminId: string,
  questionId: string
): Promise<{ success: boolean }> {
  return updateQuestion(supabase, adminId, questionId, {
    verifier_status: 'human_ok',
    is_hidden: false,
  });
}
