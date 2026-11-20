import { z } from 'zod';

export const PROMPT_VERSION_PLAYLIST_ANALYSIS = '1.0.0';

export const PlaylistAnalysisSchema = z.object({
  language: z.enum(['bn', 'en', 'mixed']),
  subjectGuess: z.string(),
  levelGuess: z.string(),
  isSequential: z.boolean(),
  groups: z.array(
    z.object({
      title: z.string(),
      videoIndexes: z.array(z.number()),
      confidence: z.number().min(0).max(1),
    })
  ),
  flags: z.array(
    z.object({
      videoIndex: z.number(),
      type: z.enum(['promo', 'intro', 'non_lecture', 'duplicate']),
      note: z.string(),
    })
  ),
  difficulty: z.enum(['intro', 'intermediate', 'advanced']),
  summary: z.string(),
});

export type PlaylistAnalysis = z.infer<typeof PlaylistAnalysisSchema>;

export function buildPlaylistAnalysisPrompt(
  videos: Array<{ title: string; durationSec: number; descriptionSnippet?: string }>,
  channelTitle: string
): string {
  return (
    `Analyze this playlist metadata for secondary school students in Bangladesh.\n` +
    `Channel: ${channelTitle}\n\n` +
    `TASK:\n` +
    `- Guess academic subject (e.g. Higher Math, Physics, Chemistry, Biology, ICT, General Math).\n` +
    `- Guess academic level (SSC, HSC, Admission, General).\n` +
    `- Check if order is sequential based on numbering in titles.\n` +
    `- Detect groups/chapters.\n` +
    `- Flag non-lecture/promo/intro videos.\n` +
    `- Provide a summary under 60 words.\n\n` +
    `VIDEOS:\n` +
    `<<<UNTRUSTED_STUDY_DATA>>>\n` +
    JSON.stringify(videos, null, 2) +
    `\n<<<END_UNTRUSTED_STUDY_DATA>>>`
  );
}
