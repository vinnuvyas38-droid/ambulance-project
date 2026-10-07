import {
  ICvDetector,
  CvFrameAnalysis,
  Approach,
  cvFrameAnalysisSchema,
} from '@green-corridor/shared';
import { generateStructured } from './gemini.client';
import { buildCvFramePrompt } from '../ai/prompts/cvFrame.prompt';
import { SimulatedDetector } from './cv.simulatedDetector';
import { logger } from '../lib/logger';

export class GeminiDetector implements ICvDetector {
  private fallbackDetector = new SimulatedDetector();

  async analyzeFrame(
    junctionId: string,
    approach: Approach,
    imageData?: string
  ): Promise<CvFrameAnalysis> {
    if (!imageData) {
      return this.fallbackDetector.analyzeFrame(junctionId, approach);
    }

    try {
      // Clean base64 prefix if present (e.g., data:image/jpeg;base64,...)
      const cleanedBase64 = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

      const { systemInstruction, userPrompt } = buildCvFramePrompt(approach);
      const aiResult = await generateStructured(cvFrameAnalysisSchema, {
        systemInstruction,
        userPrompt,
        temperature: 0.1,
        timeoutMs: 12000,
        inlineImage: {
          mimeType: 'image/jpeg',
          base64Data: cleanedBase64,
        },
      });

      if (aiResult.data.needs_fallback) {
        logger.warn('Gemini vision flagged needs_fallback = true; falling back to simulated detector');
        return this.fallbackDetector.analyzeFrame(junctionId, approach);
      }

      return aiResult.data;
    } catch (err: any) {
      logger.warn(
        { error: err.message, junctionId, approach },
        'Gemini Vision call failed; falling back to simulated ground-truth detector'
      );
      return this.fallbackDetector.analyzeFrame(junctionId, approach);
    }
  }
}
