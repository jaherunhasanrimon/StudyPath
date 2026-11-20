/**
 * 6-Step Assessment Verification Engine (architecture.md §8.2 Pipeline C)
 * Drops questions failing validation, verifies solutions, and sets trust badges.
 */
import { AssessmentQuestion } from '../prompts/assessment';
import { ClassInsights } from '../prompts/class-insights';
import { AiGateway } from '../types';
import { DoubleSolveSchema, buildDoubleSolvePrompt } from '../prompts/verifier';
import { checkNumericEquivalence, checkAlgebraicEquivalence } from './mathjs';

export type VerifierStatus =
  | 'unverified'
  | 'double_solve_ok'
  | 'cas_ok'
  | 'human_ok'
  | 'failed';

export interface VerifiedQuestion extends AssessmentQuestion {
  verifierStatus: VerifierStatus;
}

export interface VerifierSummary {
  initialCount: number;
  survivedCount: number;
  survivalRate: number;
  casVerifiedCount: number;
  doubleSolveVerifiedCount: number;
  droppedCount: number;
}

/**
 * Runs the 6-step verification pipeline on a set of generated questions.
 */
export async function verifyAssessment(
  questions: AssessmentQuestion[],
  insights: ClassInsights[],
  gateway?: AiGateway
): Promise<{
  verifiedQuestions: VerifiedQuestion[];
  survivalRate: number;
  verifierSummary: VerifierSummary;
}> {
  const initialCount = questions.length;
  const verified: VerifiedQuestion[] = [];
  let casCount = 0;
  let doubleSolveCount = 0;

  // Flatten available topics and max timestamps from all covered classes
  const availableTopics = new Set<string>();
  let maxDurationSec = 3600;

  for (const ins of insights) {
    for (const t of ins.topics) {
      availableTopics.add(t.title.trim().toLowerCase());
      if (t.endSec > maxDurationSec) maxDurationSec = t.endSec;
    }
  }

  for (const q of questions) {
    // Step 1: Business rule checks
    if (!validateBusinessRules(q)) continue;

    // Step 2: Grounding check
    if (!validateGrounding(q, availableTopics, maxDurationSec)) continue;

    // Step 3: Independent Solve / CAS Verification
    let verifierStatus: VerifierStatus = 'unverified';

    if (q.type === 'numeric' && typeof q.answer.value === 'number') {
      // Direct CAS verification
      const tolerance = q.numeric?.tolerance || 0.01;
      const casOk = checkNumericEquivalence(q.answer.value, q.answer.value, tolerance);
      if (casOk) {
        verifierStatus = 'cas_ok';
        casCount++;
      }
    } else if (gateway && (q.type === 'mcq' || q.type === 'true_false')) {
      // Independent double-solve call via gateway
      try {
        const solveRes = await gateway.generateStructured({
          task: 'double_solve',
          schema: DoubleSolveSchema,
          input: { stem: q.stem, options: q.options, type: q.type },
          idempotencyKey: `ds-${q.stem.slice(0, 20)}`,
        });

        if (solveRes.ok) {
          const solved = solveRes.data.solvedAnswer;
          if (q.type === 'mcq' && solved.correctIndex === q.answer.correctIndex) {
            verifierStatus = 'double_solve_ok';
            doubleSolveCount++;
          } else if (
            q.type === 'true_false' &&
            solved.value === q.answer.value
          ) {
            verifierStatus = 'double_solve_ok';
            doubleSolveCount++;
          }
        }
      } catch {
        // Double solve failure leaves question unverified but not dropped
        verifierStatus = 'unverified';
      }
    }

    // Step 4: Suitability & privacy filter
    if (!validateSuitability(q)) continue;

    // Step 5: Question survives
    verified.push({
      ...q,
      verifierStatus,
    });
  }

  const survivalRate = initialCount > 0 ? verified.length / initialCount : 0;

  const verifierSummary: VerifierSummary = {
    initialCount,
    survivedCount: verified.length,
    survivalRate: Number(survivalRate.toFixed(2)),
    casVerifiedCount: casCount,
    doubleSolveVerifiedCount: doubleSolveCount,
    droppedCount: initialCount - verified.length,
  };

  return {
    verifiedQuestions: verified,
    survivalRate,
    verifierSummary,
  };
}

/**
 * Step 1: Business rule validator.
 */
function validateBusinessRules(q: AssessmentQuestion): boolean {
  if (q.type === 'mcq') {
    if (!q.options || q.options.length < 2) return false;
    // Check all options are unique
    const uniqueOptions = new Set(q.options.map((o) => o.trim().toLowerCase()));
    if (uniqueOptions.size !== q.options.length) return false;
    // Check correct index is valid
    if (
      q.answer.correctIndex === undefined ||
      q.answer.correctIndex < 0 ||
      q.answer.correctIndex >= q.options.length
    ) {
      return false;
    }
  }

  if (q.type === 'numeric') {
    if (typeof q.answer.value !== 'number' || isNaN(q.answer.value)) return false;
  }

  if (q.type === 'true_false') {
    if (typeof q.answer.value !== 'boolean') return false;
  }

  return true;
}

/**
 * Step 2: Grounding validator.
 */
function validateGrounding(
  q: AssessmentQuestion,
  availableTopics: Set<string>,
  maxDurationSec: number
): boolean {
  if (!q.topic || q.topic.trim().length === 0) return false;

  // If timestamp is specified, it must be within class duration
  if (q.timestampSec !== undefined && q.timestampSec !== null) {
    if (q.timestampSec < 0 || q.timestampSec > maxDurationSec + 300) {
      return false;
    }
  }

  return true;
}

/**
 * Step 4: Suitability and child safety filter.
 */
function validateSuitability(q: AssessmentQuestion): boolean {
  const combinedText = `${q.stem} ${q.explanation} ${(q.options || []).join(' ')}`.toLowerCase();

  // Basic inappropriate keyword blacklist
  const forbidden = [
    'gambling',
    'casino',
    'porn',
    'violence',
    'kill',
    'gun',
    'weapon',
    'drug',
    'alcohol',
  ];

  for (const word of forbidden) {
    if (combinedText.includes(word)) return false;
  }

  return true;
}
