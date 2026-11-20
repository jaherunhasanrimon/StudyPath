'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QuizRunner } from '@/components/quiz/QuizRunner';
import { QuizResults } from '@/components/quiz/QuizResults';
import { StudentAssessment, GradeResult } from '@/modules/ai/service';

interface PageProps {
  params: Promise<{ itemId: string }>;
}

export default function ClassQuizPage({ params }: PageProps) {
  const { itemId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<StudentAssessment | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadQuiz() {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch class item info to get video_ids
        const classRes = await fetch(`/api/class/${itemId}`);
        if (!classRes.ok) {
          throw new Error('Class item not found.');
        }
        const classData = await classRes.json();
        const videoIds = classData.item?.video_ids || [];

        if (videoIds.length === 0) {
          throw new Error('No videos associated with this quiz.');
        }

        // 2. Request quiz assessment
        const reqRes = await fetch('/api/assessments/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoIds,
            kind: 'quiz',
            planItemId: itemId,
          }),
        });

        if (!reqRes.ok) {
          throw new Error('Failed to request quiz.');
        }

        const reqData = await reqRes.json();
        let readyAssessment: StudentAssessment | null = null;

        if (reqData.status === 'ready') {
          readyAssessment = reqData.assessment;
        } else if (reqData.status === 'queued') {
          // Poll for completion
          setPollStatus('AI প্রশ্ন তৈরি করছে... (Generating quiz...)');
          const jobId = reqData.jobId;
          let attempts = 0;

          while (attempts < 20 && !isCancelled) {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const pollRes = await fetch(`/api/assessments/jobs/${jobId}`);
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.status === 'done' && pollData.assessmentId) {
                const assessRes = await fetch(`/api/assessments/${pollData.assessmentId}`);
                if (assessRes.ok) {
                  const assessJson = await assessRes.json();
                  readyAssessment = assessJson.assessment;
                  break;
                }
              } else if (pollData.status === 'failed') {
                throw new Error('Quiz generation failed.');
              }
            }
          }
        }

        if (!readyAssessment) {
          throw new Error('Could not load quiz questions.');
        }

        if (isCancelled) return;
        setAssessment(readyAssessment);

        // 3. Start attempt
        const startRes = await fetch('/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentId: readyAssessment.id,
            planItemId: itemId,
          }),
        });

        if (!startRes.ok) {
          throw new Error('Failed to start attempt.');
        }

        const startData = await startRes.json();
        if (isCancelled) return;
        setAttemptId(startData.attemptId);
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Error loading quiz');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadQuiz();

    return () => {
      isCancelled = true;
    };
  }, [itemId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-river border-t-transparent rounded-full animate-spin" />
        <div className="text-ink font-medium text-base">
          {pollStatus || 'কুইজ প্রস্তুত হচ্ছে...'}
        </div>
        <p className="text-slate text-xs max-w-sm">
          ভিডিওর গুরুত্বপূর্ণ বিষয়গুলো থেকে ব্যক্তিগত প্রশ্ন সাজানো হচ্ছে।
        </p>
      </div>
    );
  }

  if (error || !assessment || !attemptId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="text-brick text-3xl">⚠️</div>
        <h2 className="text-ink font-display font-bold text-lg">কুইজ লোড করা যায়নি</h2>
        <p className="text-slate text-sm max-w-md">{error}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="px-4 py-2 rounded-xl bg-river text-white text-sm font-medium"
          >
            পুনরায় চেষ্টা করুন
          </button>
          <Link
            href={`/class/${itemId}`}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-surface text-ink"
          >
            ক্লাসে ফিরুন
          </Link>
        </div>
      </div>
    );
  }

  if (gradeResult) {
    return (
      <QuizResults
        gradeResult={gradeResult}
        questions={assessment.questions}
        classItemId={itemId}
      />
    );
  }

  return (
    <QuizRunner
      assessment={assessment}
      attemptId={attemptId}
      classItemId={itemId}
      onComplete={(res) => setGradeResult(res)}
    />
  );
}
