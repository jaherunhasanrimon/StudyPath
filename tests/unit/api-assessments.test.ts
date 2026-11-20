import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as handleRequestAssessment } from '@/app/api/assessments/request/route';
import { GET as handleGetAssessment } from '@/app/api/assessments/[id]/route';
import { POST as handleStartAttempt } from '@/app/api/attempts/route';
import { POST as handleSubmitAttempt } from '@/app/api/attempts/[id]/submit/route';
import { POST as handleReport } from '@/app/api/reports/route';

// Mock Supabase
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// Mock modules/ai/service and queue
vi.mock('@/modules/ai/service', () => ({
  computeConfigHash: vi.fn(() => 'hash1234567890123456789012345678'),
  formatStudentAssessment: vi.fn((_assess, questions) => ({
    id: 'assess-1',
    kind: 'quiz',
    language: 'bn',
    difficulty: 'medium',
    status: 'published',
    questions: questions.map((q: Record<string, unknown>) => ({
      id: q.id,
      stem: q.stem,
      options: q.options || [],
      // Notice: answer is deliberately stripped
    })),
  })),
  getAssessmentForStudent: vi.fn(async (id: string) => {
    if (id === 'non-existent') return null;
    return {
      id,
      kind: 'quiz',
      language: 'bn',
      difficulty: 'medium',
      status: 'published',
      questions: [
        { id: 'q-1', position: 1, stem: 'What is v?', options: ['a', 'b'] },
      ],
    };
  }),
  startAttempt: vi.fn(async () => ({ attemptId: 'att-123' })),
  gradeAttempt: vi.fn(async () => ({
    attemptId: 'att-123',
    score: 10,
    maxScore: 10,
    percentage: 100,
    passed: true,
    answers: [],
  })),
  getOrGenerateAssessment: vi.fn(async () => ({
    id: 'assess-generated',
    kind: 'quiz',
    language: 'bn',
    difficulty: 'medium',
    status: 'published',
    questions: [],
  })),
}));

vi.mock('@/modules/ai/queue', () => ({
  enqueueAssessmentJob: vi.fn(async () => ({
    jobId: 'job-999',
    status: 'queued',
    alreadyExisted: false,
  })),
  getJobStatus: vi.fn(async (id: string) => ({
    id,
    status: 'done',
    assessmentId: 'assess-1',
  })),
}));

describe('Assessments & Attempts API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc', email: 'test@example.com' } },
      error: null,
    });
  });

  describe('POST /api/assessments/request', () => {
    it('returns 400 on invalid request body', async () => {
      const req = new NextRequest('http://localhost:3000/api/assessments/request', {
        method: 'POST',
        body: JSON.stringify({ videoIds: [] }), // Empty videoIds invalid
      });

      const res = await handleRequestAssessment(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('BAD_REQUEST');
    });

    it('returns 200 with student-safe assessment if cached', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'assess-1',
                  config_hash: 'hash1234567890123456789012345678',
                  questions: [{ id: 'q-1', stem: 'Stem 1', answer: 'SECRET' }],
                },
              }),
            }),
          }),
        }),
      });

      const req = new NextRequest('http://localhost:3000/api/assessments/request', {
        method: 'POST',
        body: JSON.stringify({
          videoIds: ['vid_1'],
          kind: 'quiz',
        }),
      });

      const res = await handleRequestAssessment(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ready');
      expect(json.assessment.questions[0]).not.toHaveProperty('answer');
    });
  });

  describe('GET /api/assessments/[id]', () => {
    it('returns 404 for non-existent assessment', async () => {
      const req = new NextRequest('http://localhost:3000/api/assessments/non-existent');
      const res = await handleGetAssessment(req, {
        params: Promise.resolve({ id: 'non-existent' }),
      });
      expect(res.status).toBe(404);
    });

    it('returns 200 with student assessment', async () => {
      const req = new NextRequest('http://localhost:3000/api/assessments/assess-1');
      const res = await handleGetAssessment(req, {
        params: Promise.resolve({ id: 'assess-1' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.assessment.id).toBe('assess-1');
    });
  });

  describe('POST /api/attempts', () => {
    it('returns 401 if user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Unauthorized') });

      const req = new NextRequest('http://localhost:3000/api/attempts', {
        method: 'POST',
        body: JSON.stringify({ assessmentId: '987fcdeb-51a2-43d7-9876-ba9876543210' }),
      });

      const res = await handleStartAttempt(req);
      expect(res.status).toBe(401);
    });

    it('starts attempt and returns 201 with attemptId', async () => {
      const req = new NextRequest('http://localhost:3000/api/attempts', {
        method: 'POST',
        body: JSON.stringify({ assessmentId: '987fcdeb-51a2-43d7-9876-ba9876543210' }),
      });

      const res = await handleStartAttempt(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.attemptId).toBe('att-123');
    });
  });

  describe('POST /api/attempts/[id]/submit', () => {
    it('grades attempt on server and returns results', async () => {
      const req = new NextRequest('http://localhost:3000/api/attempts/att-123/submit', {
        method: 'POST',
        body: JSON.stringify({
          answers: [
            {
              questionId: '987fcdeb-51a2-43d7-9876-ba9876543210',
              response: { selectedIndex: 1 },
              timeMs: 3200,
            },
          ],
        }),
      });

      const res = await handleSubmitAttempt(req, {
        params: Promise.resolve({ id: 'att-123' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.passed).toBe(true);
      expect(json.score).toBe(10);
    });
  });

  describe('POST /api/reports', () => {
    it('records question issue report and increments report_count', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'reports') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'questions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { report_count: 1 },
                  error: null,
                }),
              }),
            }),
            update: mockUpdate,
          };
        }
        return {};
      });

      const req = new NextRequest('http://localhost:3000/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          questionId: '987fcdeb-51a2-43d7-9876-ba9876543210',
          reason: 'incorrect_answer',
          details: 'Option 2 is actually correct.',
        }),
      });

      const res = await handleReport(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('reports');
      expect(mockFrom).toHaveBeenCalledWith('questions');
    });
  });
});
