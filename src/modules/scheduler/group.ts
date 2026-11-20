/**
 * src/modules/scheduler/group.ts
 *
 * Groups normalized videos into classes.
 * Supports:
 * 1. 'one-per-class': Each video is an individual class.
 * 2. 'auto-group': Accumulate consecutive short videos up to targetMin (not exceeding maxMin).
 * 3. Class splitting when a video exceeds maxWindowDurationMin and splitLongClasses is true.
 */

import { NormalizedVideo } from './normalize';
import { Prefs } from './types';

export interface ClassItem {
  id: string;
  classNumber: number; // 1-based index
  title: string;
  durationMin: number;
  videoIds: string[];
  part?: {
    index: number;
    of: number;
    fromSec: number;
    toSec: number;
  };
}

export function groupVideosIntoClasses(
  videos: NormalizedVideo[],
  prefs: Prefs,
  maxWindowMinutes: number
): ClassItem[] {
  const classes: ClassItem[] = [];
  let currentClassNumber = 1;

  if (prefs.grouping.mode === 'auto-group') {
    const { targetMin, maxMin } = prefs.grouping;
    let currentBatch: NormalizedVideo[] = [];
    let currentBatchMin = 0;

    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];

      // If video alone exceeds maxWindowMinutes and splitLongClasses is true
      if (prefs.splitLongClasses && v.effectiveMin > maxWindowMinutes) {
        // First flush any accumulated batch
        if (currentBatch.length > 0) {
          classes.push({
            id: `class-${currentClassNumber}`,
            classNumber: currentClassNumber++,
            title: currentBatch.map((b) => b.title).join(' + '),
            durationMin: currentBatchMin,
            videoIds: currentBatch.map((b) => b.id),
          });
          currentBatch = [];
          currentBatchMin = 0;
        }

        // Split this single video into equal parts
        const numParts = Math.ceil(v.effectiveMin / maxWindowMinutes);
        const partDurationMin = Math.ceil(v.effectiveMin / numParts);
        const partDurationSec = Math.floor(v.durationSec / numParts);

        for (let p = 1; p <= numParts; p++) {
          const fromSec = (p - 1) * partDurationSec;
          const toSec = p === numParts ? v.durationSec : p * partDurationSec;
          classes.push({
            id: `class-${currentClassNumber}-part-${p}`,
            classNumber: currentClassNumber,
            title: `${v.title} (Part ${p}/${numParts})`,
            durationMin: p === numParts ? v.effectiveMin - partDurationMin * (numParts - 1) : partDurationMin,
            videoIds: [v.id],
            part: {
              index: p,
              of: numParts,
              fromSec,
              toSec,
            },
          });
        }
        currentClassNumber++;
        continue;
      }

      // Check if adding this video exceeds maxMin
      if (currentBatch.length > 0 && currentBatchMin + v.effectiveMin > maxMin) {
        // Flush current batch
        classes.push({
          id: `class-${currentClassNumber}`,
          classNumber: currentClassNumber++,
          title: currentBatch.map((b) => b.title).join(' + '),
          durationMin: currentBatchMin,
          videoIds: currentBatch.map((b) => b.id),
        });
        currentBatch = [v];
        currentBatchMin = v.effectiveMin;
      } else {
        currentBatch.push(v);
        currentBatchMin += v.effectiveMin;

        // If batch reached targetMin, flush it
        if (currentBatchMin >= targetMin) {
          classes.push({
            id: `class-${currentClassNumber}`,
            classNumber: currentClassNumber++,
            title: currentBatch.map((b) => b.title).join(' + '),
            durationMin: currentBatchMin,
            videoIds: currentBatch.map((b) => b.id),
          });
          currentBatch = [];
          currentBatchMin = 0;
        }
      }
    }

    // Flush leftover batch
    if (currentBatch.length > 0) {
      classes.push({
        id: `class-${currentClassNumber}`,
        classNumber: currentClassNumber++,
        title: currentBatch.map((b) => b.title).join(' + '),
        durationMin: currentBatchMin,
        videoIds: currentBatch.map((b) => b.id),
      });
    }
  } else {
    // Mode: 'one-per-class'
    for (const v of videos) {
      if (prefs.splitLongClasses && v.effectiveMin > maxWindowMinutes) {
        const numParts = Math.ceil(v.effectiveMin / maxWindowMinutes);
        const partDurationMin = Math.ceil(v.effectiveMin / numParts);
        const partDurationSec = Math.floor(v.durationSec / numParts);

        for (let p = 1; p <= numParts; p++) {
          const fromSec = (p - 1) * partDurationSec;
          const toSec = p === numParts ? v.durationSec : p * partDurationSec;
          classes.push({
            id: `class-${currentClassNumber}-part-${p}`,
            classNumber: currentClassNumber,
            title: `${v.title} (Part ${p}/${numParts})`,
            durationMin: p === numParts ? v.effectiveMin - partDurationMin * (numParts - 1) : partDurationMin,
            videoIds: [v.id],
            part: {
              index: p,
              of: numParts,
              fromSec,
              toSec,
            },
          });
        }
        currentClassNumber++;
      } else {
        classes.push({
          id: `class-${currentClassNumber}`,
          classNumber: currentClassNumber++,
          title: v.title,
          durationMin: v.effectiveMin,
          videoIds: [v.id],
        });
      }
    }
  }

  return classes;
}
