import { GoogleGenAI } from '@google/genai';
import { ZodSchema } from 'zod';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { AiValidationError } from '../lib/errors';

export const isRealGemini =
  Boolean(env.GEMINI_API_KEY) &&
  !env.GEMINI_API_KEY.includes('mock-') &&
  env.GEMINI_API_KEY.length > 10;

export const ai = new GoogleGenAI({
  apiKey: isRealGemini ? env.GEMINI_API_KEY : 'mock-gemini-key',
});

export const MODEL = env.GEMINI_MODEL || 'gemini-2.5-flash';

// Concurrency Semaphore (Cap of 4 simultaneous requests)
class Semaphore {
  private current = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.current++;
  }

  release(): void {
    this.current--;
    const next = this.queue.shift();
    if (next) next();
  }
}

const aiSemaphore = new Semaphore(env.AI_MAX_CONCURRENCY || 4);

export interface GenerateOptions {
  systemInstruction?: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
  inlineImage?: {
    mimeType: string;
    base64Data: string;
  };
}

export interface StructuredAiResult<T> {
  data: T;
  model: string;
  latency_ms: number;
}

export async function generateStructured<T>(
  schema: ZodSchema<T>,
  options: GenerateOptions
): Promise<StructuredAiResult<T>> {
  if (!isRealGemini) {
    throw new AiValidationError('Gemini API key is not configured or in mock mode');
  }

  await aiSemaphore.acquire();
  const startTime = Date.now();

  try {
    const timeoutMs = options.inlineImage
      ? options.timeoutMs || env.GEMINI_VISION_TIMEOUT_MS
      : options.timeoutMs || env.GEMINI_TEXT_TIMEOUT_MS;

    let attempts = 0;
    const maxAttempts = 3;
    let repairHint = '';

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const contents: any[] = [];

        if (options.inlineImage) {
          contents.push({
            inlineData: {
              mimeType: options.inlineImage.mimeType,
              data: options.inlineImage.base64Data,
            },
          });
        }

        const promptText = repairHint
          ? `${options.userPrompt}\n\n[REPAIR HINT]: Your previous response failed schema validation. Return ONLY valid JSON satisfying the schema requirements:\n${repairHint}`
          : options.userPrompt;

        contents.push({ text: promptText });

        const callPromise = ai.models.generateContent({
          model: MODEL,
          contents,
          config: {
            systemInstruction: options.systemInstruction,
            responseMimeType: 'application/json',
            temperature: options.temperature ?? 0.1,
          },
        });

        // Apply timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Gemini request timed out after ${timeoutMs}ms`)),
            timeoutMs
          )
        );

        const response: any = await Promise.race([callPromise, timeoutPromise]);
        const rawText = response.text || '';

        // Parse JSON
        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(rawText);
        } catch (jsonErr: any) {
          repairHint = `Invalid JSON syntax: ${jsonErr.message}. Ensure response is strictly valid JSON without formatting or markdown.`;
          continue;
        }

        // Validate with Zod
        const zodResult = schema.safeParse(parsedJson);
        if (zodResult.success) {
          const latency_ms = Date.now() - startTime;
          logger.info(
            { model: MODEL, latency_ms, attempts },
            'Gemini structured call succeeded'
          );
          return {
            data: zodResult.data,
            model: MODEL,
            latency_ms,
          };
        } else {
          repairHint = `Zod schema issues: ${JSON.stringify(zodResult.error.format())}`;
          logger.warn(
            { error: zodResult.error.format(), attempt: attempts },
            'Gemini response failed Zod schema, attempting repair'
          );
        }
      } catch (callErr: any) {
        logger.warn({ error: callErr.message, attempt: attempts }, 'Error calling Gemini model');
        if (attempts >= maxAttempts) {
          throw callErr;
        }
      }
    }

    throw new AiValidationError(`Failed to obtain valid AI structured output after ${maxAttempts} attempts`);
  } finally {
    aiSemaphore.release();
  }
}
