/**
 * Deterministic Fake Provider for Testing (architecture.md §8.1, AGENTS.md §10)
 * Guarantees zero network calls and zero cost in test suites.
 */
import { z } from 'zod';
import { AiProvider } from '../types';

export class FakeAiProvider implements AiProvider {
  name = 'fake-provider';
  model = 'fake-gemini-2.0-flash';

  private overrides: Map<string, unknown> = new Map();

  setOverride(taskSubstring: string, data: unknown) {
    this.overrides.set(taskSubstring, data);
  }

  clearOverrides() {
    this.overrides.clear();
  }

  async generate(req: {
    prompt: string;
    schema?: z.ZodType<unknown>;
    videoUrl?: string;
  }): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
    // Check custom overrides first
    for (const [key, val] of this.overrides.entries()) {
      if (req.prompt.includes(key)) {
        return {
          text: JSON.stringify(val),
          tokensIn: 50,
          tokensOut: 50,
        };
      }
    }

    // 1. Playlist Analysis
    if (
      req.prompt.includes('playlist_analysis') ||
      req.prompt.includes('subjectGuess') ||
      req.prompt.includes('Analyze this playlist metadata')
    ) {
      const mockAnalysis = {
        language: 'bn',
        subjectGuess: 'Higher Mathematics 1st Paper',
        levelGuess: 'HSC',
        isSequential: true,
        groups: [
          { title: 'Matrices and Determinants', videoIndexes: [0, 1, 2], confidence: 0.95 },
        ],
        flags: [],
        difficulty: 'intermediate',
        summary: 'Comprehensive sequential classes covering matrix algebra and determinants for HSC examination.',
      };
      return {
        text: JSON.stringify(mockAnalysis),
        tokensIn: 120,
        tokensOut: 60,
      };
    }

    // 2. Class Insights
    if (
      req.prompt.includes('class_insights') ||
      req.prompt.includes('Extract learning insights') ||
      (req.prompt.includes('keyPoints') && !req.prompt.includes('Generate '))
    ) {
      const mockInsights = {
        videoId: 'mock_v01',
        language: 'bn',
        topics: [
          { title: 'Matrix Definition & Order', startSec: 60, endSec: 420 },
          { title: 'Types of Matrices (Row, Column, Square)', startSec: 425, endSec: 1200 },
          { title: 'Determinant Expansion Technique', startSec: 1205, endSec: 1800 },
        ],
        keyPoints: [
          'A matrix is a rectangular array of numbers arranged in rows and columns.',
          'Square matrices have equal rows and columns; identity matrix has ones on main diagonal.',
          'Determinants only exist for square matrices and scale with row operations.',
        ],
        formulas: ['A_{m \\times n}', '\\det(A) = |A|', 'A \\cdot I = A'],
        prerequisites: ['Basic arithmetic and linear equation concepts'],
        assignmentPrompts: ['Calculate the determinant of a 3x3 diagonal matrix.'],
        confidence: 0.98,
        caveats: [],
      };
      return {
        text: JSON.stringify(mockInsights),
        tokensIn: 250,
        tokensOut: 140,
      };
    }

    // 3. Double Solve Verifier
    if (req.prompt.includes('double_solve') || req.prompt.includes('solvedAnswer')) {
      const mockSolve = {
        solvedAnswer: { value: 14 },
        stepByStep: '1. Expand row 1. 2. Calculate 2x2 sub-determinant. 3. Total is 14.',
        confidence: 1.0,
      };
      return {
        text: JSON.stringify(mockSolve),
        tokensIn: 80,
        tokensOut: 40,
      };
    }

    // 4. Assessment Questions
    const mockAssessment = {
      questions: [
        {
          type: 'mcq',
          stem: 'একটি ৩×৩ ম্যাট্রিক্সের সারি ও কলাম সংখ্যা কত?',
          options: ['৩টি সারি ও ৩টি কলাম', '২টি সারি ও ৩টি কলাম', '৩টি সারি ও ২টি কলাম', '১টি সারি ও ৩টি কলাম'],
          answer: { correctIndex: 0 },
          explanation: '৩×৩ ম্যাট্রিক্সে ৩টি অনুভূমিক সারি এবং ৩টি উলম্ব কলাম থাকে।',
          hints: ['m × n ক্রমের ম্যাট্রিক্সে m সারি এবং n কলাম থাকে।', 'এখানে m = 3 এবং n = 3।'],
          topic: 'Matrix Definition & Order',
          timestampSec: 120,
          difficulty: 'easy',
        },
        {
          type: 'numeric',
          stem: 'যদি A একটি ২×২ একক ম্যাট্রিক্স (Identity Matrix) হয়, তবে \\det(A) এর মান কত?',
          options: [],
          answer: { value: 1 },
          numeric: { tolerance: 0.01, unit: '' },
          explanation: 'যে কোনো ক্রমের একক ম্যাট্রিক্সের নির্ণায়কের মান সর্বদা ১।',
          hints: ['একক ম্যাট্রিক্সের প্রধান কর্ণের উপাদানগুলো ১ এবং বাকিগুলো ০।', 'নির্ণায়কের সূত্র: (1*1 - 0*0) = 1।'],
          topic: 'Types of Matrices',
          timestampSec: 600,
          difficulty: 'medium',
        },
        {
          type: 'true_false',
          stem: 'শুধুমাত্র বর্গাকার ম্যাট্রিক্সের নির্ণায়ক (Determinant) নির্ণয় করা সম্ভব।',
          options: ['সত্য', 'মিথ্যা'],
          answer: { value: true },
          explanation: 'নির্ণায়ক শুধুমাত্র n × n আকারের বর্গাকার ম্যাট্রিক্সের জন্যই সংজ্ঞায়িত।',
          hints: ['যে ম্যাট্রিক্সের সারি ও কলাম অসমান তার কি নির্ণায়ক আছে?'],
          topic: 'Determinant Expansion Technique',
          timestampSec: 1250,
          difficulty: 'easy',
        },
      ],
    };

    return {
      text: JSON.stringify(mockAssessment),
      tokensIn: 300,
      tokensOut: 200,
    };
  }
}
