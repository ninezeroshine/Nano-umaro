import 'dotenv/config';

export interface AppConfig {
  port: number;
  debug: boolean;
  siteUrl: string | undefined;
  siteName: string | undefined;
  vertexAI: {
    projectId: string | undefined;
    location: string;
    imageModel: string;
    requestTimeoutMs: number;
  };
}

function parseNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config: AppConfig = {
  port: parseNumber(process.env.PORT, 3000),
  debug: process.env.DEBUG === '1' || process.env.DEBUG === 'true',
  siteUrl: process.env.SITE_URL,
  siteName: process.env.SITE_NAME,
  vertexAI: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    imageModel: process.env.VERTEX_IMAGE_MODEL || 'gemini-2.5-flash-image-preview',
    requestTimeoutMs: parseNumber(process.env.REQUEST_TIMEOUT_MS, 60_000),
  },
};

