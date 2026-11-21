-- Migration 0007: Pilot readiness
-- Phase 7 — Admin console, question moderation, creator opt-outs, feedback widget, admin RLS
-- Strict RLS: default deny, admins have role-based management privileges.

-----------------------------------------------------------
-- 1. Question moderation columns on public.questions
-----------------------------------------------------------
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questions_hidden_report
  ON public.questions (is_hidden, report_count);

-- Drop and recreate public select policy to ensure hidden questions are excluded
DROP POLICY IF EXISTS "Authenticated users can read questions of published assessments" ON public.questions;

CREATE POLICY "Authenticated users can read questions of published assessments"
  ON public.questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = questions.assessment_id AND a.status = 'published'
    )
    AND is_hidden = FALSE
    AND report_count < 3
  );

-----------------------------------------------------------
-- 2. creator_opt_outs table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL UNIQUE,
  channel_title TEXT NOT NULL,
  contact_email TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.creator_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active creator opt-outs"
  ON public.creator_opt_outs FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE INDEX IF NOT EXISTS idx_creator_opt_outs_channel
  ON public.creator_opt_outs (channel_id);

-----------------------------------------------------------
-- 3. feedback table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'question_error', 'suggestion', 'praise')),
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own feedback"
  ON public.feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own feedback"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback (status);

-----------------------------------------------------------
-- 4. Admin Role RLS Helper & Policies
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = check_user_id AND p.role = 'admin'
  );
$$;

-- Admin privileges for questions moderation
CREATE POLICY "Admins can manage all questions"
  ON public.questions FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Admin privileges for creator opt-outs
CREATE POLICY "Admins can manage creator opt-outs"
  ON public.creator_opt_outs FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Admin privileges for feedback management
CREATE POLICY "Admins can manage all feedback"
  ON public.feedback FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Admin privileges for user reports
CREATE POLICY "Admins can view and manage all reports"
  ON public.reports FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-----------------------------------------------------------
-- 5. Seed default admin role for rimonhassan013@gmail.com
-----------------------------------------------------------
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'rimonhassan013@gmail.com'
);
