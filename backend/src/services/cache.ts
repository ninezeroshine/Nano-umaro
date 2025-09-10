import fs from 'node:fs/promises';
import path from 'node:path';

export interface SaveResult {
  filePath: string; // absolute
  publicPath: string; // e.g. /cache/xxx.png
}

function getCacheDir(): string {
  // public folder is at project root / public
  // backend runs from backend/, so go one level up
  return path.resolve(process.cwd(), '../public/cache');
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function inferExtensionFromMime(mime: string | undefined): string {
  if (!mime) return 'png';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'png';
}

export async function saveDataUrl(dataUrl: string): Promise<SaveResult> {
  const match = /^data:(.+?);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid data URL');
  const mime = match[1];
  const base64 = match[2];
  if (!base64) throw new Error('No base64 data found');
  const buffer = Buffer.from(base64, 'base64');
  const ext = inferExtensionFromMime(mime);
  const dir = getCacheDir();
  await ensureDir(dir);
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, buffer);
  
  // Логируем успешное сохранение
  console.log(`✅ Изображение сохранено: ${filePath}`);
  console.log(`🔗 Публичный путь: /cache/${fileName}`);
  
  return { filePath, publicPath: `/cache/${fileName}` };
}


