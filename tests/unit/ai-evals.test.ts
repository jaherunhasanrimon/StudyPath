import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { runEvaluationHarness, generateEvaluationReports } from '@/modules/ai/evals/harness';

describe('AI Evaluation Harness on Golden Playlists', () => {
  it('meets all quality gates: schema pass 100%, grounding >= 90%, survival >= 80%, cost < $0.15/hr', async () => {
    const result = await runEvaluationHarness();

    expect(result.results).toHaveLength(5);
    expect(result.overallSchemaPassRate).toBe(100);
    expect(result.overallGroundingRate).toBeGreaterThanOrEqual(90);
    expect(result.overallSurvivalRate).toBeGreaterThanOrEqual(80);
    expect(result.overallCostPerHour).toBeLessThan(0.15);
  });

  it('generates golden evaluation report and founder manual check checklist', async () => {
    await generateEvaluationReports();

    const reportPath = path.resolve(process.cwd(), 'docs/evals/golden-eval-report.md');
    const manualPath = path.resolve(process.cwd(), 'docs/evals/manual-check.md');

    expect(fs.existsSync(reportPath)).toBe(true);
    expect(fs.existsSync(manualPath)).toBe(true);

    const reportContent = fs.readFileSync(reportPath, 'utf-8');
    expect(reportContent).toContain('100.0%');
    expect(reportContent).toContain('PL-trig-ssc');
    expect(reportContent).toContain('PL-phys-hsc');
  });
});
