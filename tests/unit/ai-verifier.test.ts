import { describe, it, expect } from 'vitest';
import { verifyAssessment } from '@/modules/ai/verifier';
import { AssessmentQuestion } from '@/modules/ai/prompts/assessment';
import { ClassInsights } from '@/modules/ai/prompts/class-insights';

describe('Assessment Verification Pipeline', () => {
  const sampleInsights: ClassInsights[] = [
    {
      videoId: 'v101',
      language: 'bn',
      topics: [
        { title: 'Matrix Algebra', startSec: 0, endSec: 600 },
        { title: 'Determinants', startSec: 601, endSec: 1800 },
      ],
      keyPoints: ['Matrices can be added if dimensions match.'],
      formulas: ['A + B = C'],
      prerequisites: ['Basic arithmetic'],
      assignmentPrompts: ['Solve practice problems'],
      confidence: 1.0,
      caveats: [],
    },
  ];

  const validQuestions: AssessmentQuestion[] = [
    {
      type: 'mcq',
      stem: 'Which of the following is a square matrix?',
      options: ['2x2 matrix', '2x3 matrix', '1x4 matrix', '3x1 matrix'],
      answer: { correctIndex: 0 },
      explanation: 'A 2x2 matrix has equal rows and columns.',
      hints: ['Rows must equal columns.'],
      topic: 'Matrix Algebra',
      timestampSec: 120,
      difficulty: 'easy',
    },
    {
      type: 'numeric',
      stem: 'What is the determinant of a 1x1 matrix with element 42?',
      options: [],
      answer: { value: 42 },
      numeric: { tolerance: 0.01, unit: '' },
      explanation: 'Determinant of 1x1 is the single element itself.',
      hints: ['A single number.'],
      topic: 'Determinants',
      timestampSec: 750,
      difficulty: 'easy',
    },
    {
      type: 'true_false',
      stem: 'Matrix multiplication is always commutative (AB = BA).',
      options: ['True', 'False'],
      answer: { value: false },
      explanation: 'In general, AB does not equal BA.',
      hints: ['Order matters.'],
      topic: 'Matrix Algebra',
      timestampSec: 350,
      difficulty: 'medium',
    },
  ];

  it('keeps valid, well-grounded questions with CAS verification', async () => {
    const res = await verifyAssessment(validQuestions, sampleInsights);
    expect(res.verifiedQuestions.length).toBe(3);
    expect(res.survivalRate).toBe(1.0);
    expect(res.verifierSummary.casVerifiedCount).toBe(1);
    expect(res.verifiedQuestions.find((q) => q.type === 'numeric')?.verifierStatus).toBe('cas_ok');
  });

  it('drops questions with duplicate MCQ options', async () => {
    const broken: AssessmentQuestion = {
      ...validQuestions[0],
      options: ['Same option', 'Same option', 'Third', 'Fourth'],
    };

    const res = await verifyAssessment([broken], sampleInsights);
    expect(res.verifiedQuestions.length).toBe(0);
    expect(res.survivalRate).toBe(0);
  });

  it('drops questions with invalid MCQ answer indices', async () => {
    const broken: AssessmentQuestion = {
      ...validQuestions[0],
      answer: { correctIndex: 10 }, // Out of range
    };

    const res = await verifyAssessment([broken], sampleInsights);
    expect(res.verifiedQuestions.length).toBe(0);
  });

  it('drops questions with timestamps outside video duration', async () => {
    const outOfBounds: AssessmentQuestion = {
      ...validQuestions[0],
      timestampSec: 999999, // Impossible timestamp
    };

    const res = await verifyAssessment([outOfBounds], sampleInsights);
    expect(res.verifiedQuestions.length).toBe(0);
  });

  it('drops questions containing inappropriate content', async () => {
    const offensive: AssessmentQuestion = {
      ...validQuestions[0],
      stem: 'Calculate the probability of gun violence in casino gambling',
    };

    const res = await verifyAssessment([offensive], sampleInsights);
    expect(res.verifiedQuestions.length).toBe(0);
  });
});
