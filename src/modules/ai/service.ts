/**
 * Assessment Domain Service (architecture.md §8.2, §8.3, §9)
 * Handles assessment generation, caching, student question delivery (answer-key stripped), and server grading.
 */
import crypto from 'node:crypto';
import { createServerSupabaseClient } from '@/lib/supabase';
import { DefaultAiGateway } from './gateway';
import { GeminiProvider } from './providers/gemini';
import { FakeAiProvider } from './providers/fake-provider';
import { AiGateway } from './types';
import {
  GeneratedAssessmentSchema,
  buildAssessmentPrompt,
  AssessmentQuestion,
} from './prompts/assessment';
import {
  ClassInsightsSchema,
  buildClassInsightsPrompt,
  ClassInsights,
} from './prompts/class-insights';
import { verifyAssessment } from './verifier';
import { checkNumericEquivalence } from './verifier/mathjs';

let defaultGatewayInstance: AiGateway | null = null;

export function getAiGateway(): AiGateway {
  if (!defaultGatewayInstance) {
    if (process.env.NODE_ENV === 'test' || !process.env.GEMINI_API_KEY) {
      defaultGatewayInstance = new DefaultAiGateway(new FakeAiProvider());
    } else {
      defaultGatewayInstance = new DefaultAiGateway(new GeminiProvider());
    }
  }
  return defaultGatewayInstance;
}

export function setAiGatewayForTest(gateway: AiGateway) {
  defaultGatewayInstance = gateway;
}

export interface StudentQuestion {
  id: string;
  position: number;
  type: string;
  stem: string;
  options: string[];
  hints: string[];
  topic: string;
  timestampSec: number | null;
  difficulty: string;
  verifierStatus: string;
  reportCount: number;
}

export interface StudentAssessment {
  id: string;
  kind: string;
  language: string;
  difficulty: string;
  status: string;
  questions: StudentQuestion[];
}

export interface SubmitAnswerItem {
  questionId: string;
  response: {
    selectedIndex?: number;
    value?: number | string | boolean;
    selfScore?: number;
  };
  timeMs?: number;
  hintsUsed?: number;
}

export interface GradeResult {
  attemptId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  answers: Array<{
    questionId: string;
    isCorrect: boolean;
    correctAnswer: unknown;
    explanation: string;
    timestampSec: number | null;
    topic: string;
  }>;
}

/**
 * Computes deterministic config hash for caching assessments.
 */
export function computeConfigHash(params: {
  videoIds: string[];
  kind: string;
  count: number;
  difficulty: string;
  language: string;
}): string {
  const sortedVideos = [...params.videoIds].sort().join(',');
  const raw = `${sortedVideos}|${params.kind}|${params.count}|${params.difficulty}|${params.language}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

/**
 * Fetches cached assessment or generates a new one.
 */
export async function getOrGenerateAssessment(req: {
  videoIds: string[];
  kind: 'quiz' | 'assignment' | 'review' | 'weekly_test';
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: 'bn' | 'en';
  userId?: string;
  planItemId?: string;
}): Promise<StudentAssessment> {
  const count = req.count || (req.kind === 'quiz' ? 5 : 4);
  const difficulty = req.difficulty || 'medium';
  const language = req.language || 'bn';
  const configHash = computeConfigHash({
    videoIds: req.videoIds,
    kind: req.kind,
    count,
    difficulty,
    language,
  });

  const supabase = await createServerSupabaseClient();

  // 1. Check existing cached assessment
  const { data: cachedAssessment } = await supabase
    .from('assessments')
    .select('*, questions(*)')
    .eq('config_hash', configHash)
    .eq('status', 'published')
    .maybeSingle();

  if (cachedAssessment && cachedAssessment.questions?.length > 0) {
    return formatStudentAssessment(cachedAssessment, cachedAssessment.questions);
  }

  // 2. Fetch or generate insights for covered video IDs
  const insightsList: ClassInsights[] = [];
  const gateway = getAiGateway();

  for (const videoId of req.videoIds) {
    // Check DB cache for video insights
    const { data: cachedInsight } = await supabase
      .from('video_insights')
      .select('*')
      .eq('video_id', videoId)
      .eq('language', language)
      .maybeSingle();

    if (cachedInsight) {
      insightsList.push({
        videoId: cachedInsight.video_id,
        language: cachedInsight.language as 'bn' | 'en',
        topics: cachedInsight.topics as Array<{ title: string; startSec: number; endSec: number }>,
        keyPoints: cachedInsight.key_points as string[],
        formulas: cachedInsight.formulas as string[],
        prerequisites: cachedInsight.prerequisites as string[],
        assignmentPrompts: cachedInsight.assignment_prompts as string[],
        confidence: Number(cachedInsight.confidence),
        caveats: cachedInsight.caveats as string[],
      });
    } else {
      // Generate insights via AiGateway
      const prompt = buildClassInsightsPrompt({
        videoId,
        title: `Lesson for ${videoId}`,
        durationSec: 1800,
        channelTitle: 'Educational Channel',
      });

      const genRes = await gateway.generateStructured({
        task: 'class_insights',
        schema: ClassInsightsSchema,
        input: { prompt, videoId },
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        idempotencyKey: `insights-${videoId}-${language}`,
      });

      if (genRes.ok) {
        insightsList.push(genRes.data);
        // Cache insight in DB
        await supabase.from('video_insights').upsert({
          video_id: videoId,
          language,
          topics: genRes.data.topics,
          key_points: genRes.data.keyPoints,
          formulas: genRes.data.formulas,
          prerequisites: genRes.data.prerequisites,
          assignment_prompts: genRes.data.assignmentPrompts,
          confidence: genRes.data.confidence,
          caveats: genRes.data.caveats,
          model: 'gemini-2.0-flash',
          prompt_version: 1,
        });
      }
    }
  }

  // 3. Generate assessment questions
  const prompt = buildAssessmentPrompt({
    kind: req.kind,
    count,
    difficulty,
    language,
    insights: insightsList.map((ins) => ({
      title: ins.videoId,
      topics: ins.topics,
      keyPoints: ins.keyPoints,
      formulas: ins.formulas,
    })),
  });

  const assessRes = await gateway.generateStructured({
    task: 'assessment',
    schema: GeneratedAssessmentSchema,
    input: { prompt, videoIds: req.videoIds },
    userId: req.userId,
    idempotencyKey: `assess-${configHash}`,
  });

  let rawQuestions: AssessmentQuestion[] = [];
  if (assessRes.ok) {
    rawQuestions = assessRes.data.questions;
  } else {
    // Topic-based fallback questions if generation failed
    rawQuestions = generateTopicFallbackQuestions(req.kind, count, req.videoIds);
  }

  // 4. Run 6-step Verification Pipeline
  const { verifiedQuestions, verifierSummary } = await verifyAssessment(
    rawQuestions,
    insightsList,
    gateway
  );

  // 5. Store assessment and verified questions in DB
  const { data: newAssessment, error: assessError } = await supabase
    .from('assessments')
    .insert({
      kind: req.kind,
      scope: { videoIds: req.videoIds, planItemId: req.planItemId || null },
      config_hash: configHash,
      language,
      difficulty,
      generator: 'ai',
      model: 'gemini-2.0-flash',
      prompt_version: 1,
      status: 'published',
      verifier_summary: verifierSummary,
    })
    .select('*')
    .single();

  if (assessError || !newAssessment) {
    throw new Error(`Failed to save assessment: ${assessError?.message}`);
  }

  const questionsToInsert = verifiedQuestions.map((q, idx) => ({
    assessment_id: newAssessment.id,
    position: idx + 1,
    type: q.type,
    stem: q.stem,
    options: q.options || [],
    answer: q.answer,
    explanation: q.explanation,
    hints: q.hints || [],
    topic: q.topic,
    timestamp_sec: q.timestampSec || null,
    difficulty: q.difficulty || difficulty,
    verifier_status: q.verifierStatus,
    report_count: 0,
  }));

  const { data: savedQuestions } = await supabase
    .from('questions')
    .insert(questionsToInsert)
    .select('*');

  return formatStudentAssessment(newAssessment, savedQuestions || []);
}

/**
 * Strips answer keys and sensitive verifier notes from student response.
 */
export function formatStudentAssessment(
  assessment: Record<string, unknown>,
  questions: Array<Record<string, unknown>>
): StudentAssessment {
  const studentQuestions: StudentQuestion[] = questions
    .filter((q) => Number(q.report_count || 0) < 3)
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((q) => ({
      id: String(q.id),
      position: Number(q.position),
      type: String(q.type),
      stem: String(q.stem),
      options: (q.options as string[]) || [],
      hints: (q.hints as string[]) || [],
      topic: String(q.topic || ''),
      timestampSec: q.timestamp_sec !== null ? Number(q.timestamp_sec) : null,
      difficulty: String(q.difficulty || 'medium'),
      verifierStatus: String(q.verifier_status || 'unverified'),
      reportCount: Number(q.report_count || 0),
    }));

  return {
    id: String(assessment.id),
    kind: String(assessment.kind),
    language: String(assessment.language),
    difficulty: String(assessment.difficulty),
    status: String(assessment.status),
    questions: studentQuestions,
  };
}

/**
 * Gets a published assessment formatted for student (no answers).
 */
export async function getAssessmentForStudent(
  assessmentId: string
): Promise<StudentAssessment | null> {
  const supabase = await createServerSupabaseClient();
  const { data: assessment } = await supabase
    .from('assessments')
    .select('*, questions(*)')
    .eq('id', assessmentId)
    .maybeSingle();

  if (!assessment) return null;
  return formatStudentAssessment(assessment, assessment.questions || []);
}

/**
 * Starts a new student attempt.
 */
export async function startAttempt(req: {
  userId: string;
  assessmentId: string;
  planItemId?: string;
}): Promise<{ attemptId: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('attempts')
    .insert({
      user_id: req.userId,
      assessment_id: req.assessmentId,
      plan_item_id: req.planItemId || null,
      started_at: new Date().toISOString(),
      max_score: 100,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create attempt: ${error?.message}`);
  }

  return { attemptId: data.id };
}

/**
 * Grades a student attempt on the server.
 * Evaluates MCQ, numeric, short answer, and true/false against server answers.
 */
export async function gradeAttempt(req: {
  attemptId: string;
  userId: string;
  answers: SubmitAnswerItem[];
}): Promise<GradeResult> {
  const supabase = await createServerSupabaseClient();

  // 1. Fetch attempt and associated questions with answers
  const { data: attempt } = await supabase
    .from('attempts')
    .select('*, assessments(*, questions(*))')
    .eq('id', req.attemptId)
    .eq('user_id', req.userId)
    .single();

  if (!attempt) {
    throw new Error('Attempt not found or unauthorized.');
  }

  const rawQuestions = attempt.assessments?.questions || [];
  const questionMap = new Map<string, Record<string, unknown>>();
  for (const q of rawQuestions) {
    questionMap.set(String(q.id), q);
  }

  let totalScore = 0;
  const maxScore = rawQuestions.length * 10;
  const gradedAnswers: GradeResult['answers'] = [];
  const attemptAnswersToInsert = [];

  for (const ans of req.answers) {
    const q = questionMap.get(ans.questionId);
    if (!q) continue;

    let isCorrect = false;
    const qAnswer = q.answer as { correctIndex?: number; value?: unknown };
    const qType = String(q.type);

    if (qType === 'mcq') {
      if (ans.response.selectedIndex !== undefined && qAnswer.correctIndex !== undefined) {
        isCorrect = ans.response.selectedIndex === qAnswer.correctIndex;
      }
    } else if (qType === 'numeric') {
      const actualVal = Number(ans.response.value);
      const expectedVal = Number(qAnswer.value);
      const tolerance = Number((q.numeric as { tolerance?: number })?.tolerance || 0.01);
      isCorrect = checkNumericEquivalence(expectedVal, actualVal, tolerance);
    } else if (qType === 'true_false') {
      isCorrect = Boolean(ans.response.value) === Boolean(qAnswer.value);
    } else if (qType === 'problem' || qType === 'short') {
      // For assignment problems in MVP: self-score or normalized match
      if (ans.response.selfScore !== undefined) {
        isCorrect = ans.response.selfScore > 0;
      } else {
        isCorrect = String(ans.response.value || '').trim().toLowerCase() === String(qAnswer.value || '').trim().toLowerCase();
      }
    }

    if (isCorrect) {
      totalScore += 10;
    }

    gradedAnswers.push({
      questionId: ans.questionId,
      isCorrect,
      correctAnswer: q.answer,
      explanation: String(q.explanation || ''),
      timestampSec: q.timestamp_sec !== null ? Number(q.timestamp_sec) : null,
      topic: String(q.topic || ''),
    });

    attemptAnswersToInsert.push({
      attempt_id: req.attemptId,
      question_id: ans.questionId,
      response: ans.response,
      is_correct: isCorrect,
      time_ms: ans.timeMs || 0,
      hints_used: ans.hintsUsed || 0,
    });
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passed = percentage >= 60;

  // Save attempt answers
  if (attemptAnswersToInsert.length > 0) {
    await supabase.from('attempt_answers').upsert(attemptAnswersToInsert);
  }

  // Update attempt score and submission time
  await supabase
    .from('attempts')
    .update({
      score: totalScore,
      max_score: maxScore,
      submitted_at: new Date().toISOString(),
      details: { percentage, passed },
    })
    .eq('id', req.attemptId);

  // If passed or submitted, mark plan_item done
  if (attempt.plan_item_id) {
    await supabase
      .from('plan_items')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
      })
      .eq('id', attempt.plan_item_id);
  }

  return {
    attemptId: req.attemptId,
    score: totalScore,
    maxScore,
    percentage,
    passed,
    answers: gradedAnswers,
  };
}

/**
 * Fallback question generator when AI model call fails.
 */
function generateTopicFallbackQuestions(
  kind: string,
  count: number,
  videoIds: string[]
): AssessmentQuestion[] {
  const result: AssessmentQuestion[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      type: 'mcq',
      stem: `Topic Review Question ${i + 1} for ${videoIds[0] || 'Lesson'}: Review key definitions.`,
      options: ['Option A: Correct principle', 'Option B: Incorrect statement', 'Option C: Secondary detail', 'Option D: None of these'],
      answer: { correctIndex: 0 },
      explanation: 'Refer back to the key definitions presented during the lecture.',
      hints: ['Review the initial 5 minutes of class.'],
      topic: 'Lecture Overview',
      difficulty: 'medium',
    });
  }
  return result;
}
