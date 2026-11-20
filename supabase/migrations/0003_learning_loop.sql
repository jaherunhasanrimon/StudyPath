-- Migration 0003: Learning loop tables
-- Phase 3 — user_playlists, study_plans, plan_items, watch_progress, notes
-- Strict RLS: default deny, students access only their own records.

-----------------------------------------------------------
-- 1. user_playlists
-----------------------------------------------------------
CREATE TABLE public.user_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
  label TEXT,
  subject TEXT,
  level TEXT,
  board TEXT,
  chapter TEXT,
  language TEXT NOT NULL DEFAULT 'bn',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own user_playlists"
  ON public.user_playlists FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_playlists_user ON public.user_playlists (user_id);

-----------------------------------------------------------
-- 2. study_plans
-----------------------------------------------------------
CREATE TABLE public.study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_playlist_id UUID REFERENCES public.user_playlists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  parent_plan_id UUID REFERENCES public.study_plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived', 'completed')),
  prefs JSONB NOT NULL,
  engine_version TEXT NOT NULL DEFAULT '1.0.0',
  input_hash TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own study_plans"
  ON public.study_plans FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_study_plans_user_status ON public.study_plans (user_id, status);

-----------------------------------------------------------
-- 3. plan_items
-----------------------------------------------------------
CREATE TABLE public.plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('class', 'quiz', 'assignment', 'review', 'weekly_test')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL,
  video_ids TEXT[] NOT NULL DEFAULT '{}',
  part JSONB,
  covers INTEGER[] NOT NULL DEFAULT '{}',
  due_at TIMESTAMPTZ,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'done', 'skipped', 'missed', 'moved')),
  completed_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage plan_items belonging to their study_plans"
  ON public.plan_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.study_plans sp
      WHERE sp.id = plan_items.plan_id AND sp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_plans sp
      WHERE sp.id = plan_items.plan_id AND sp.user_id = auth.uid()
    )
  );

CREATE INDEX idx_plan_items_plan_seq ON public.plan_items (plan_id, seq);
CREATE INDEX idx_plan_items_plan_start ON public.plan_items (plan_id, start_at);

-----------------------------------------------------------
-- 4. watch_progress
-----------------------------------------------------------
CREATE TABLE public.watch_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  plan_item_id UUID REFERENCES public.plan_items(id) ON DELETE SET NULL,
  last_position_sec INTEGER NOT NULL DEFAULT 0,
  max_position_sec INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own watch_progress"
  ON public.watch_progress FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_watch_progress_user ON public.watch_progress (user_id);

-----------------------------------------------------------
-- 5. notes
-----------------------------------------------------------
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'ai')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notes"
  ON public.notes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_notes_user_video ON public.notes (user_id, video_id);
