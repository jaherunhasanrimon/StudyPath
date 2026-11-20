/**
 * Tests for YouTube playlist URL and ID parser (src/modules/youtube/parse.ts).
 * TDD: Test first, at least 25 cases covering all required formats and edge cases.
 */
import { describe, it, expect } from 'vitest';
import { parsePlaylistInput } from '@/modules/youtube/parse';

describe('parsePlaylistInput', () => {
  // 1-5: Valid full URLs (standard youtube.com)
  it('1. accepts standard playlist URL (https://www.youtube.com/playlist?list=PL1234567890)', () => {
    const res = parsePlaylistInput('https://www.youtube.com/playlist?list=PL1234567890abcdef');
    expect(res).toEqual({ success: true, playlistId: 'PL1234567890abcdef' });
  });

  it('2. accepts standard playlist URL without www (https://youtube.com/playlist?list=...)', () => {
    const res = parsePlaylistInput('https://youtube.com/playlist?list=PL1234567890abcdef');
    expect(res).toEqual({ success: true, playlistId: 'PL1234567890abcdef' });
  });

  it('3. accepts playlist URL with http protocol (http://youtube.com/playlist?list=...)', () => {
    const res = parsePlaylistInput('http://youtube.com/playlist?list=PL1234567890abcdef');
    expect(res).toEqual({ success: true, playlistId: 'PL1234567890abcdef' });
  });

  it('4. accepts protocol-relative URL (//youtube.com/playlist?list=...)', () => {
    const res = parsePlaylistInput('//youtube.com/playlist?list=PL1234567890abcdef');
    expect(res).toEqual({ success: true, playlistId: 'PL1234567890abcdef' });
  });

  it('5. accepts URL without protocol (youtube.com/playlist?list=...)', () => {
    const res = parsePlaylistInput('youtube.com/playlist?list=PL1234567890abcdef');
    expect(res).toEqual({ success: true, playlistId: 'PL1234567890abcdef' });
  });

  // 6-8: Video URL with playlist context (watch?v=...&list=...)
  it('6. extracts list ID from watch URL (https://www.youtube.com/watch?v=xyz123&list=PL1234567890abcdef)', () => {
    const res = parsePlaylistInput('https://www.youtube.com/watch?v=xyz123&list=PL1234567890abcdef');
    expect(res).toEqual({ success: true, playlistId: 'PL1234567890abcdef' });
  });

  it('7. extracts list ID when list param appears before v param', () => {
    const res = parsePlaylistInput('https://www.youtube.com/watch?list=PL1234567890abcdef&v=xyz123');
    expect(res).toEqual({ success: true, playlistId: 'PL1234567890abcdef' });
  });

  it('8. extracts list ID with extra query parameters (e.g. index, t, si)', () => {
    const res = parsePlaylistInput('https://www.youtube.com/watch?v=xyz123&list=PL1234567890abcdef&index=3&t=45s&si=abc123');
    expect(res).toEqual({ success: true, playlistId: 'PL1234567890abcdef' });
  });

  // 9-11: Mobile & short links (m.youtube.com, youtu.be)
  it('9. accepts mobile YouTube URL (https://m.youtube.com/playlist?list=PL1234567890abcdef)', () => {
    const res = parsePlaylistInput('https://m.youtube.com/playlist?list=PL1234567890abcdef');
    expect(res).toEqual({ success: true, playlistId: 'PL1234567890abcdef' });
  });

  it('10. accepts mobile watch URL (https://m.youtube.com/watch?v=xyz&list=PL1234567890abcdef)', () => {
    const res = parsePlaylistInput('https://m.youtube.com/watch?v=xyz&list=PL1234567890abcdef');
    expect(res).toEqual({ success: true, playlistId: 'PL1234567890abcdef' });
  });

  it('11. accepts youtu.be shortlink with list param (https://youtu.be/xyz123?list=PL1234567890abcdef)', () => {
    const res = parsePlaylistInput('https://youtu.be/xyz123?list=PL1234567890abcdef');
    expect(res).toEqual({ success: true, playlistId: 'PL1234567890abcdef' });
  });

  // 12-14: Bare IDs
  it('12. accepts standard bare playlist ID (PL...)', () => {
    const res = parsePlaylistInput('PL1234567890abcdef');
    expect(res).toEqual({ success: true, playlistId: 'PL1234567890abcdef' });
  });

  it('13. accepts bare playlist ID with underscores and hyphens (PL_abc-1234567890)', () => {
    const res = parsePlaylistInput('PL_abc-1234567890');
    expect(res).toEqual({ success: true, playlistId: 'PL_abc-1234567890' });
  });

  it('14. accepts bare ID with leading/trailing whitespace trimmed', () => {
    const res = parsePlaylistInput('   PL1234567890abcdef   \n');
    expect(res).toEqual({ success: true, playlistId: 'PL1234567890abcdef' });
  });

  // 15-17: Auto-generated mixes (RD...)
  it('15. rejects bare auto-generated mix ID starting with RD', () => {
    const res = parsePlaylistInput('RD1234567890abcdef');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('MIX_NOT_SUPPORTED');
      expect(res.messageKey).toBe('error.mixNotSupported');
    }
  });

  it('16. rejects URL containing mix ID (RDMM...)', () => {
    const res = parsePlaylistInput('https://www.youtube.com/watch?v=abc&list=RDMM1234567890abcdef');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('MIX_NOT_SUPPORTED');
    }
  });

  it('17. rejects URL containing mix ID (RDCLAK5uy_...)', () => {
    const res = parsePlaylistInput('https://www.youtube.com/playlist?list=RDCLAK5uy_1234567890');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('MIX_NOT_SUPPORTED');
    }
  });

  // 18-20: Hostname security & SSRF guards
  it('18. rejects unauthorized host (https://vimeo.com/playlist?list=PL1234567890abcdef)', () => {
    const res = parsePlaylistInput('https://vimeo.com/playlist?list=PL1234567890abcdef');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('UNSUPPORTED_HOST');
    }
  });

  it('19. rejects attacker domain mimicking YouTube (https://youtube.com.evil.com/playlist?list=PL123)', () => {
    const res = parsePlaylistInput('https://youtube.com.evil.com/playlist?list=PL1234567890abcdef');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('UNSUPPORTED_HOST');
    }
  });

  it('20. rejects unauthorized subdomain (https://fake.youtube.com/playlist?list=PL123)', () => {
    const res = parsePlaylistInput('https://fake.youtube.com/playlist?list=PL1234567890abcdef');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('UNSUPPORTED_HOST');
    }
  });

  // 21-23: Dangerous URL schemes & injection
  it('21. rejects javascript: scheme (javascript:alert(1))', () => {
    const res = parsePlaylistInput('javascript:alert(1)');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('INVALID_URL');
    }
  });

  it('22. rejects data: scheme', () => {
    const res = parsePlaylistInput('data:text/html,<script>alert(1)</script>');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('INVALID_URL');
    }
  });

  it('23. rejects file: scheme', () => {
    const res = parsePlaylistInput('file:///etc/passwd');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('INVALID_URL');
    }
  });

  // 24-28: Edge cases, lengths, homographs, empty inputs
  it('24. rejects empty string and whitespace-only string', () => {
    const res1 = parsePlaylistInput('');
    expect(res1.success).toBe(false);
    if (!res1.success) expect(res1.error).toBe('EMPTY_INPUT');

    const res2 = parsePlaylistInput('   \t\n  ');
    expect(res2.success).toBe(false);
    if (!res2.success) expect(res2.error).toBe('EMPTY_INPUT');
  });

  it('25. rejects URL missing list parameter (https://www.youtube.com/watch?v=xyz123)', () => {
    const res = parsePlaylistInput('https://www.youtube.com/watch?v=xyz123');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('INVALID_URL');
    }
  });

  it('26. rejects too short playlist ID (< 10 chars)', () => {
    const res = parsePlaylistInput('PL12345');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('INVALID_ID');
    }
  });

  it('27. rejects ridiculously long strings (> 2048 chars or ID > 64 chars)', () => {
    const longId = 'PL' + 'a'.repeat(100);
    const res = parsePlaylistInput(longId);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('INVALID_ID');
    }

    const hugeUrl = 'https://www.youtube.com/playlist?list=PL' + 'a'.repeat(3000);
    const resHuge = parsePlaylistInput(hugeUrl);
    expect(resHuge.success).toBe(false);
  });

  it('28. rejects Cyrillic/Unicode homograph domain look-alikes', () => {
    // Cyrillic small 'a' instead of latin 'a' in youtube or similar lookalike
    const homographUrl = 'https://yоutube.com/playlist?list=PL1234567890abcdef';
    const res = parsePlaylistInput(homographUrl);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('UNSUPPORTED_HOST');
    }
  });
});
