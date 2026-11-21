import { SupabaseClient } from '@supabase/supabase-js';
import { FeedbackInput, FeedbackItem } from './types';

/**
 * Record feedback submitted by a user or visitor.
 */
export async function submitFeedback(
  supabase: SupabaseClient,
  userId: string | null,
  input: FeedbackInput
): Promise<FeedbackItem> {
  const payload = {
    user_id: userId,
    category: input.category,
    message: input.message,
    metadata: input.metadata || {},
    status: 'new' as const,
  };

  const { data, error } = await supabase
    .from('feedback')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to submit feedback: ${error?.message || 'unknown error'}`);
  }

  return data as FeedbackItem;
}

/**
 * List feedback for the admin console.
 */
export async function listFeedback(
  supabase: SupabaseClient,
  filter?: { category?: string; status?: string }
): Promise<FeedbackItem[]> {
  let query = supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter?.category) {
    query = query.eq('category', filter.category);
  }
  if (filter?.status) {
    query = query.eq('status', filter.status);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }
  return data as FeedbackItem[];
}

/**
 * Update the triage status of feedback.
 */
export async function updateFeedbackStatus(
  supabase: SupabaseClient,
  feedbackId: string,
  status: 'new' | 'investigating' | 'resolved' | 'closed',
  adminId?: string
): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('feedback')
    .update({ status })
    .eq('id', feedbackId);

  if (error) {
    return { success: false };
  }

  if (adminId) {
    await supabase.from('audit_logs').insert({
      actor_id: adminId,
      action: `feedback_status_${status}`,
      target: `feedback:${feedbackId}`,
    });
  }

  return { success: true };
}
