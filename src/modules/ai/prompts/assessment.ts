import { z } from 'zod';

export const PROMPT_VERSION_ASSESSMENT = '1.0.0';

export const AssessmentQuestionSchema = z.object({
  type: z.enum(['mcq', 'numeric', 'short', 'true_false', 'problem']),
  stem: z.string().min(5),
  options: z.array(z.string()).default([]),
  answer: z.object({
    correctIndex: z.number().int().nonnegative().optional(),
    value: z.union([z.number(), z.string(), z.boolean()]).optional(),
  }),
  explanation: z.string(),
  hints: z.array(z.string()).max(3).default([]),
  topic: z.string(),
  timestampSec: z.number().int().nonnegative().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  numeric: z
    .object({
      tolerance: z.number().default(0.01),
      unit: z.string().default(''),
    })
    .optional(),
});

export const GeneratedAssessmentSchema = z.object({
  questions: z.array(AssessmentQuestionSchema),
});

export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;
export type GeneratedAssessment = z.infer<typeof GeneratedAssessmentSchema>;

export function buildAssessmentPrompt(req: {
  kind: 'quiz' | 'assignment' | 'review' | 'weekly_test';
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
  language: 'bn' | 'en';
  insights: Array<{
    title: string;
    topics: Array<{ title: string; startSec: number; endSec: number }>;
    keyPoints: string[];
    formulas: string[];
  }>;
}): string {
  return (
    `Generate an assessment of ${req.count} questions for a student in Bangladesh.\n` +
    `Kind: ${req.kind}\n` +
    `Difficulty: ${req.difficulty}\n` +
    `Language: ${req.language === 'bn' ? 'Bangla' : 'English'}\n\n` +
    `RULES:\n` +
    `- Mix MCQ, Numeric, and True/False questions (and 1 problem solving if assignment).\n` +
    `- Every question MUST cite a topic and timestampSec from the class insights.\n` +
    `- Mathematical formulas MUST use LaTeX formatting (e.g. \\(x^2 + y^2\\)).\n` +
    `- MCQ questions MUST provide exactly 4 distinct options with correctIndex (0 to 3).\n` +
    `- Numeric questions MUST include tolerance.\n` +
    `- Provide 2-3 progressive hints (nudge, hint, formula hint).\n` +
    `- Explanations must be thorough and educational.\n\n` +
    `CLASS INSIGHTS:\n` +
    `<<<UNTRUSTED_STUDY_DATA>>>\n` +
    JSON.stringify(req.insights, null, 2) +
    `\n<<<END_UNTRUSTED_STUDY_DATA>>>`
  );
}
