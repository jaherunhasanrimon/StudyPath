/**
 * Background Job Queue for AI Generation (architecture.md §8.2, §8.3)
 * Manages asynchronous assessment generation and status polling.
 */
import { createServerSupabaseClient } from '@/lib/supabase';
import { computeConfigHash, getOrGenerateAssessment } from './service';

export interface AssessmentJobPayload {
  videoIds: string[];
  kind: 'quiz' | 'assignment' | 'review' | 'weekly_test';
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: 'bn' | 'en';
  userId?: string;
  planItemId?: string;
  assessmentId?: string;
}

export interface JobRecord {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  payload: AssessmentJobPayload;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

/**
 * Enqueues an assessment generation job with idempotency.
 */
export async function enqueueAssessmentJob(payload: AssessmentJobPayload): Promise<{
  jobId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  alreadyExisted: boolean;
}> {
  const count = payload.count || (payload.kind === 'quiz' ? 5 : 4);
  const difficulty = payload.difficulty || 'medium';
  const language = payload.language || 'bn';
  const configHash = computeConfigHash({
    videoIds: payload.videoIds,
    kind: payload.kind,
    count,
    difficulty,
    language,
  });

  const idempotencyKey = `assess-job-${configHash}`;
  const supabase = await createServerSupabaseClient();

  // Check if job already exists
  const { data: existingJob } = await supabase
    .from('jobs')
    .select('id, status, payload')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingJob) {
    return {
      jobId: existingJob.id,
      status: existingJob.status as 'queued' | 'running' | 'done' | 'failed',
      alreadyExisted: true,
    };
  }

  // Insert new queued job
  const { data: inserted, error } = await supabase
    .from('jobs')
    .insert({
      type: 'generate_assessment',
      payload: { ...payload, configHash },
      status: 'queued',
      attempts: 0,
      idempotency_key: idempotencyKey,
    })
    .select('id, status')
    .single();

  if (error || !inserted) {
    // If a concurrent insert occurred, fetch the existing one
    const { data: retryCheck } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (retryCheck) {
      return {
        jobId: retryCheck.id,
        status: retryCheck.status as 'queued' | 'running' | 'done' | 'failed',
        alreadyExisted: true,
      };
    }

    throw new Error(`Failed to enqueue job: ${error?.message}`);
  }

  return {
    jobId: inserted.id,
    status: inserted.status as 'queued' | 'running' | 'done' | 'failed',
    alreadyExisted: false,
  };
}

/**
 * Gets current job status by ID.
 */
export async function getJobStatus(jobId: string): Promise<{
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  assessmentId?: string;
  error?: string | null;
} | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('jobs')
    .select('id, status, payload, last_error')
    .eq('id', jobId)
    .maybeSingle();

  if (error || !data) return null;

  const payload = data.payload as AssessmentJobPayload | null;
  return {
    id: data.id,
    status: data.status as 'queued' | 'running' | 'done' | 'failed',
    assessmentId: payload?.assessmentId,
    error: data.last_error,
  };
}

/**
 * Processes the next queued job.
 */
export async function processNextJob(): Promise<{
  processed: boolean;
  jobId?: string;
  status?: string;
  assessmentId?: string;
}> {
  const supabase = await createServerSupabaseClient();

  // Find one pending queued job
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'queued')
    .lte('run_after', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!job) {
    return { processed: false };
  }

  // Lock and set status to running
  const { error: lockError } = await supabase
    .from('jobs')
    .update({
      status: 'running',
      locked_at: new Date().toISOString(),
      attempts: (job.attempts || 0) + 1,
    })
    .eq('id', job.id)
    .eq('status', 'queued');

  if (lockError) {
    return { processed: false };
  }

  const payload = job.payload as AssessmentJobPayload;

  try {
    const studentAssessment = await getOrGenerateAssessment(payload);

    await supabase
      .from('jobs')
      .update({
        status: 'done',
        payload: {
          ...payload,
          assessmentId: studentAssessment.id,
        },
        locked_at: null,
      })
      .eq('id', job.id);

    return {
      processed: true,
      jobId: job.id,
      status: 'done',
      assessmentId: studentAssessment.id,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const newAttempts = (job.attempts || 0) + 1;
    const finalStatus = newAttempts >= 3 ? 'failed' : 'queued';

    // If retrying, push run_after back 30 seconds
    const runAfter = new Date(Date.now() + 30_000).toISOString();

    await supabase
      .from('jobs')
      .update({
        status: finalStatus,
        last_error: errorMessage,
        run_after: runAfter,
        locked_at: null,
      })
      .eq('id', job.id);

    return {
      processed: true,
      jobId: job.id,
      status: finalStatus,
    };
  }
}
