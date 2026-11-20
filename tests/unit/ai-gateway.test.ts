import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { DefaultAiGateway } from '@/modules/ai/gateway';
import { AiProvider } from '@/modules/ai/types';

describe('DefaultAiGateway', () => {
  const testSchema = z.object({
    summary: z.string(),
    count: z.number(),
  });

  it('successfully generates and parses structured output', async () => {
    const mockProvider: AiProvider = {
      name: 'test-provider',
      model: 'test-model',
      generate: vi.fn().mockResolvedValue({
        text: JSON.stringify({ summary: 'Algebra Chapter 1', count: 10 }),
        tokensIn: 50,
        tokensOut: 20,
      }),
    };

    const gateway = new DefaultAiGateway(mockProvider);
    const result = await gateway.generateStructured({
      task: 'playlist_analysis',
      schema: testSchema,
      input: { title: 'Maths' },
      idempotencyKey: 'test-key-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.summary).toBe('Algebra Chapter 1');
      expect(result.data.count).toBe(10);
      expect(result.usage.tokensIn).toBe(50);
      expect(result.usage.tokensOut).toBe(20);
    }
  });

  it('automatically triggers repair loop when initial output fails schema', async () => {
    let callCount = 0;
    const mockProvider: AiProvider = {
      name: 'test-provider',
      model: 'test-model',
      generate: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // Bad JSON on first attempt
          return { text: '{ "summary": "Broken"', tokensIn: 30, tokensOut: 10 };
        }
        // Corrected JSON on repair attempt
        return {
          text: JSON.stringify({ summary: 'Repaired summary', count: 5 }),
          tokensIn: 60,
          tokensOut: 20,
        };
      }),
    };

    const gateway = new DefaultAiGateway(mockProvider);
    const result = await gateway.generateStructured({
      task: 'playlist_analysis',
      schema: testSchema,
      input: { title: 'Maths' },
      idempotencyKey: 'test-key-repair',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.summary).toBe('Repaired summary');
      expect(result.data.count).toBe(5);
    }
    expect(callCount).toBe(2);
  });

  it('scrubs PII from input before passing to provider prompt', async () => {
    let receivedPrompt = '';
    const mockProvider: AiProvider = {
      name: 'test-provider',
      model: 'test-model',
      generate: vi.fn().mockImplementation(async (req) => {
        receivedPrompt = req.prompt;
        return {
          text: JSON.stringify({ summary: 'Safe', count: 1 }),
          tokensIn: 10,
          tokensOut: 10,
        };
      }),
    };

    const gateway = new DefaultAiGateway(mockProvider);
    await gateway.generateStructured({
      task: 'playlist_analysis',
      schema: testSchema,
      input: { email: 'student@example.com', phone: '01712345678' },
      idempotencyKey: 'test-key-pii',
    });

    expect(receivedPrompt).not.toContain('student@example.com');
    expect(receivedPrompt).not.toContain('01712345678');
    expect(receivedPrompt).toContain('[REDACTED_EMAIL]');
    expect(receivedPrompt).toContain('[REDACTED_PHONE]');
  });

  it('handles provider retries on transient errors', async () => {
    let callCount = 0;
    const mockProvider: AiProvider = {
      name: 'test-provider',
      model: 'test-model',
      generate: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network timeout');
        }
        return {
          text: JSON.stringify({ summary: 'Success after retry', count: 2 }),
          tokensIn: 20,
          tokensOut: 20,
        };
      }),
    };

    const gateway = new DefaultAiGateway(mockProvider);
    const result = await gateway.generateStructured({
      task: 'playlist_analysis',
      schema: testSchema,
      input: { title: 'Physics' },
      idempotencyKey: 'test-key-retry',
    });

    expect(result.ok).toBe(true);
    expect(callCount).toBe(2);
  });
});
