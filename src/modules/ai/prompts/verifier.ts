import { z } from 'zod';

export const PROMPT_VERSION_DOUBLE_SOLVE = '1.0.0';

export const DoubleSolveSchema = z.object({
  solvedAnswer: z.object({
    correctIndex: z.number().int().nonnegative().optional(),
    value: z.union([z.number(), z.string(), z.boolean()]).optional(),
  }),
  stepByStep: z.string(),
  confidence: z.number().min(0).max(1),
});

export type DoubleSolveResult = z.infer<typeof DoubleSolveSchema>;

export function buildDoubleSolvePrompt(req: {
  stem: string;
  type: string;
  options?: string[];
}): string {
  return (
    `Independently solve the following question without seeing any answer key.\n` +
    `Show step-by-step reasoning and determine the final correct answer.\n\n` +
    `QUESTION TYPE: ${req.type}\n` +
    `QUESTION STEM:\n` +
    `<<<UNTRUSTED_STUDY_DATA>>>\n` +
    req.stem +
    (req.options?.length ? `\nOPTIONS:\n${req.options.map((o, i) => `${i}: ${o}`).join('\n')}` : '') +
    `\n<<<END_UNTRUSTED_STUDY_DATA>>>`
  );
}
