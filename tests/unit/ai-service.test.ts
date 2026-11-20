import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeConfigHash,
  formatStudentAssessment,
  gradeAttempt,
} from '@/modules/ai/service';

// Mock Supabase client
const mockFrom = vi.fn();
vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

describe('ai-service unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeConfigHash', () => {
    it('is deterministic and independent of video array order', () => {
      const hash1 = computeConfigHash({
        videoIds: ['vid_b', 'vid_a'],
        kind: 'quiz',
        count: 5,
        difficulty: 'medium',
        language: 'bn',
      });

      const hash2 = computeConfigHash({
        videoIds: ['vid_a', 'vid_b'],
        kind: 'quiz',
        count: 5,
        difficulty: 'medium',
        language: 'bn',
      });

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(32);
    });

    it('produces different hashes for different configuration parameters', () => {
      const base = {
        videoIds: ['vid_a'],
        kind: 'quiz',
        count: 5,
        difficulty: 'medium',
        language: 'bn',
      };

      const hashBase = computeConfigHash(base);
      const hashDiffLang = computeConfigHash({ ...base, language: 'en' });
      const hashDiffDiff = computeConfigHash({ ...base, difficulty: 'hard' });
      const hashDiffKind = computeConfigHash({ ...base, kind: 'assignment' });

      expect(hashDiffLang).not.toBe(hashBase);
      expect(hashDiffDiff).not.toBe(hashBase);
      expect(hashDiffKind).not.toBe(hashBase);
    });
  });

  describe('formatStudentAssessment', () => {
    it('strictly removes answer keys and sensitive notes from question payloads', () => {
      const mockAssessment = {
        id: 'assess-123',
        kind: 'quiz',
        language: 'bn',
        difficulty: 'medium',
        status: 'published',
      };

      const mockQuestions = [
        {
          id: 'q-1',
          position: 2,
          type: 'mcq',
          stem: 'What is force?',
          options: ['Mass x Acceleration', 'Velocity / Time', 'Energy', 'None'],
          answer: { correctIndex: 0 }, // SENSITIVE
          explanation: 'Newton second law.', // SENSITIVE BEFORE SUBMISSION
          hints: ['Think of F = ma'],
          topic: 'Mechanics',
          timestamp_sec: 120,
          difficulty: 'medium',
          verifier_status: 'double_solve_ok',
          report_count: 0,
        },
        {
          id: 'q-2',
          position: 1,
          type: 'numeric',
          stem: 'Find g on Earth',
          options: [],
          answer: { value: 9.8 }, // SENSITIVE
          explanation: 'Standard gravity value.',
          hints: ['Around 9.8'],
          topic: 'Gravity',
          timestamp_sec: 45,
          difficulty: 'easy',
          verifier_status: 'cas_ok',
          report_count: 0,
        },
      ];

      const result = formatStudentAssessment(mockAssessment, mockQuestions);

      expect(result.id).toBe('assess-123');
      expect(result.questions).toHaveLength(2);

      // Verify sorting by position
      expect(result.questions[0].id).toBe('q-2');
      expect(result.questions[1].id).toBe('q-1');

      // Verify answer key is NOT present in any question
      for (const q of result.questions) {
        expect(q).not.toHaveProperty('answer');
        expect(q).not.toHaveProperty('explanation');
        expect(q.stem).toBeDefined();
        expect(q.hints).toBeDefined();
        expect(q.topic).toBeDefined();
      }
    });

    it('filters out questions with report_count >= 3', () => {
      const mockAssessment = {
        id: 'assess-456',
        kind: 'quiz',
        language: 'en',
        difficulty: 'easy',
        status: 'published',
      };

      const mockQuestions = [
        {
          id: 'q-good',
          position: 1,
          type: 'mcq',
          stem: 'Good Question',
          options: ['A', 'B'],
          answer: { correctIndex: 0 },
          report_count: 2,
        },
        {
          id: 'q-reported',
          position: 2,
          type: 'mcq',
          stem: 'Bad Question',
          options: ['A', 'B'],
          answer: { correctIndex: 1 },
          report_count: 3, // Auto-hidden!
        },
      ];

      const result = formatStudentAssessment(mockAssessment, mockQuestions);
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].id).toBe('q-good');
    });
  });

  describe('gradeAttempt', () => {
    it('evaluates MCQ, numeric, and true/false on the server accurately', async () => {
      const attemptId = 'att-999';
      const userId = 'usr-111';

      const mockAttemptData = {
        id: attemptId,
        user_id: userId,
        plan_item_id: 'plan-item-55',
        assessments: {
          questions: [
            {
              id: 'q-mcq',
              type: 'mcq',
              answer: { correctIndex: 2 },
              explanation: 'Because C is right',
              topic: 'Physics',
              timestamp_sec: 100,
            },
            {
              id: 'q-num',
              type: 'numeric',
              answer: { value: 3.1415 },
              numeric: { tolerance: 0.01 },
              explanation: 'Pi approximation',
              topic: 'Math',
              timestamp_sec: 200,
            },
            {
              id: 'q-tf',
              type: 'true_false',
              answer: { value: true },
              explanation: 'Water boils at 100C',
              topic: 'Chemistry',
              timestamp_sec: 300,
            },
          ],
        },
      };

      // Mock database calls
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockAttemptData, error: null }),
          }),
        }),
      });

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'attempts') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        if (table === 'attempt_answers') {
          return {
            upsert: mockUpsert,
          };
        }
        if (table === 'plan_items') {
          return {
            update: mockUpdate,
          };
        }
        return {};
      });

      const submission = {
        attemptId,
        userId,
        answers: [
          {
            questionId: 'q-mcq',
            response: { selectedIndex: 2 }, // CORRECT
            timeMs: 4500,
          },
          {
            questionId: 'q-num',
            response: { value: 3.14 }, // CORRECT (within 0.01 tolerance)
            timeMs: 6000,
          },
          {
            questionId: 'q-tf',
            response: { value: false }, // INCORRECT
            timeMs: 2000,
          },
        ],
      };

      const result = await gradeAttempt(submission);

      expect(result.attemptId).toBe(attemptId);
      expect(result.score).toBe(20); // 2 out of 3 correct * 10
      expect(result.maxScore).toBe(30);
      expect(result.percentage).toBe(67);
      expect(result.passed).toBe(true); // >= 60%
      expect(result.answers).toHaveLength(3);

      expect(result.answers[0].isCorrect).toBe(true);
      expect(result.answers[0].explanation).toBe('Because C is right');
      expect(result.answers[0].timestampSec).toBe(100);

      expect(result.answers[1].isCorrect).toBe(true);
      expect(result.answers[2].isCorrect).toBe(false);

      // Verify plan_items updated to done
      expect(mockFrom).toHaveBeenCalledWith('plan_items');
      expect(mockFrom).toHaveBeenCalledWith('attempt_answers');
      expect(mockFrom).toHaveBeenCalledWith('attempts');
    });
  });
});
