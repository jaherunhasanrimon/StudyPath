-- Migration 0004: Assessments and questions tables
-- Phase 4 — video_insights, assessments, questions, attempts, attempt_answers, reports
-- Strict RLS: default deny, answer keys never exposed to client.

-----------------------------------------------------------
-- 1. video_insights
-----------------------------------------------------------
CREATE TABLE public.video_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'bn',
  topics JSONB NOT NULL DEFAULT '[]',
  key_points JSONB NOT NULL DEFAULT '[]',
  formulas JSONB NOT NULL DEFAULT '[]',
  prerequisites JSONB NOT NULL DEFAULT '[]',
  assignment_prompts JSONB NOT NULL DEFAULT '[]',
  confidence NUMERIC NOT NULL DEFAULT 0.0,
  caveats JSONB NOT NULL DEFAULT '[]',
  prompt_version INTEGER NOT NULL DEFAULT 1,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_video_insights UNIQUE (video_id, language, prompt_version)
);

ALTER TABLE public.video_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read video_insights"
  ON public.video_insights FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE INDEX idx_video_insights_lookup ON public.video_insights (video_id, language);

-----------------------------------------------------------
-- 2. assessments
-----------------------------------------------------------
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('quiz', 'assignment', 'review', 'weekly_test')),
  scope JSONB NOT NULL,
  config_hash TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'bn',
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  generator TEXT NOT NULL DEFAULT 'ai' CHECK (generator IN ('ai', 'human', 'template')),
  model TEXT NOT NULL,
  prompt_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden', 'rejected')),
  verifier_summary JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read published assessments"
  ON public.assessments FOR SELECT
  TO authenticated
  USING (status = 'published');

CREATE INDEX idx_assessments_hash ON public.assessments (config_hash);

-----------------------------------------------------------
-- 3. questions
-----------------------------------------------------------
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'numeric', 'short', 'true_false', 'problem')),
  stem TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  answer JSONB NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  hints JSONB NOT NULL DEFAULT '[]',
  topic TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  timestamp_sec INTEGER,
  verifier_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verifier_status IN ('unverified', 'double_solve_ok', 'cas_ok', 'human_ok', 'failed')),
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read questions of published assessments"
  ON public.questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = questions.assessment_id AND a.status = 'published'
    )
    AND report_count < 3
  );

CREATE INDEX idx_questions_assessment_pos ON public.questions (assessment_id, position);

-----------------------------------------------------------
-- 4. attempts
-----------------------------------------------------------
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  plan_item_id UUID REFERENCES public.plan_items(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC,
  max_score NUMERIC NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own attempts"
  ON public.attempts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_attempts_user ON public.attempts (user_id);
CREATE INDEX idx_attempts_plan_item ON public.attempts (plan_item_id);

-----------------------------------------------------------
-- 5. attempt_answers
-----------------------------------------------------------
CREATE TABLE public.attempt_answers (
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  response JSONB NOT NULL,
  is_correct BOOLEAN,
  time_ms INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (attempt_id, question_id)
);

ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage attempt_answers for their attempts"
  ON public.attempt_answers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attempts a
      WHERE a.id = attempt_answers.attempt_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attempts a
      WHERE a.id = attempt_answers.attempt_id AND a.user_id = auth.uid()
    )
  );

-----------------------------------------------------------
-- 6. reports
-----------------------------------------------------------
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('question', 'video', 'plan')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create and view their own reports"
  ON public.reports FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_reports_user ON public.reports (user_id);
CREATE INDEX idx_reports_target ON public.reports (target_type, target_id);
