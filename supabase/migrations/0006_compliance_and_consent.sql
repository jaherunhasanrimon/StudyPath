-- Migration 0006: Compliance and guardian consent
-- Phase 6 — guardian_consents, cascade cleanup, data retention helpers
-- Strict RLS: default deny, students access only their own records.

-----------------------------------------------------------
-- 1. guardian_consents
-----------------------------------------------------------
CREATE TABLE public.guardian_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'revoked', 'expired')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  consent_version TEXT NOT NULL DEFAULT '1.0',
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.guardian_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own guardian consents"
  ON public.guardian_consents FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own guardian consents"
  ON public.guardian_consents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own guardian consents"
  ON public.guardian_consents FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE INDEX idx_guardian_consents_student ON public.guardian_consents(student_id);
CREATE INDEX idx_guardian_consents_token ON public.guardian_consents(token);
CREATE INDEX idx_guardian_consents_status ON public.guardian_consents(status);

-----------------------------------------------------------
-- 2. Data retention function (30-day AI log purge & token expiry)
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_ai_calls_and_consents()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_ai_count INTEGER := 0;
BEGIN
  -- 30-day retention for ai_calls (compliance requirement)
  DELETE FROM public.ai_calls
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_ai_count = ROW_COUNT;

  -- Mark expired pending guardian consents
  UPDATE public.guardian_consents
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND token_expires_at < NOW();

  RETURN deleted_ai_count;
END;
$$;
