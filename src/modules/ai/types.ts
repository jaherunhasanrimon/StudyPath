import { z } from 'zod';

export type AiTask =
  | 'playlist_analysis'
  | 'class_insights'
  | 'assessment'
  | 'plan_explanation'
  | 'coach'
  | 'double_solve';

export interface Usage {
  tokensIn: number;
  tokensOut: number;
  costUsdEst: number;
  latencyMs: number;
}

export type AiErrorCode =
  | 'KILL_SWITCH_ACTIVE'
  | 'QUOTA_EXCEEDED'
  | 'GUARDIAN_CONSENT_REQUIRED'
  | 'TIMEOUT'
  | 'PROVIDER_ERROR'
  | 'SCHEMA_ERROR'
  | 'RATE_LIMITED'
  | 'INVALID_INPUT';

export interface AiError {
  code: AiErrorCode;
  message: string;
  details?: unknown;
}

export type AiResult<T> =
  | { ok: true; data: T; usage: Usage }
  | { ok: false; error: AiError };

export interface AiProvider {
  name: string;
  model: string;
  generate(req: {
    prompt: string;
    schema?: z.ZodType<unknown>;
    videoUrl?: string;
    timeoutMs?: number;
  }): Promise<{ text: string; tokensIn: number; tokensOut: number }>;
}

export interface StructuredRequest<T> {
  task: AiTask;
  schema: z.ZodType<T, z.ZodTypeDef, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  input: unknown;
  videoUrl?: string;
  userId?: string;
  idempotencyKey: string;
  maxCostUsd?: number;
  promptVersion?: string;
}

export interface AiGateway {
  generateStructured<T>(req: StructuredRequest<T>): Promise<AiResult<T>>;
}

export interface AiCallRecord {
  jobId?: string | null;
  userId?: string | null;
  task: AiTask;
  model: string;
  promptVersion: string;
  tokensIn: number;
  tokensOut: number;
  costUsdEst: number;
  latencyMs: number;
  status: 'success' | 'failed' | 'repaired';
  error?: string | null;
}
