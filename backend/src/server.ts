import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { config } from './config';

const loggerConfig = config.debug 
  ? {
      level: 'info' as const, // Временно возвращаем info для диагностики
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    }
  : {
      level: 'error' as const, // В продакшене только ошибки
    };

const app = Fastify({
  logger: loggerConfig,
  bodyLimit: 25 * 1024 * 1024,
  disableRequestLogging: false, // Временно включаем логирование для диагностики
});

async function registerPlugins() {
  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    skipOnError: true,
    // Исключаем галерею и статические файлы из rate limit
    skip: (request: any) => {
      const url = request.url;
      return url.startsWith('/cache/') || url.startsWith('/api/gallery') || url === '/health';
    }
  } as any);

  const publicDir = path.resolve(process.cwd(), '../public');
  
  // Регистрируем всю публичную папку, включая cache
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    decorateReply: false,
    // Добавляем настройки для лучшей работы с изображениями
    setHeaders: (reply: any, path: string) => {
      if (path.includes('/cache/')) {
        reply.header('Cache-Control', 'public, max-age=86400'); // 24 часа кэша
      }
    }
  });
}

async function registerRoutes() {
  app.get('/health', async () => ({ status: 'ok' }));
  
  // Тестовый маршрут для проверки папки cache
  app.get('/debug/cache', async (req, reply) => {
    const publicDir = path.resolve(process.cwd(), '../public');
    const cacheDir = path.join(publicDir, 'cache');
    
    try {
      const { readdir, stat } = await import('fs/promises');
      const files = await readdir(cacheDir);
      const details = await Promise.all(
        files.slice(0, 5).map(async (file) => {
          const filePath = path.join(cacheDir, file);
          const stats = await stat(filePath);
          return {
            name: file,
            size: stats.size,
            url: `/cache/${file}`
          };
        })
      );
      
      return {
        cacheDir,
        totalFiles: files.length,
        sampleFiles: details
      };
    } catch (error: any) {
      return { error: error.message, cacheDir };
    }
  });
  
  const { registerGenerateRoute } = await import('./routes/generate');
  const { registerGalleryRoute } = await import('./routes/gallery');
  registerGenerateRoute(app as any);
  registerGalleryRoute(app as any);
}

export async function start() {
  await registerPlugins();
  await registerRoutes();

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info({
      port: config.port,
      siteUrl: config.siteUrl,
      siteName: config.siteName,
    }, 'Server started');
  } catch (err) {
    app.log.error(err, 'Server failed to start');
    process.exit(1);
  }
}

start();


