import type { FastifyInstance } from 'fastify';
import { readdir, stat, access, unlink } from 'fs/promises';
import { join, resolve, dirname, basename, normalize } from 'path';
import { constants } from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import exifReader from 'exif-reader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface GalleryImage {
  filename: string;
  path: string;
  timestamp: number;
  size: number;
  metadata?: Record<string, any>;
}

interface GalleryQuery {
  page?: string;
  limit?: string;
}

async function findCacheDir(): Promise<string | null> {
  const possiblePaths = [
    resolve(process.cwd(), '..', 'public', 'cache'),
    resolve(process.cwd(), 'public', 'cache'),
    resolve(__dirname, '..', '..', '..', 'public', 'cache'),
  ];
  for (const path of possiblePaths) {
    try {
      await access(path, constants.R_OK);
      return path;
    } catch (error) {}
  }
  return null;
}

export function registerGalleryRoute(app: FastifyInstance) {
  app.get<{ Querystring: GalleryQuery }>('/api/gallery', { 
    config: { 
      rateLimit: false
    } 
  }, async (req, reply) => {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '12', 10);
      const cacheDir = await findCacheDir();
      if (!cacheDir) {
        return reply.send({ images: [], totalPages: 0, currentPage: 1 });
      }
      const files = await readdir(cacheDir);
      const imageFiles = files.filter(file => 
        file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
      );

      const imagesWithDetails = await Promise.all(imageFiles.map(async (filename) => {
        const filePath = join(cacheDir, filename);
        const stats = await stat(filePath);
        const timestampMatch = filename.match(/^(\d+)-/);
        const timestamp = timestampMatch?.[1] ? parseInt(timestampMatch[1]) : stats.mtimeMs;

        let metadata = {};
        try {
          const imageMetadata = await sharp(filePath).metadata();
          if (imageMetadata.exif) {
            const parsedExif = exifReader(imageMetadata.exif);
            if (parsedExif?.Image?.ImageDescription) {
              const potentialBase64Data = parsedExif.Image.ImageDescription;
              // Simple regex to check for Base64 characters and padding. This helps ignore old, non-Base64 data.
              const isBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(potentialBase64Data);

              if (isBase64) {
                try {
                  const jsonString = Buffer.from(potentialBase64Data, 'base64').toString('utf-8');
                  metadata = JSON.parse(jsonString);
                } catch (parseError) {
                  // This is a safeguard in case the decoded string is still not valid JSON.
                  app.log.warn({ err: parseError, file: filename }, 'Failed to parse Base64 metadata from image');
                }
              }
              // If it's not Base64, we silently ignore it, assuming it's old data.
            }
          }
        } catch (error) {
          app.log.warn({ err: error, file: filename }, 'Failed to read metadata from image');
        }

        return {
          filename,
          path: `/cache/${filename}`,
          timestamp,
          size: stats.size,
          metadata,
        };
      }));

      const images: GalleryImage[] = imagesWithDetails;
      images.sort((a, b) => b.timestamp - a.timestamp);

      const totalImages = images.length;
      const totalPages = Math.ceil(totalImages / limit);
      const offset = (page - 1) * limit;
      const paginatedImages = images.slice(offset, offset + limit);

      return reply.send({ 
        images: paginatedImages,
        totalPages,
        currentPage: page,
      });
    } catch (error: any) {
      app.log.error(error, 'Failed to load gallery');
      return reply.code(500).send({ images: [], error: 'Failed to load gallery', totalPages: 0, currentPage: 1 });
    }
  });

  app.delete<{ Params: { filename: string } }>('/api/gallery/image/:filename', async (req, reply) => {
    try {
      const { filename } = req.params;
      const sanitizedFilename = basename(filename);
      if (sanitizedFilename !== filename || !/^([\w.-]+)$/.test(sanitizedFilename)) {
        return reply.code(400).send({ error: 'Invalid filename' });
      }
      const cacheDir = await findCacheDir();
      if (!cacheDir) {
        return reply.code(404).send({ error: 'Cache directory not found' });
      }
      const imagePath = join(cacheDir, sanitizedFilename);
      if (!normalize(imagePath).startsWith(cacheDir)) {
          return reply.code(400).send({ error: 'Invalid path' });
      }
      await unlink(imagePath);
      app.log.info(`Deleted image: ${sanitizedFilename}`);
      return reply.send({ success: true, message: `Deleted ${sanitizedFilename}` });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return reply.code(404).send({ error: 'File not found' });
      }
      app.log.error(error, 'Failed to delete image');
      return reply.code(500).send({ error: 'Failed to delete image' });
    }
  });
}