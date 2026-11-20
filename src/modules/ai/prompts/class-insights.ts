import { z } from 'zod';

export const PROMPT_VERSION_CLASS_INSIGHTS = '1.0.0';

export const ClassInsightsSchema = z.object({
  videoId: z.string(),
  language: z.enum(['bn', 'en']),
  topics: z.array(
    z.object({
      title: z.string(),
      startSec: z.number().int().nonnegative(),
      endSec: z.number().int().nonnegative(),
    })
  ),
  keyPoints: z.array(z.string()).max(8),
  formulas: z.array(z.string()),
  prerequisites: z.array(z.string()),
  assignmentPrompts: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  caveats: z.array(z.string()),
});

export type ClassInsights = z.infer<typeof ClassInsightsSchema>;

export function buildClassInsightsPrompt(req: {
  videoId: string;
  title: string;
  durationSec: number;
  channelTitle: string;
}): string {
  return (
    `Extract academic insights for secondary school students from this video class.\n` +
    `Channel: ${req.channelTitle}\n` +
    `Video ID: ${req.videoId}\n` +
    `Duration: ${Math.round(req.durationSec / 60)} minutes\n\n` +
    `REQUIREMENTS:\n` +
    `- Break down the class into chronological topics with startSec and endSec timestamps.\n` +
    `- Extract up to 8 core key points (max 25 words each, original phrasing).\n` +
    `- Extract mathematical or scientific formulas in standard LaTeX notation.\n` +
    `- List required prerequisites and homework/assignment practice prompts.\n` +
    `- Total word count must not exceed 250 words.\n\n` +
    `CLASS TITLE:\n` +
    `<<<UNTRUSTED_STUDY_DATA>>>\n` +
    req.title +
    `\n<<<END_UNTRUSTED_STUDY_DATA>>>`
  );
}
