/**
 * Pure function: Deterministic playlist title numbering analysis.
 * Detects whether video titles follow a sequential order or appear out of order.
 * Source: docs/architecture.md §6.4 and docs/phases.md §1.
 */

export interface OrderAnalysisResult {
  isSequential: boolean;
  status: 'sequential' | 'out_of_order' | 'no_numbering';
  messageKey: string;
  detectedNumbers: Array<number | null>;
}

// Convert Bangla numerals to standard English numbers
const BANGLA_TO_ENGLISH_MAP: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

function normalizeDigits(text: string): string {
  return text.replace(/[০-৯]/g, (ch) => BANGLA_TO_ENGLISH_MAP[ch] || ch);
}

/**
 * Extracts a representative class / lecture / episode number from a video title.
 * Examples:
 *   "Class 01: Intro" -> 1
 *   "ক্লাস ০৩: সূত্র" -> 3
 *   "Physics Part 2" -> 2
 *   "01. Intro" -> 1
 */
export function extractNumberFromTitle(title: string): number | null {
  if (!title) return null;

  const normalized = normalizeDigits(title);

  // Pattern 1a: High-priority video-level indicators (Class, Part, Episode, Lecture, পর্ব, ক্লাস, লেকচার, #)
  const videoPrefixRegex =
    /(?:class|part|episode|ep|lecture|পর্ব|ক্লাস|লেকচার|#)\s*[:.-]?\s*(\d+)/i;
  const videoMatch = normalized.match(videoPrefixRegex);
  if (videoMatch && videoMatch[1]) {
    return parseInt(videoMatch[1], 10);
  }

  // Pattern 1b: Container/Chapter-level indicators (Chapter, অধ্যায়, etc.)
  const chapterPrefixRegex = /(?:chapter|ch|অধ্যায়)\s*[:.-]?\s*(\d+)/i;
  const chapterMatch = normalized.match(chapterPrefixRegex);
  if (chapterMatch && chapterMatch[1]) {
    return parseInt(chapterMatch[1], 10);
  }

  // Pattern 2: Leading numbering at start of title (e.g. "01.", "01 -", "[01]", "(01)")
  const leadingRegex = /^(?:\[|\()?(\d{1,4})(?:\]|\))?[\s.:\-_]+/;
  const leadingMatch = normalized.match(leadingRegex);
  if (leadingMatch && leadingMatch[1]) {
    return parseInt(leadingMatch[1], 10);
  }

  // Pattern 3: Trailing numbering at end of title (e.g. "- 01", "| 1")
  const trailingRegex = /[\s.:\-_|]+(?:\[|\()?(\d{1,4})(?:\]|\))?$/;
  const trailingMatch = normalized.match(trailingRegex);
  if (trailingMatch && trailingMatch[1]) {
    return parseInt(trailingMatch[1], 10);
  }

  return null;
}

/**
 * Analyzes an ordered list of titles to determine if their numbering is sequential.
 */
export function analyzePlaylistOrder(titles: string[]): OrderAnalysisResult {
  if (!titles || titles.length <= 1) {
    return {
      isSequential: true,
      status: 'sequential',
      messageKey: 'order.sequential',
      detectedNumbers: titles ? titles.map(extractNumberFromTitle) : [],
    };
  }

  const detectedNumbers = titles.map(extractNumberFromTitle);
  const numberedEntries = detectedNumbers
    .map((num, index) => ({ num, index }))
    .filter((entry): entry is { num: number; index: number } => entry.num !== null);

  // If fewer than 2 videos have numbers or less than 35% of playlist has numbers,
  // we treat it as no explicit numbering detected
  if (numberedEntries.length < 2 || numberedEntries.length / titles.length < 0.35) {
    return {
      isSequential: true,
      status: 'no_numbering',
      messageKey: 'order.noNumbering',
      detectedNumbers,
    };
  }

  // Check if numbered entries are strictly increasing
  let isStrictlyIncreasing = true;
  for (let i = 1; i < numberedEntries.length; i++) {
    if (numberedEntries[i].num <= numberedEntries[i - 1].num) {
      isStrictlyIncreasing = false;
      break;
    }
  }

  if (isStrictlyIncreasing) {
    return {
      isSequential: true,
      status: 'sequential',
      messageKey: 'order.sequential',
      detectedNumbers,
    };
  }

  return {
    isSequential: false,
    status: 'out_of_order',
    messageKey: 'order.mayBeOff',
    detectedNumbers,
  };
}
