import type { FastifyInstance } from 'fastify';
import { readdir, stat, access } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { constants } from 'fs';
import { fileURLToPath } from 'url';

// Получаем __dirname в ES модуле
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface GalleryImage {
  filename: string;
  path: string;
  timestamp: number;
  size: number;
}

interface GalleryQuery {
  page?: string;
  limit?: string;
}

export function registerGalleryRoute(app: FastifyInstance) {
  app.get<{ Querystring: GalleryQuery }>('/api/gallery', { 
    config: { 
      rateLimit: false // Полностью отключаем rate limiting для галереи
    } 
  }, async (req, reply) => {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '12', 10);

      // Пробуем разные пути к cache
      const possiblePaths = [
        resolve(process.cwd(), '..', 'public', 'cache'),     // Если запускаем из backend/
        resolve(process.cwd(), 'public', 'cache'),           // Если запускаем из корня
        resolve(__dirname, '..', '..', '..', 'public', 'cache'), // Относительно compiled JS
      ];
      
      let cacheDir = '';
      let files: string[] = [];
      
      for (const path of possiblePaths) {
        try {
          // Проверяем доступность директории
          await access(path, constants.R_OK);
          files = await readdir(path);
          cacheDir = path;
          break;
        } catch (error: any) {
          // Молча пропускаем недоступные пути
        }
      }
      
      if (!cacheDir) {
        return reply.send({ images: [], totalPages: 0, currentPage: 1 });
      }
      
      const imageFiles = files.filter(file => 
        file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
      );

      const images: GalleryImage[] = [];
      
      for (const filename of imageFiles) {
        const filePath = join(cacheDir, filename);
        const stats = await stat(filePath);
        
        // Извлекаем timestamp из имени файла (формат: timestamp-id.ext)
        const timestampMatch = filename.match(/^(\d+)-/);
        const timestamp = timestampMatch && timestampMatch[1] ? parseInt(timestampMatch[1]) : stats.mtimeMs;
        
        images.push({
          filename,
          path: `/cache/${filename}`,
          timestamp,
          size: stats.size
        });
      }

      // Сортируем по времени создания (новые сначала)
      images.sort((a, b) => b.timestamp - a.timestamp);

      // Применяем пагинацию
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
      // Молча возвращаем ошибку без логирования
      return reply.code(500).send({ images: [], error: 'Failed to load gallery', totalPages: 0, currentPage: 1 });
    }
  });
}
