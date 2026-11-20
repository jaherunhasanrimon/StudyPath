/**
 * Zod validation schemas for plans API and domain logic.
 */
import { z } from 'zod';
import { PrefsSchema, VideoSchema } from '@/modules/scheduler/schema';

export const CreatePlanSchema = z.object({
  name: z.string().min(1).max(200),
  playlistId: z.string().min(1),
  playlistTitle: z.string().optional(),
  channelTitle: z.string().optional(),
  prefs: PrefsSchema,
  videos: z.array(VideoSchema).min(1),
});

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;

export const PatchPlanItemSchema = z.object({
  action: z.enum(['complete', 'skip', 'move']),
  start_at: z.string().datetime({ offset: true }).optional(),
  end_at: z.string().datetime({ offset: true }).optional(),
});

export type PatchPlanItemInput = z.infer<typeof PatchPlanItemSchema>;

export const WatchProgressSchema = z.object({
  videoId: z.string().min(1),
  planItemId: z.string().uuid().optional().nullable(),
  lastPositionSec: z.number().int().nonnegative(),
  maxPositionSec: z.number().int().nonnegative(),
  durationSec: z.number().int().positive().optional(),
  completed: z.boolean().optional(),
});

export type WatchProgressInput = z.infer<typeof WatchProgressSchema>;

export const ReplanRequestSchema = z.object({
  strategy: z.enum(['shift', 'compress', 'balanced']),
  nowIso: z.string().datetime({ offset: true }).optional(),
  confirm: z.boolean().optional().default(false),
});

export type ReplanRequestInput = z.infer<typeof ReplanRequestSchema>;

export const NoteSchema = z.object({
  videoId: z.string().min(1),
  body: z.string().max(5000),
});

export type NoteInput = z.infer<typeof NoteSchema>;
