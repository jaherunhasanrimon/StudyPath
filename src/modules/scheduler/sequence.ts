/**
 * src/modules/scheduler/sequence.ts
 *
 * Builds the ordered sequence of work items (Classes, Quizzes, Assignments).
 * Governed by docs/architecture.md §7.2 step 3:
 * - A quiz comes before an assignment due at the same class.
 * - Quiz duration: round(3 + 1.2 * questions)
 * - Checks are placed after class parts are completed.
 */

import { ClassItem } from './group';
import { Prefs, ItemType } from './types';

export interface WorkItem {
  id: string;
  type: ItemType;
  label: string;
  durationMin: number;
  classNumber?: number;
  videoIds?: string[];
  part?: {
    index: number;
    of: number;
    fromSec: number;
    toSec: number;
  };
  covers?: number[]; // 1-based class numbers covered
}

export function calculateQuizDuration(questions: number): number {
  return Math.round(3 + 1.2 * questions);
}

export function buildWorkSequence(classes: ClassItem[], prefs: Prefs): WorkItem[] {
  const sequence: WorkItem[] = [];
  const totalClasses = classes.length > 0 ? Math.max(...classes.map((c) => c.classNumber)) : 0;

  const quizDuration = calculateQuizDuration(prefs.quiz.questions);
  const assignmentDuration = prefs.assignment.minutes;

  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i];

    // Add class item
    sequence.push({
      id: cls.id,
      type: 'class',
      label: cls.title,
      durationMin: cls.durationMin,
      classNumber: cls.classNumber,
      videoIds: cls.videoIds,
      part: cls.part,
    });

    // If this is a split part and NOT the final part of this class, don't trigger checks yet
    if (cls.part && cls.part.index < cls.part.of) {
      continue;
    }

    const currentClassNum = cls.classNumber;

    // 1. Check Quiz cadence
    let addQuiz = false;
    let quizCovers: number[] = [];

    if ('every' in prefs.quiz.cadence) {
      const N = prefs.quiz.cadence.every;
      if (currentClassNum % N === 0) {
        addQuiz = true;
        const startClass = Math.max(1, currentClassNum - N + 1);
        quizCovers = Array.from(
          { length: currentClassNum - startClass + 1 },
          (_, idx) => startClass + idx
        );
      }
    }

    // 2. Check Assignment cadence
    let addAssignment = false;
    let assignmentCovers: number[] = [];

    if ('every' in prefs.assignment.cadence) {
      const M = prefs.assignment.cadence.every;
      if (currentClassNum % M === 0) {
        addAssignment = true;
        const startClass = Math.max(1, currentClassNum - M + 1);
        assignmentCovers = Array.from(
          { length: currentClassNum - startClass + 1 },
          (_, idx) => startClass + idx
        );
      }
    }

    // A quiz comes BEFORE an assignment due at the same class
    if (addQuiz) {
      sequence.push({
        id: `quiz-after-class-${currentClassNum}`,
        type: 'quiz',
        label: `Quiz (classes ${quizCovers[0]}–${quizCovers[quizCovers.length - 1]})`,
        durationMin: quizDuration,
        covers: quizCovers,
      });
    }

    if (addAssignment) {
      sequence.push({
        id: `assignment-after-class-${currentClassNum}`,
        type: 'assignment',
        label: `Assignment (classes ${assignmentCovers[0]}–${assignmentCovers[assignmentCovers.length - 1]})`,
        durationMin: assignmentDuration,
        covers: assignmentCovers,
      });
    }
  }

  // Handle End-of-course checks after the last class
  if (totalClasses > 0) {
    // at: 'end' Quiz
    if ('at' in prefs.quiz.cadence && prefs.quiz.cadence.at === 'end') {
      const finalQuizCovers = Array.from({ length: totalClasses }, (_, idx) => idx + 1);
      sequence.push({
        id: `quiz-final`,
        type: 'quiz',
        label: `Quiz (classes ${finalQuizCovers[0]}–${finalQuizCovers[finalQuizCovers.length - 1]})`,
        durationMin: quizDuration,
        covers: finalQuizCovers,
      });
    }

    // at: 'end' Assignment
    if ('at' in prefs.assignment.cadence && prefs.assignment.cadence.at === 'end') {
      const finalAssignmentCovers = Array.from({ length: totalClasses }, (_, idx) => idx + 1);
      sequence.push({
        id: `assignment-final`,
        type: 'assignment',
        label: `Assignment (classes ${finalAssignmentCovers[0]}–${finalAssignmentCovers[finalAssignmentCovers.length - 1]})`,
        durationMin: assignmentDuration,
        covers: finalAssignmentCovers,
      });
    }
  }

  return sequence;
}
