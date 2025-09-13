import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export interface SaveResult {
  filePath: string; // absolute
  publicPath: string; // e.g. /cache/xxx.png
}

function getCacheDir(): string {
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

export async function saveDataUrl(
  dataUrl: string, 
  metadata: Record<string, any>
): Promise<SaveResult> {
  const match = /^data:(.+?);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid data URL');
  
  const mime = match[1];
  const base64 = match[2];
  if (!base64) throw new Error('No base64 data found');
  
  const inputBuffer = Buffer.from(base64, 'base64');
  const ext = inferExtensionFromMime(mime);
  const dir = getCacheDir();
  await ensureDir(dir);
  
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).slice(2, 8);
  const baseName = `${timestamp}-${randomPart}`;
  const fileName = `${baseName}.${ext}`;
  const filePath = path.join(dir, fileName);

  const fullMetadata = {
    ...metadata,
    createdAt: new Date(timestamp).toISOString(),
  };

  // Embed metadata into the image using sharp
  const outputBuffer = await sharp(inputBuffer)
    .withMetadata({
      exif: {
        // We store the entire metadata object as a JSON string in the ImageDescription tag
        IFD0: {
          // Convert metadata to a Base64 string to ensure encoding safety
          ImageDescription: Buffer.from(JSON.stringify(fullMetadata)).toString('base64')
        }
      }
    })
    .toBuffer();

  await fs.writeFile(filePath, outputBuffer);
  
  return { filePath, publicPath: `/cache/${fileName}` };
}