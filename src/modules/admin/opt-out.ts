import { SupabaseClient } from '@supabase/supabase-js';
import { CreatorOptOut, CreatorOptOutInput } from './types';

/**
 * Check if a YouTube channel has an active opt-out request.
 */
export async function isChannelOptedOut(
  supabase: SupabaseClient,
  channelId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('creator_opt_outs')
    .select('id')
    .eq('channel_id', channelId)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) {
    return false;
  }
  return true;
}

/**
 * Record a creator opt-out request in public.creator_opt_outs.
 */
export async function recordCreatorOptOut(
  supabase: SupabaseClient,
  input: CreatorOptOutInput,
  actorId?: string
): Promise<CreatorOptOut> {
  const payload = {
    channel_id: input.channel_id,
    channel_title: input.channel_title,
    contact_email: input.contact_email || null,
    reason: input.reason || null,
    status: 'active' as const,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('creator_opt_outs')
    .upsert(payload, { onConflict: 'channel_id' })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to record creator opt-out: ${error?.message || 'unknown error'}`);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: actorId || null,
    action: 'creator_opt_out_recorded',
    target: `channel:${input.channel_id}`,
  });

  return data as CreatorOptOut;
}

/**
 * Purge shared insights and assessments associated with an opted-out creator.
 * Finds all videos belonging to channel_id and removes them from video_insights.
 */
export async function purgeCreatorInsights(
  supabase: SupabaseClient,
  channelId: string
): Promise<{ purgedInsights: number }> {
  // 1. Find all video IDs associated with this channel
  const { data: videoRows, error: videoError } = await supabase
    .from('videos')
    .select('youtube_video_id')
    .eq('channel_id', channelId);

  if (videoError || !videoRows || videoRows.length === 0) {
    return { purgedInsights: 0 };
  }

  const videoIds = videoRows.map((v) => v.youtube_video_id);

  // 2. Delete matching video_insights
  const { data: deletedRows, error: deleteError } = await supabase
    .from('video_insights')
    .delete()
    .in('video_id', videoIds)
    .select('id');

  if (deleteError) {
    console.error('Error deleting video_insights for creator:', deleteError);
    return { purgedInsights: 0 };
  }

  const count = deletedRows?.length ?? 0;

  // 3. Log purge action
  await supabase.from('audit_logs').insert({
    action: 'creator_insights_purged',
    target: `channel:${channelId} (purged ${count} insights)`,
  });

  return { purgedInsights: count };
}

/**
 * List all creator opt-outs (for admin console).
 */
export async function listCreatorOptOuts(
  supabase: SupabaseClient
): Promise<CreatorOptOut[]> {
  const { data, error } = await supabase
    .from('creator_opt_outs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }
  return data as CreatorOptOut[];
}

/**
 * Revoke an existing opt-out (e.g. if the creator consents again).
 */
export async function revokeCreatorOptOut(
  supabase: SupabaseClient,
  optOutId: string,
  actorId?: string
): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('creator_opt_outs')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', optOutId);

  if (error) {
    return { success: false };
  }

  await supabase.from('audit_logs').insert({
    actor_id: actorId || null,
    action: 'creator_opt_out_revoked',
    target: `opt_out:${optOutId}`,
  });

  return { success: true };
}
