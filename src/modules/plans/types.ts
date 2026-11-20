/**
 * Type definitions for study plans and learning loop module.
 * Governed by docs/architecture.md §9 and docs/phases.md §2.
 */
import { Prefs, ItemType } from '@/modules/scheduler/types';
export type { CreatePlanInput } from './schema';

export type PlanItemType = ItemType;
export type PlanItemStatus = 'scheduled' | 'done' | 'skipped' | 'missed' | 'moved';

export interface UserPlaylistRow {
  id: string;
  user_id: string;
  playlist_id: string | null;
  label: string | null;
  subject: string | null;
  level: string | null;
  board: string | null;
  chapter: string | null;
  language: string;
  created_at: string;
}

export type StudyPlanStatus = 'draft' | 'active' | 'archived' | 'completed';

export interface StudyPlanRow {
  id: string;
  user_id: string;
  user_playlist_id: string;
  name: string;
  version: number;
  parent_plan_id: string | null;
  status: StudyPlanStatus;
  prefs: Prefs;
  engine_version: string;
  input_hash: string;
  timezone: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface PlanItemRow {
  id: string;
  plan_id: string;
  seq: number;
  type: PlanItemType;
  start_at: string;
  end_at: string;
  duration_min: number;
  video_ids: string[];
  part: { part: number; of: number; fromSec: number; toSec: number } | null;
  covers: number[];
  due_at: string | null;
  label: string;
  status: PlanItemStatus;
  completed_at: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface WatchProgressRow {
  user_id: string;
  video_id: string;
  plan_item_id: string | null;
  last_position_sec: number;
  max_position_sec: number;
  completed: boolean;
  updated_at: string;
}

export interface NoteRow {
  id: string;
  user_id: string;
  video_id: string;
  body: string;
  source: 'user' | 'ai';
  created_at: string;
  updated_at: string;
}

export interface PlanWithItems extends StudyPlanRow {
  items: PlanItemRow[];
  progress?: Record<string, WatchProgressRow>; // keyed by video_id
}

export interface TodayResponse {
  primaryAction: PlanItemRow | null;
  overdue: PlanItemRow[];
  upcoming: PlanItemRow[];
  todayDate: string;
  timezone: string;
  planName: string | null;
  planId: string | null;
}
