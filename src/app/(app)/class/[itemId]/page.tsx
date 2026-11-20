import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { PlanItemRow, WatchProgressRow, NoteRow } from '@/modules/plans/types';
import { ClassClient } from '@/components/class/ClassClient';

interface ClassPageProps {
  params: Promise<{ itemId: string }>;
}

export default async function ClassPage({ params }: ClassPageProps) {
  const { itemId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Fetch item
  const { data: item, error: itemError } = await supabase
    .from('plan_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (itemError || !item) {
    notFound();
  }

  const planItem = item as PlanItemRow;

  // 2. Fetch watch progress for the video
  const primaryVideoId = planItem.video_ids[0] || '';
  const { data: progress } = await supabase
    .from('watch_progress')
    .select('*')
    .eq('user_id', user!.id)
    .eq('video_id', primaryVideoId)
    .maybeSingle();

  // 3. Fetch note for the video
  const { data: note } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user!.id)
    .eq('video_id', primaryVideoId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Find next item in this plan
  const { data: nextItem } = await supabase
    .from('plan_items')
    .select('id')
    .eq('plan_id', planItem.plan_id)
    .gt('seq', planItem.seq)
    .order('seq', { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <ClassClient
      item={planItem}
      planId={planItem.plan_id}
      initialProgress={(progress as WatchProgressRow) || null}
      initialNote={(note as NoteRow)?.body || null}
      nextItemId={nextItem ? nextItem.id : null}
    />
  );
}
