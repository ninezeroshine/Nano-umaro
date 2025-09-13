import type { FastifyInstance } from 'fastify';
import * as vertexAIService from '../services/vertexAI';
import { config } from '../config';
import { saveDataUrl } from '../services/cache';
import { analyzeVertexAIError } from '../utils/errorAnalyzer';
import pLimit from 'p-limit';

interface GenerateBody {
  prompt: string;
  n?: number;
  mode?: 'text-to-image' | 'image-to-image';
  imageDataUrls?: string[];
}

export function registerGenerateRoute(app: FastifyInstance) {
  app.post<{ Body: GenerateBody }>('/api/generate', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const { prompt, n = 1, mode = 'text-to-image', imageDataUrls } = req.body || {};

    // Детальное логирование
    app.log.info({
      provider: 'vertex',
      imageModel: config.vertexAI.imageModel,
      mode,
      n,
      prompt: `"${prompt}"`, 
      promptLength: prompt?.length || 0,
      imageCount: imageDataUrls?.length || 0
    }, 'Generation request');

    if (!prompt || typeof prompt !== 'string') {
      return reply.code(400).send({ images: [], error: 'Prompt is required' });
    }
    if (n < 1 || n > 6) {
      return reply.code(400).send({ images: [], error: 'n must be between 1 and 6' });
    }
    if (mode === 'image-to-image' && (!imageDataUrls || imageDataUrls.length === 0)) {
      return reply.code(400).send({ images: [], error: 'imageDataUrls is required for image-to-image' });
    }

    // Уменьшаем concurrency для больших батчей
    const concurrency = n > 2 ? 1 : 2;
    const limit = pLimit(concurrency);
    
    const tasks = Array.from({ length: n }).map(() => limit(async () => {
      // Бэкенд не должен изменять промпт. Фронтенд присылает его в уже готовом виде.
      const dataUrl = mode === 'text-to-image'
        ? await vertexAIService.generateTextToImage({ prompt })
        : await vertexAIService.generateImageToImage({ prompt, imageDataUrls: imageDataUrls! });

      const metadata = {
        prompt,
        mode,
        imageModel: config.vertexAI.imageModel,
      };

      const { publicPath } = await saveDataUrl(dataUrl, metadata);
      return publicPath;
    }));

    try {
      const images = await Promise.all(tasks);
      return reply.send({ images, error: null });
    } catch (err: any) {
      // Анализируем ошибку Vertex AI
      const errorAnalysis = analyzeVertexAIError(err, n);
      
      app.log.error({
        err,
        provider: 'vertex',
        errorAnalysis,
        requestedN: n,
        mode,
        errorDetails: err?.responseJson 
      }, `Generation failed (Vertex AI): ${errorAnalysis.errorType}`);
      
      const status = errorAnalysis.originalStatus ?? 500;
      
      // Формируем расширенное сообщение с предложениями
      let fullMessage = errorAnalysis.userMessage;
      if (errorAnalysis.suggestions.length > 0) {
        fullMessage += '\n\nРекомендации:\n• ' + errorAnalysis.suggestions.join('\n• ');
      }
      
      return reply.code(status).send({
        images: [], 
        error: fullMessage,
        errorType: errorAnalysis.errorType,
        suggestions: errorAnalysis.suggestions,
        retryable: errorAnalysis.retryable
      });
    }
  });
}


