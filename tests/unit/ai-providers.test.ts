import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FakeAiProvider } from '@/modules/ai/providers/fake-provider';
import { GeminiProvider } from '@/modules/ai/providers/gemini';

describe('AI Providers', () => {
  describe('FakeAiProvider', () => {
    it('returns valid playlist analysis structure', async () => {
      const provider = new FakeAiProvider();
      const res = await provider.generate({ prompt: 'Task: playlist_analysis for physics' });
      const data = JSON.parse(res.text);

      expect(data.subjectGuess).toBeDefined();
      expect(data.isSequential).toBe(true);
      expect(res.tokensIn).toBeGreaterThan(0);
      expect(res.tokensOut).toBeGreaterThan(0);
    });

    it('returns valid class insights structure', async () => {
      const provider = new FakeAiProvider();
      const res = await provider.generate({ prompt: 'Task: class_insights for lecture 1' });
      const data = JSON.parse(res.text);

      expect(Array.isArray(data.topics)).toBe(true);
      expect(Array.isArray(data.keyPoints)).toBe(true);
      expect(Array.isArray(data.formulas)).toBe(true);
    });

    it('returns valid assessment questions structure', async () => {
      const provider = new FakeAiProvider();
      const res = await provider.generate({ prompt: 'Task: assessment questions' });
      const data = JSON.parse(res.text);

      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions.length).toBeGreaterThan(0);
      expect(data.questions[0].type).toBe('mcq');
    });

    it('allows explicit mock overrides', async () => {
      const provider = new FakeAiProvider();
      provider.setOverride('special_case', { custom: 'value' });

      const res = await provider.generate({ prompt: 'Running special_case' });
      expect(JSON.parse(res.text)).toEqual({ custom: 'value' });
    });
  });

  describe('GeminiProvider', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('respects dynamic model name without hardcoding', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"ok": true}' }] } }],
          usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 5 },
        }),
      });
      global.fetch = mockFetch;

      const provider = new GeminiProvider({
        model: 'gemini-custom-eval-model',
        apiKey: 'test-api-key',
      });

      const res = await provider.generate({ prompt: 'Hello world' });
      expect(res.text).toBe('{"ok": true}');
      expect(res.tokensIn).toBe(15);
      expect(res.tokensOut).toBe(5);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('gemini-custom-eval-model');
      expect(calledUrl).toContain('key=test-api-key');
    });

    it('fails clearly when API key is missing', async () => {
      const provider = new GeminiProvider({ apiKey: '', model: 'test-model' });
      await expect(provider.generate({ prompt: 'test' })).rejects.toThrow(
        /Missing GEMINI_API_KEY/
      );
    });
  });
});
