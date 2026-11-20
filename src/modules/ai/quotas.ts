/**
 * Quotas & Daily Budget Kill-Switch (architecture.md §8.4)
 * Protects users and founder from unexpected costs.
 */
import { DateTime } from 'luxon';
import { createServerSupabaseClient } from '@/lib/supabase';
import { APP_CONFIG } from '@/lib/config';
import { AiCallRecord } from './types';

// Gemini 2.0 Flash pricing estimate (per 1M tokens)
const INPUT_PRICE_PER_M = 0.10; // $0.10 / 1M tokens
const OUTPUT_PRICE_PER_M = 0.40; // $0.40 / 1M tokens

/**
 * Calculates estimated cost for an AI call in USD.
 */
export function estimateCostUsd(tokensIn: number, tokensOut: number): number {
  const inCost = (tokensIn / 1_000_000) * INPUT_PRICE_PER_M;
  const outCost = (tokensOut / 1_000_000) * OUTPUT_PRICE_PER_M;
  return Number((inCost + outCost).toFixed(6));
}

/**
 * Checks if a student has exceeded their monthly generation quota.
 */
export async function checkUserQuota(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const supabase = await createServerSupabaseClient();
    const period = DateTime.now().setZone('Asia/Dhaka').toFormat('yyyy-MM');

    const { data } = await supabase
      .from('usage_counters')
      .select('ai_generations')
      .eq('user_id', userId)
      .eq('period', period)
      .maybeSingle();

    const used = data?.ai_generations ?? 0;
    const remaining = Math.max(0, APP_CONFIG.FREE_AI_GENERATIONS_PER_MONTH - used);

    return {
      allowed: used < APP_CONFIG.FREE_AI_GENERATIONS_PER_MONTH,
      remaining,
    };
  } catch (err) {
    console.error('Error checking user quota:', err);
    // Graceful fallback: allow if DB is inaccessible in local/test
    return { allowed: true, remaining: APP_CONFIG.FREE_AI_GENERATIONS_PER_MONTH };
  }
}

/**
 * Increments student's monthly generation counter.
 */
export async function incrementUserQuota(userId: string): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    const period = DateTime.now().setZone('Asia/Dhaka').toFormat('yyyy-MM');

    const { data } = await supabase
      .from('usage_counters')
      .select('ai_generations')
      .eq('user_id', userId)
      .eq('period', period)
      .maybeSingle();

    const currentCount = data?.ai_generations ?? 0;

    await supabase.from('usage_counters').upsert({
      user_id: userId,
      period,
      ai_generations: currentCount + 1,
    });
  } catch (err) {
    console.error('Failed to increment user quota:', err);
  }
}

/**
 * Evaluates the global daily budget kill-switch.
 * When daily spend exceeds budget, returns allowed: false.
 */
export async function checkDailyKillSwitch(
  budgetUsd: number = APP_CONFIG.AI_DAILY_BUDGET_USD
): Promise<{ allowed: boolean; todaySpendUsd: number }> {
  try {
    const supabase = await createServerSupabaseClient();
    const startOfDayUtc = DateTime.now()
      .setZone('Asia/Dhaka')
      .startOf('day')
      .toUTC()
      .toISO();

    const { data } = await supabase
      .from('ai_calls')
      .select('cost_usd_est')
      .gte('created_at', startOfDayUtc);

    const todaySpendUsd = (data || []).reduce(
      (sum, row) => sum + Number(row.cost_usd_est || 0),
      0
    );

    return {
      allowed: todaySpendUsd < budgetUsd,
      todaySpendUsd: Number(todaySpendUsd.toFixed(4)),
    };
  } catch (err) {
    console.error('Error checking daily kill switch:', err);
    return { allowed: true, todaySpendUsd: 0 };
  }
}

/**
 * Persists an AI call audit log row into `ai_calls`.
 */
export async function logAiCall(record: AiCallRecord): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from('ai_calls').insert({
      job_id: record.jobId || null,
      user_id: record.userId || null,
      task: record.task,
      model: record.model,
      prompt_version: record.promptVersion,
      tokens_in: record.tokensIn,
      tokens_out: record.tokensOut,
      cost_usd_est: record.costUsdEst,
      latency_ms: record.latencyMs,
      status: record.status,
      error: record.error || null,
    });
  } catch (err) {
    console.error('Failed to log AI call audit record:', err);
  }
}
