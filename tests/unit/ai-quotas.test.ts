import { describe, it, expect } from 'vitest';
import { estimateCostUsd } from '@/modules/ai/quotas';

describe('AI Quotas & Cost Estimation', () => {
  it('correctly calculates estimated USD costs from token counts', () => {
    // 100,000 in, 10,000 out with $0.10/M in, $0.40/M out
    // in: (100k / 1M) * 0.10 = 0.010
    // out: (10k / 1M) * 0.40 = 0.004
    // total = 0.014
    const cost = estimateCostUsd(100_000, 10_000);
    expect(cost).toBe(0.014);
  });

  it('keeps 1-hour low-resolution video analysis well under $0.15 target', () => {
    // A 1-hour class at low resolution is ~360,000 input tokens and ~2,000 output tokens
    const cost = estimateCostUsd(360_000, 2_000);
    expect(cost).toBeLessThan(0.05); // Far below $0.15 guardrail
  });
});
