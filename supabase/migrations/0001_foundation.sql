-- Migration 0001: Foundation tables
-- Phase 0 — profiles, usage_counters, jobs, ai_calls, events, audit_logs
-- RLS on with default deny and explicit policies.

-- Enable RLS on all tables by default.
-- Each table gets: ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
-- with no permissive policies = default deny.

-----------------------------------------------------------
-- profiles
-----------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  locale TEXT NOT NULL DEFAULT 'bn' CHECK (locale IN ('bn', 'en')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  birth_year INTEGER,
  is_minor BOOLEAN GENERATED ALWAYS AS (
    CASE
      WHEN birth_year IS NULL THEN NULL
      WHEN (EXTRACT(YEAR FROM NOW()) - birth_year) < 18 THEN TRUE
      ELSE FALSE
    END
  ) STORED,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'guardian', 'teacher', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, locale)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'locale', 'bn')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-----------------------------------------------------------
-- usage_counters
-----------------------------------------------------------
CREATE TABLE public.usage_counters (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- 'YYYY-MM'
  ai_generations INTEGER NOT NULL DEFAULT 0,
  imports INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period)
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage"
  ON public.usage_counters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON public.usage_counters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON public.usage_counters FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-----------------------------------------------------------
-- jobs
-----------------------------------------------------------
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Jobs are managed by the service role only (no user policies = default deny for users)

-----------------------------------------------------------
-- ai_calls
-----------------------------------------------------------
CREATE TABLE public.ai_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id),
  user_id UUID REFERENCES auth.users(id),
  task TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd_est NUMERIC(10, 6),
  latency_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_calls ENABLE ROW LEVEL SECURITY;

-- AI calls are managed by the service role only (default deny for users)

-----------------------------------------------------------
-- events (pseudonymous analytics, no personal data)
-----------------------------------------------------------
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_pid TEXT, -- pseudonymous, NOT the real user id
  name TEXT NOT NULL,
  props JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Events are write-only by authenticated users, read by admin/service role
CREATE POLICY "Authenticated users can insert events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-----------------------------------------------------------
-- audit_logs
-----------------------------------------------------------
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs are managed by the service role only (default deny for users)
