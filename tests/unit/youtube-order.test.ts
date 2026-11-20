/**
 * Unit tests for deterministic playlist title numbering analysis.
 */
import { describe, it, expect } from 'vitest';
import { analyzePlaylistOrder, extractNumberFromTitle } from '@/modules/youtube/order';

describe('extractNumberFromTitle', () => {
  it('extracts number with English prefixes (Class 1, Part 2, Lecture 3, #4)', () => {
    expect(extractNumberFromTitle('Higher Math Class 1: Matrices')).toBe(1);
    expect(extractNumberFromTitle('Physics Chapter 2 Part 05')).toBe(5);
    expect(extractNumberFromTitle('ICT Lecture 12 - Number Systems')).toBe(12);
    expect(extractNumberFromTitle('Chemistry #3: Periodic Table')).toBe(3);
    expect(extractNumberFromTitle('Biology Ep 04 - Cell Division')).toBe(4);
  });

  it('extracts number with Bangla prefixes (ক্লাস ১, পর্ব ২, লেকচার ৩)', () => {
    expect(extractNumberFromTitle('উচ্চতর গণিত - ক্লাস ১ : ম্যাট্রিক্স')).toBe(1);
    expect(extractNumberFromTitle('পদার্থবিজ্ঞান অধ্যায় ২ পর্ব ০৫')).toBe(5);
    expect(extractNumberFromTitle('তথ্য ও যোগাযোগ প্রযুক্তি লেকচার ১২')).toBe(12);
  });

  it('extracts number with English prefix followed by Bangla numeral (Class ১, Part ২)', () => {
    expect(extractNumberFromTitle('Class ১: Introduction')).toBe(1);
    expect(extractNumberFromTitle('Part ০৩: Equations')).toBe(3);
  });

  it('extracts leading number format (01. Intro, 02 - Details)', () => {
    expect(extractNumberFromTitle('01. Introduction to Web Development')).toBe(1);
    expect(extractNumberFromTitle('০২ - HTML Basics')).toBe(2);
    expect(extractNumberFromTitle('[03] CSS Flexbox')).toBe(3);
  });

  it('returns null when no number is present', () => {
    expect(extractNumberFromTitle('Introduction and Course Overview')).toBeNull();
    expect(extractNumberFromTitle('Final Thoughts and Conclusion')).toBeNull();
  });
});

describe('analyzePlaylistOrder', () => {
  it('detects strictly sequential English numbered titles', () => {
    const titles = [
      'Class 1: Intro',
      'Class 2: Variables',
      'Class 3: Loops',
      'Class 4: Functions',
      'Class 5: Arrays',
    ];
    const result = analyzePlaylistOrder(titles);
    expect(result.isSequential).toBe(true);
    expect(result.status).toBe('sequential');
    expect(result.detectedNumbers).toEqual([1, 2, 3, 4, 5]);
  });

  it('detects strictly sequential Bangla numbered titles', () => {
    const titles = [
      'ক্লাস ১: পরিচিতি',
      'ক্লাস ২: চলক',
      'ক্লাস ৩: লুপ',
      'ক্লাস ৪: ফাংশন',
    ];
    const result = analyzePlaylistOrder(titles);
    expect(result.isSequential).toBe(true);
    expect(result.status).toBe('sequential');
    expect(result.detectedNumbers).toEqual([1, 2, 3, 4]);
  });

  it('detects out-of-order / shuffled titles', () => {
    const titles = [
      'Class 1: Intro',
      'Class 3: Loops',
      'Class 2: Variables', // Out of order!
      'Class 4: Functions',
    ];
    const result = analyzePlaylistOrder(titles);
    expect(result.isSequential).toBe(false);
    expect(result.status).toBe('out_of_order');
    expect(result.detectedNumbers).toEqual([1, 3, 2, 4]);
  });

  it('detects reversed titles (e.g. newest video added at the top)', () => {
    const titles = [
      'Part 4: Conclusion',
      'Part 3: Advanced',
      'Part 2: Basics',
      'Part 1: Setup',
    ];
    const result = analyzePlaylistOrder(titles);
    expect(result.isSequential).toBe(false);
    expect(result.status).toBe('out_of_order');
  });

  it('handles titles with no numbering gracefully', () => {
    const titles = [
      'Welcome to the channel',
      'General Tips and Tricks',
      'Summary and Conclusion',
    ];
    const result = analyzePlaylistOrder(titles);
    expect(result.isSequential).toBe(true);
    expect(result.status).toBe('no_numbering');
  });

  it('tolerates an unnumbered intro or outro video if the rest are sequential', () => {
    const titles = [
      'Course Trailer & Overview', // unnumbered intro
      'Lecture 1: Basics',
      'Lecture 2: Advanced',
      'Lecture 3: Mastery',
    ];
    const result = analyzePlaylistOrder(titles);
    expect(result.isSequential).toBe(true);
    expect(result.status).toBe('sequential');
  });
});
