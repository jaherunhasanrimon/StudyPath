import { describe, it, expect } from 'vitest';
import katex from 'katex';
import { parseMathSegments } from '@/components/quiz/KaTeXMath';

describe('KaTeX Math Parser & Renderer Unit Tests', () => {
  it('parses plain text without math delimiters', () => {
    const text = 'This is a standard question stem in Bangla: বল ও ত্বরণের সম্পর্ক কী?';
    const segments = parseMathSegments(text);

    expect(segments).toHaveLength(1);
    expect(segments[0].isMath).toBe(false);
    expect(segments[0].content).toBe(text);
  });

  it('correctly extracts inline math with \\( ... \\) delimiters', () => {
    const text = 'Find x when \\(x^2 + 5x + 6 = 0\\) in the equation.';
    const segments = parseMathSegments(text);

    expect(segments).toHaveLength(3);
    expect(segments[0].content).toBe('Find x when ');
    expect(segments[0].isMath).toBe(false);

    expect(segments[1].content).toBe('x^2 + 5x + 6 = 0');
    expect(segments[1].isMath).toBe(true);
    expect(segments[1].displayMode).toBe(false);

    expect(segments[2].content).toBe(' in the equation.');
    expect(segments[2].isMath).toBe(false);

    // Verify KaTeX renders this segment without throwing
    const rendered = katex.renderToString(segments[1].content, {
      displayMode: segments[1].displayMode,
      throwOnError: false,
    });
    expect(rendered).toContain('katex');
  });

  it('correctly extracts display math with $$ ... $$ delimiters', () => {
    const text = 'Evaluate the integral: $$\\int_0^1 x^2 dx$$ carefully.';
    const segments = parseMathSegments(text);

    expect(segments).toHaveLength(3);
    expect(segments[1].content).toBe('\\int_0^1 x^2 dx');
    expect(segments[1].isMath).toBe(true);
    expect(segments[1].displayMode).toBe(true);

    const rendered = katex.renderToString(segments[1].content, {
      displayMode: segments[1].displayMode,
      throwOnError: false,
    });
    expect(rendered).toContain('katex-display');
  });

  it('handles mixed Bangla text and single dollar math notation', () => {
    const text = 'যদি $F = ma$ হয়, তবে $m = 5$ kg হলে ত্বরণ কত?';
    const segments = parseMathSegments(text);

    expect(segments).toHaveLength(5);
    expect(segments[0].content).toBe('যদি ');
    expect(segments[1].content).toBe('F = ma');
    expect(segments[1].isMath).toBe(true);
    expect(segments[2].content).toBe(' হয়, তবে ');
    expect(segments[3].content).toBe('m = 5');
    expect(segments[3].isMath).toBe(true);
    expect(segments[4].content).toBe(' kg হলে ত্বরণ কত?');
  });

  it('handles empty input gracefully', () => {
    expect(parseMathSegments('')).toEqual([]);
  });
});
