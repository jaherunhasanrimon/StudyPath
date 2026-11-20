import { test, expect } from '@playwright/test';

const mockQuizItemId = 'item-quiz-1001';
const mockAssignItemId = 'item-assign-2001';

const mockAssessmentData = {
  id: 'assess-uuid-quiz-1',
  kind: 'quiz',
  language: 'bn',
  difficulty: 'medium',
  status: 'published',
  questions: [
    {
      id: 'q-uuid-1',
      position: 1,
      type: 'mcq',
      stem: 'যদি $A = \\begin{pmatrix} 2 & 0 \\\\ 0 & 3 \\end{pmatrix}$ হয়, তবে $\\det(A)$ এর মান কত?',
      options: ['৫', '৬', '১', '০'],
      hints: [
        'কর্ণ ম্যাট্রিক্সের নির্ণায়কের ক্ষেত্রে প্রধান কর্ণের উপাদানগুলো গুণ করতে হয়।',
        'এখানে উপাদান দুটি হলো ২ এবং ৩।',
      ],
      topic: 'Matrix Determinants',
      timestampSec: 120,
      difficulty: 'medium',
      verifierStatus: 'double_solve_ok',
      reportCount: 0,
    },
    {
      id: 'q-uuid-2',
      position: 2,
      type: 'numeric',
      stem: 'একটি কণার ভর $m = 2$ kg এবং ত্বরণ $a = 4.5$ $\\text{m/s}^2$ হলে প্রযুক্ত বল $F$ কত নিউটন?',
      options: [],
      hints: ['নিউটনীয় সূত্র $F = ma$ প্রয়োগ করুন।'],
      topic: 'Newtonian Mechanics',
      timestampSec: 340,
      difficulty: 'easy',
      verifierStatus: 'cas_ok',
      reportCount: 0,
    },
  ],
};

const mockAssignmentData = {
  id: 'assess-uuid-assign-2',
  kind: 'assignment',
  language: 'bn',
  difficulty: 'hard',
  status: 'published',
  questions: [
    {
      id: 'q-assign-1',
      position: 1,
      type: 'problem',
      stem: 'একটি বস্তু অনুভূমিকের সাথে $30^\\circ$ কোণে $20$ $\\text{m/s}$ বেগে নিক্ষেপ করা হলো। সর্বোচ্চ উচ্চতায় পৌঁছাতে প্রয়োজনীয় সময় এবং সর্বোচ্চ উচ্চতা নির্ণয় করো। ($g = 9.8$ $\\text{m/s}^2$)',
      options: [],
      hints: [
        'প্রাসের উলম্ব গতির সমীকরণ $v_y = u\\sin\\theta - gt$ বিবেচনা করুন।',
        'সর্বোচ্চ উচ্চতার সূত্র: $H = \\frac{u^2 \\sin^2\\theta}{2g}$।',
        'প্রথমে $t = \\frac{u\\sin\\theta}{g} = \\frac{20 \\times 0.5}{9.8} \\approx 1.02$ সেকেন্ড বের করুন।',
      ],
      topic: 'Projectile Motion',
      timestampSec: 450,
      difficulty: 'hard',
      verifierStatus: 'double_solve_ok',
      reportCount: 0,
    },
  ],
};

test.describe('Phase 4 Quizzes and Assignments Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    // Add test auth cookie for protected (app) routes
    await context.addCookies([
      {
        name: 'dishari-test-user',
        value: 'true',
        url: 'http://localhost:3000',
      },
    ]);

    // Mock class item endpoint
    await page.route('**/api/class/**', async (route) => {
      const url = route.request().url();
      const isAssign = url.includes(mockAssignItemId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          item: {
            id: isAssign ? mockAssignItemId : mockQuizItemId,
            type: isAssign ? 'assignment' : 'quiz',
            label: isAssign ? 'Assignment 01 - Dynamics' : 'Quiz 01 - Matrix Algebra',
            video_ids: ['video_fixture_01'],
            status: 'scheduled',
          },
        }),
      });
    });

    // Mock assessment request endpoint
    await page.route('**/api/assessments/request', async (route) => {
      const body = route.request().postDataJSON();
      const isAssign = body.kind === 'assignment';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ready',
          assessment: isAssign ? mockAssignmentData : mockAssessmentData,
        }),
      });
    });

    // Mock start attempt
    await page.route('**/api/attempts', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ attemptId: 'att-mock-888' }),
        });
      }
    });

    // Mock grade attempt
    await page.route('**/api/attempts/*/submit', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          attemptId: 'att-mock-888',
          score: 20,
          maxScore: 20,
          percentage: 100,
          passed: true,
          answers: [
            {
              questionId: 'q-uuid-1',
              isCorrect: true,
              correctAnswer: { correctIndex: 1 },
              explanation: 'প্রধান কর্ণের উপাদান ২ ও ৩ এর গুণফল হলো ৬।',
              timestampSec: 120,
              topic: 'Matrix Determinants',
            },
            {
              questionId: 'q-uuid-2',
              isCorrect: true,
              correctAnswer: { value: 9 },
              explanation: 'F = m * a = 2 * 4.5 = 9 N।',
              timestampSec: 340,
              topic: 'Newtonian Mechanics',
            },
          ],
        }),
      });
    });

    // Mock reports
    await page.route('**/api/reports', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
  });

  test('Quiz Runner: takes quiz, reveals hints, submits, and views review breakdown with KaTeX math', async ({
    page,
  }) => {
    // Navigate to quiz page
    await page.goto(`/class/${mockQuizItemId}/quiz`);

    // Verify question 1 appears
    await expect(page.locator('text=/প্রশ্ন [১1] \\/ [২2]/')).toBeVisible();

    // Verify KaTeX math is rendered inside the stem
    const katexEl = page.locator('.katex');
    await expect(katexEl.first()).toBeVisible();

    // Verify Question 1 MCQ options are rendered with 44px min touch target
    const optionB = page.getByRole('button', { name: /[৬6]/ });
    await expect(optionB).toBeVisible();
    const box = await optionB.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);

    // Test hint ladder on question 1
    const hintToggle = page.getByRole('button', { name: /পরবর্তী ইঙ্গিত দেখুন/ });
    await expect(hintToggle).toBeVisible();
    await hintToggle.click();
    await expect(page.locator('text=কর্ণ ম্যাট্রিক্সের নির্ণায়কের ক্ষেত্রে')).toBeVisible();

    // Select option B (correct)
    await optionB.click();

    // Click Next Question
    await page.getByRole('button', { name: 'পরের প্রশ্ন' }).click();

    // Verify question 2 (numeric)
    await expect(page.locator('text=/প্রশ্ন [২2] \\/ [২2]/')).toBeVisible();
    const numericInput = page.getByPlaceholder(/সংখ্যায় উত্তর লিখুন/);
    await expect(numericInput).toBeVisible();
    await numericInput.fill('9');

    // Submit quiz
    const submitBtn = page.getByRole('button', { name: /কুইজ জমা দিন/ });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Verify Quiz Results view
    await expect(page.locator('text=১০০%').or(page.locator('text=100%'))).toBeVisible();
    await expect(page.locator('text=AI-দ্বারা প্রস্তুত ও যাচাইকৃত')).toBeVisible();
    await expect(page.locator('text=ভিডিওতে দেখুন').first()).toBeVisible();
  });

  test('Assignment Runner: reads problem set, steps through 3-tier hints, fills notes, and self-evaluates rubric', async ({
    page,
  }) => {
    // Navigate to assignment page
    await page.goto(`/class/${mockAssignItemId}/assignment`);

    // Verify assignment title and problem stem
    await expect(page.locator('text=গাণিতিক ও বর্ণনামূলক সমস্যা সেট')).toBeVisible();
    await expect(page.locator('text=/সমস্যা [১1]/')).toBeVisible();

    // Test 3-Tier progressive hints
    const tier1Btn = page.getByRole('button', { name: /১ম ইঙ্গিত/ });
    await expect(tier1Btn).toBeVisible();
    await tier1Btn.click();
    await expect(page.locator('text=ইঙ্গিত ১ (ধারণা):')).toBeVisible();

    const tier2Btn = page.getByRole('button', { name: /২য় ইঙ্গিত/ });
    await expect(tier2Btn).toBeVisible();
    await tier2Btn.click();
    await expect(page.locator('text=ইঙ্গিত ২ (সূত্র ও তত্ত্ব):')).toBeVisible();

    // Fill work notes
    const notesArea = page.getByPlaceholder(/এখানে আপনার সমাধান বা উত্তর লিখুন/);
    await notesArea.fill('t = 1.02 s, H = 5.10 m');

    // Reveal worked solution & rubric
    const solutionToggle = page.getByRole('button', { name: /আদর্শ সমাধান ও আত্ম-মূল্যায়ন দেখুন/ });
    await solutionToggle.click();
    await expect(page.locator('text=রুব্রিক স্ব-মূল্যায়ন:')).toBeVisible();

    // Check all 3 rubric criteria
    const rubricBoxes = page.locator('input[type="checkbox"]');
    await expect(rubricBoxes).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await rubricBoxes.nth(i).check();
    }

    // Submit Assignment
    const completeBtn = page.getByRole('button', { name: 'অ্যাসাইনমেন্ট সম্পন্ন করুন' });
    await completeBtn.click();

    // Verify completion summary
    await expect(page.locator('text=অ্যাসাইনমেন্ট সম্পন্ন হয়েছে!')).toBeVisible();
  });

  test('Capture Responsive Screenshots (360px, 768px, 1280px in light/dark)', async ({
    page,
  }) => {
    const viewports = [
      { name: '360', width: 360, height: 740 },
      { name: '768', width: 768, height: 1024 },
      { name: '1280', width: 1280, height: 800 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Quiz Runner Page
      await page.goto(`/class/${mockQuizItemId}/quiz`);
      await page.waitForTimeout(500);

      // Light mode
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.screenshot({
        path: `docs/screenshots/quiz-${vp.name}-light.png`,
        fullPage: true,
      });

      // Dark mode
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.screenshot({
        path: `docs/screenshots/quiz-${vp.name}-dark.png`,
        fullPage: true,
      });

      // 2. Assignment Runner Page
      await page.goto(`/class/${mockAssignItemId}/assignment`);
      await page.waitForTimeout(500);

      // Light mode
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.screenshot({
        path: `docs/screenshots/assignment-${vp.name}-light.png`,
        fullPage: true,
      });

      // Dark mode
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.screenshot({
        path: `docs/screenshots/assignment-${vp.name}-dark.png`,
        fullPage: true,
      });
    }
  });
});
