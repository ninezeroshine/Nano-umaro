import { config } from '../config';
import { withRetry } from '../utils/retry';
import { GoogleGenAI, Modality } from '@google/genai';

export interface GenerateTextToImageParams {
  prompt: string;
  model?: string;
}

export interface GenerateImageToImageParams {
  prompt: string;
  imageDataUrls: string[]; // data:image/...;base64,...
  model?: string;
}

// Создаем клиент Vertex AI с переменными окружения
function createVertexClient() {
  if (!config.vertexAI.projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT is required for Vertex AI');
  }
  
  // Устанавливаем переменные окружения для Google Gen AI SDK
  process.env.GOOGLE_GENAI_USE_VERTEXAI = 'true';
  process.env.GOOGLE_CLOUD_PROJECT = config.vertexAI.projectId;
  process.env.GOOGLE_CLOUD_LOCATION = config.vertexAI.location;
  
  return new GoogleGenAI({});
}

async function callVertexAI(params: {
  model: string;
  prompt: string;
  imageDataUrls?: string[];
  responseModalities?: Modality[];
}): Promise<string> {
  const client = createVertexClient();
  
  const doRequest = async (): Promise<string> => {
    // Логируем запрос для отладки
    console.log('🔗 Vertex AI Request:', {
      model: params.model,
      prompt: params.prompt.substring(0, 100) + '...',
      imageCount: params.imageDataUrls?.length || 0,
      responseModalities: params.responseModalities,
    });

    try {
      const parts: any[] = [{ text: params.prompt }];
      
      if (params.imageDataUrls && params.imageDataUrls.length > 0) {
        // Image-to-image: добавляем все изображения в parts
        for (const url of params.imageDataUrls) {
          const match = url.match(/^data:image\/([^;]+);base64,(.+)$/);
          if (!match) {
            console.warn(`Skipping invalid image data URL format: ${url.substring(0, 30)}...`);
            continue;
          }
          
          const [, mimeType, base64Data] = match;
          parts.push({
            inlineData: {
              mimeType: `image/${mimeType}`,
              data: base64Data,
            },
          });
        }
      }
      
      const contents = [{ role: 'user', parts }];

      const response = await client.models.generateContent({
        model: params.model,
        contents,
        config: {
          responseModalities: params.responseModalities || [Modality.TEXT, Modality.IMAGE],
        },
      });

      console.log('✅ Vertex AI Success Response:', {
        hasContent: !!response?.candidates,
        contentLength: response?.candidates?.length || 0,
      });

      // Извлекаем изображение из ответа
      const imageDataUrl = extractImageFromResponse(response);
      if (!imageDataUrl) {
        const err: any = new Error('No image in Vertex AI response');
        err.status = 502;
        err.responseJson = response;
        throw err;
      }

      return imageDataUrl;
    } catch (error: any) {
      console.error('❌ Vertex AI Error:', {
        message: error.message,
        code: error.code,
        status: error.status,
      });

      // Преобразуем ошибки Vertex AI в формат, совместимый с существующей обработкой ошибок
      const err: any = new Error(error.message || 'Vertex AI request failed');
      err.status = mapVertexErrorToHttpStatus(error);
      err.responseJson = { error: { message: error.message, code: error.code } };
      throw err;
    }
  };

  return withRetry(doRequest, 3, 600);
}

/**
 * Извлекает data URL изображения из ответа Vertex AI
 */
function extractImageFromResponse(response: any): string | null {
  try {
    const candidates = response?.candidates;
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return null;
    }

    for (const candidate of candidates) {
      const content = candidate.content;
      if (!content?.parts) continue;

      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data && part.inlineData.mimeType) {
          const { data, mimeType } = part.inlineData;
          return `data:${mimeType};base64,${data}`;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting image from response:', error);
    return null;
  }
}

/**
 * Преобразует коды ошибок Vertex AI в HTTP статусы
 */
function mapVertexErrorToHttpStatus(error: any): number {
  const code = error.code || error.status;
  
  switch (code) {
    case 401:
    case 'UNAUTHENTICATED':
      return 401;
    case 403:
    case 'PERMISSION_DENIED':
      return 403;
    case 404:
    case 'NOT_FOUND':
      return 404;
    case 429:
    case 'RESOURCE_EXHAUSTED':
      return 429;
    case 400:
    case 'INVALID_ARGUMENT':
      return 400;
    case 500:
    case 'INTERNAL':
      return 500;
    case 503:
    case 'UNAVAILABLE':
      return 503;
    case 504:
    case 'DEADLINE_EXCEEDED':
      return 408; // Таймаут
    default:
      return 500;
  }
}

export async function generateTextToImage(params: GenerateTextToImageParams): Promise<string> {
  const model = params.model ?? config.vertexAI.imageModel;
  
  return callVertexAI({
    model,
    prompt: params.prompt,
    responseModalities: [Modality.TEXT, Modality.IMAGE],
  });
}

export async function generateImageToImage(params: GenerateImageToImageParams): Promise<string> {
  const model = params.model ?? config.vertexAI.imageModel;
  
  return callVertexAI({
    model,
    prompt: params.prompt,
    imageDataUrls: params.imageDataUrls,
    responseModalities: [Modality.TEXT, Modality.IMAGE],
  });
}
