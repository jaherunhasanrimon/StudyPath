'use client';

import React from 'react';
import katex from 'katex';

interface KaTeXMathProps {
  text: string;
  className?: string;
}

interface Segment {
  isMath: boolean;
  displayMode: boolean;
  content: string;
}

/**
 * Splits string containing inline/display LaTeX into text and math segments.
 * Matches:
 *  - Display: $$...$$ or \[...\]
 *  - Inline: \(...\) or $...$
 */
export function parseMathSegments(text: string): Segment[] {
  if (!text) return [];

  const segments: Segment[] = [];
  // Regex to match math delimiters
  // Group 1: $$...$$
  // Group 2: \[...\]
  // Group 3: \(...\)
  // Group 4: $...$
  const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]+?\$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Plain text before match
    if (match.index > lastIndex) {
      segments.push({
        isMath: false,
        displayMode: false,
        content: text.slice(lastIndex, match.index),
      });
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('$$') && matchedStr.endsWith('$$')) {
      segments.push({
        isMath: true,
        displayMode: true,
        content: matchedStr.slice(2, -2).trim(),
      });
    } else if (matchedStr.startsWith('\\[') && matchedStr.endsWith('\\]')) {
      segments.push({
        isMath: true,
        displayMode: true,
        content: matchedStr.slice(2, -2).trim(),
      });
    } else if (matchedStr.startsWith('\\(') && matchedStr.endsWith('\\)')) {
      segments.push({
        isMath: true,
        displayMode: false,
        content: matchedStr.slice(2, -2).trim(),
      });
    } else if (matchedStr.startsWith('$') && matchedStr.endsWith('$')) {
      segments.push({
        isMath: true,
        displayMode: false,
        content: matchedStr.slice(1, -1).trim(),
      });
    }

    lastIndex = match.index + matchedStr.length;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    segments.push({
      isMath: false,
      displayMode: false,
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

export function KaTeXMath({ text, className = '' }: KaTeXMathProps) {
  const segments = parseMathSegments(text);

  return (
    <span className={`katex-math-wrapper ${className}`}>
      {segments.map((seg, i) => {
        if (!seg.isMath) {
          return <React.Fragment key={i}>{seg.content}</React.Fragment>;
        }

        try {
          const html = katex.renderToString(seg.content, {
            displayMode: seg.displayMode,
            throwOnError: false,
          });

          return (
            <span
              key={i}
              className={seg.displayMode ? 'block my-2 overflow-x-auto py-1' : 'inline-block mx-0.5'}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <code key={i} className="text-brick text-xs px-1 py-0.5 rounded bg-surface">
              {seg.content}
            </code>
          );
        }
      })}
    </span>
  );
}
