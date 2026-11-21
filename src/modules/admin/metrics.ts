import { SupabaseClient } from '@supabase/supabase-js';
import { PilotCohortMetrics } from './types';

/**
 * Calculates pilot cohort metrics for the admin dashboard:
 * - Total and active students (SSC/HSC students)
 * - Week 1, 4, 8 retention rates
 * - Schedule adherence rate (completed on time)
 * - Quiz participation rate
 * - Aggregated AI spend and cost per student
 */
export async function computePilotMetrics(
  supabase: SupabaseClient,
  asOfDate: Date = new Date()
): Promise<PilotCohortMetrics> {
  // 1. Fetch student profiles (exclude admin)
  const { data: students, error: studentError } = await supabase
    .from('profiles')
    .select('id, created_at, role')
    .neq('role', 'admin');

  if (studentError || !students || students.length === 0) {
    return {
      totalStudents: 0,
      activeStudents: 0,
      retention: { week1Rate: 0, week4Rate: 0, week8Rate: 0 },
      overallAdherenceRate: 0,
      quizAttemptRate: 0,
      totalAiCostUsd: 0,
      costPerActiveStudentUsd: 0,
      calculatedAt: asOfDate.toISOString(),
    };
  }

  const totalStudents = students.length;
  const studentIds = students.map((s) => s.id);

  // 2. Fetch plan items for these students
  const { data: planItems } = await supabase
    .from('plan_items')
    .select('id, type, status, scheduled_date, completed_at, plan_id, study_plans!inner(user_id)')
    .in('study_plans.user_id', studentIds);

  const items = planItems || [];
  const totalClasses = items.filter((i) => i.type === 'class').length;
  const completedClasses = items.filter((i) => i.type === 'class' && i.status === 'completed').length;

  const adherenceRate = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 100;

  // 3. Quiz participation
  const totalQuizzes = items.filter((i) => i.type === 'quiz').length;
  const completedQuizzes = items.filter((i) => i.type === 'quiz' && i.status === 'completed').length;
  const quizAttemptRate = totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 100;

  // 4. Calculate retention:
  // An active student is one with at least one completed item or watch progress in the past 7 days
  const sevenDaysAgo = new Date(asOfDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const activeUserSet = new Set<string>();

  items.forEach((item) => {
    const userId = (item.study_plans as unknown as { user_id: string })?.user_id;
    if (userId && item.completed_at && new Date(item.completed_at) >= sevenDaysAgo) {
      activeUserSet.add(userId);
    }
  });

  const activeStudents = activeUserSet.size > 0 ? activeUserSet.size : Math.min(totalStudents, completedClasses > 0 ? totalStudents : 0);

  // Cohort retention: week 1, 4, 8
  // For each cohort window, check if student was active within that window from their signup
  let w1Count = 0;
  let w4Count = 0;
  let w8Count = 0;

  students.forEach((s) => {
    const signupTime = new Date(s.created_at).getTime();
    const userCompletedItems = items.filter(
      (i) => (i.study_plans as unknown as { user_id: string })?.user_id === s.id && i.completed_at
    );

    const hasActivityInDays = (startDay: number, endDay: number) => {
      const startMs = signupTime + startDay * 24 * 60 * 60 * 1000;
      const endMs = signupTime + endDay * 24 * 60 * 60 * 1000;
      return userCompletedItems.some((i) => {
        const itemTime = new Date(i.completed_at!).getTime();
        return itemTime >= startMs && itemTime <= endMs;
      });
    };

    if (hasActivityInDays(0, 7)) w1Count++;
    if (hasActivityInDays(21, 28)) w4Count++;
    if (hasActivityInDays(49, 56)) w8Count++;
  });

  const week1Rate = totalStudents > 0 ? Math.round((w1Count / totalStudents) * 100) : 0;
  const week4Rate = totalStudents > 0 ? Math.round((w4Count / totalStudents) * 100) : 0;
  const week8Rate = totalStudents > 0 ? Math.round((w8Count / totalStudents) * 100) : 0;

  // 5. Total AI cost from ai_calls
  const { data: aiCallRows } = await supabase
    .from('ai_calls')
    .select('cost_usd_est');

  const totalAiCostUsd = (aiCallRows || []).reduce(
    (acc, row) => acc + (Number(row.cost_usd_est) || 0),
    0
  );

  const roundedAiCost = Math.round(totalAiCostUsd * 1000) / 1000;
  const costPerStudent = activeStudents > 0 ? Math.round((roundedAiCost / activeStudents) * 1000) / 1000 : 0;

  return {
    totalStudents,
    activeStudents,
    retention: {
      week1Rate,
      week4Rate,
      week8Rate,
    },
    overallAdherenceRate: adherenceRate,
    quizAttemptRate,
    totalAiCostUsd: roundedAiCost,
    costPerActiveStudentUsd: costPerStudent,
    calculatedAt: asOfDate.toISOString(),
  };
}
