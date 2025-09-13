import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// --- New logic to load credentials ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const keyFilePath = path.resolve(__dirname, '..', '..', 'vertex-ai-key.json');
let projectIdFromKey: string | undefined;

if (fs.existsSync(keyFilePath)) {
  try {
    const keyFileContent = fs.readFileSync(keyFilePath, 'utf-8');
    const keyFileData = JSON.parse(keyFileContent);
    projectIdFromKey = keyFileData.project_id;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFilePath;
    console.log('✅ Loaded credentials from vertex-ai-key.json');
  } catch (error) {
    console.error('❌ Error reading or parsing vertex-ai-key.json:', error);
  }
} else {
  console.warn('⚠️ vertex-ai-key.json not found, relying on default credentials.');
}
// --- End of new logic ---

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
    projectId: projectIdFromKey || process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    imageModel: process.env.IMAGE_MODEL || 'gemini-2.5-flash-image-preview',
    requestTimeoutMs: parseNumber(process.env.REQUEST_TIMEOUT_MS, 60_000),
  },
};

