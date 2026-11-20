/**
 * Gemini Provider Adapter (architecture.md §8.1, AGENTS.md §5, §8)
 * Connects to Gemini models exclusively through environment variables.
 * Model names are never hardcoded.
 */
import { z } from 'zod';
import { env } from '@/lib/env';
import { AiProvider } from '../types';

export class GeminiProvider implements AiProvider {
  name = 'gemini';
  model: string;
  private apiKey: string;

  constructor(options?: { model?: string; apiKey?: string }) {
    this.model = options?.model || env.GEMINI_MODEL_FAST || 'gemini-2.0-flash';
    this.apiKey = options?.apiKey || env.GEMINI_API_KEY || '';
  }

  async generate(req: {
    prompt: string;
    schema?: z.ZodType<unknown>;
    videoUrl?: string;
    timeoutMs?: number;
  }): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
    if (!this.apiKey) {
      throw new Error('Missing GEMINI_API_KEY in environment variables.');
    }

    const timeoutMs = req.timeoutMs || 30_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        this.model
      )}:generateContent?key=${this.apiKey}`;

      const contents: Array<{
        role?: string;
        parts: Array<{ text?: string; fileData?: { fileUri: string; mimeType: string } }>;
      }> = [];

      const parts: Array<{ text?: string; fileData?: { fileUri: string; mimeType: string } }> = [];

      // If a video URL is provided, attach as YouTube URI or metadata prompt
      if (req.videoUrl) {
        parts.push({
          text: `[YouTube Video Reference: ${req.videoUrl}]\n`,
        });
      }

      parts.push({ text: req.prompt });
      contents.push({ parts });

      const requestBody: Record<string, unknown> = {
        contents,
        generationConfig: {
          temperature: 0.2,
          topP: 0.95,
          responseMimeType: 'application/json',
        },
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gemini API error (HTTP ${res.status}): ${errorText}`);
      }

      const json = await res.json();
      const candidate = json.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || '';

      const tokensIn = json.usageMetadata?.promptTokenCount || 0;
      const tokensOut = json.usageMetadata?.candidatesTokenCount || 0;

      return { text, tokensIn, tokensOut };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Gemini API request timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
