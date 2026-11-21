import { describe, it, expect } from 'vitest';
import { STARTER_PLAYLISTS } from '@/modules/admin/starter-playlists';

describe('Curated Starter Playlists (Phase 7)', () => {
  it('contains exactly 10 human-checked starter playlists', () => {
    expect(STARTER_PLAYLISTS).toHaveLength(10);
  });

  it('covers core Bangladeshi SSC & HSC subjects (Math, Physics, Chemistry, English, ICT, Biology)', () => {
    const subjects = new Set(STARTER_PLAYLISTS.map((p) => p.subject));
    expect(subjects.has('math')).toBe(true);
    expect(subjects.has('physics')).toBe(true);
    expect(subjects.has('chemistry')).toBe(true);
    expect(subjects.has('english')).toBe(true);
    expect(subjects.has('ict')).toBe(true);
    expect(subjects.has('biology')).toBe(true);
  });

  it('features reputable educational channels from user context', () => {
    const channels = STARTER_PLAYLISTS.map((p) => p.channelTitle);
    expect(channels.some((c) => c.includes('Onnorokom Pathshala'))).toBe(true);
    expect(channels.some((c) => c.includes('10 Minute School'))).toBe(true);
    expect(channels.some((c) => c.includes('Khan Academy Bangla'))).toBe(true);
  });

  it('every starter playlist has valid metadata, reviewer credit, and YouTube playlist URL', () => {
    STARTER_PLAYLISTS.forEach((p) => {
      expect(p.id).toBeTruthy();
      expect(p.titleBn).toBeTruthy();
      expect(p.playlistUrl).toMatch(/^https:\/\/www\.youtube\.com\/playlist\?list=/);
      expect(p.itemCount).toBeGreaterThan(0);
      expect(p.durationHours).toBeGreaterThan(0);
      expect(p.verifiedReviewer).toBeTruthy();
      expect(p.verifiedDate).toBeTruthy();
    });
  });
});
