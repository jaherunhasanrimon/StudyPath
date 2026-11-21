/**
 * Admin Console & Moderation Types (architecture.md §8 & phases.md §1 Phase 7)
 */

export interface QuestionReviewItem {
  id: string;
  assessment_id: string;
  position: number;
  type: 'mcq' | 'numeric' | 'short' | 'true_false' | 'problem';
  stem: string;
  options: unknown;
  answer: unknown;
  explanation: string;
  hints: unknown;
  topic: string;
  difficulty: string;
  verifier_status: 'unverified' | 'double_solve_ok' | 'cas_ok' | 'human_ok' | 'failed';
  report_count: number;
  is_hidden: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface QuestionUpdatePayload {
  is_hidden?: boolean;
  verifier_status?: 'human_ok' | 'failed' | 'unverified';
  stem?: string;
  options?: unknown;
  answer?: unknown;
  explanation?: string;
}

export interface CreatorOptOut {
  id: string;
  channel_id: string;
  channel_title: string;
  contact_email: string | null;
  reason: string | null;
  status: 'active' | 'revoked';
  created_at: string;
  updated_at: string;
}

export interface CreatorOptOutInput {
  channel_id: string;
  channel_title: string;
  contact_email?: string;
  reason?: string;
}

export interface FeedbackItem {
  id: string;
  user_id: string | null;
  category: 'bug' | 'question_error' | 'suggestion' | 'praise';
  message: string;
  metadata: Record<string, unknown>;
  status: 'new' | 'investigating' | 'resolved' | 'closed';
  created_at: string;
}

export interface FeedbackInput {
  category: 'bug' | 'question_error' | 'suggestion' | 'praise';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface PilotCohortMetrics {
  totalStudents: number;
  activeStudents: number;
  retention: {
    week1Rate: number;
    week4Rate: number;
    week8Rate: number;
  };
  overallAdherenceRate: number;
  quizAttemptRate: number;
  totalAiCostUsd: number;
  costPerActiveStudentUsd: number;
  calculatedAt: string;
}
