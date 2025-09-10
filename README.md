## Nano Generator — генерация изображений через Google Vertex AI (Gemini 2.5 Flash Image Preview)

Этот репозиторий содержит минималистичный сервис для генерации изображений на базе модели Google Gemini 2.5 Flash Image Preview через API Vertex AI.

Сервис состоит из:

- **Backend**: Fastify (Node.js + TypeScript) — безопасный прокси к Vertex AI с кэшированием, обработкой ошибок и управлением параллельными запросами.
- **Frontend**: Vite + React + TypeScript — современный и отзывчивый интерфейс с режимами text-to-image и image-to-image, галереей и панелью настроек.

Новый пользовательский интерфейс был спроектирован и реализован на основе подробного технического задания, изложенного в файле [`style_rule.md`](./style_rule.md).

## Быстрый старт (Windows)

**Рекомендуемый способ запуска — использование скрипта `start-nano.cmd`.**

1.  Дважды кликните по файлу `start-nano.cmd` в корне проекта.
2.  Скрипт автоматически установит все необходимые зависимости (если их нет), запустит бэкенд и фронтенд в двух отдельных окнах терминала.
3.  В браузере автоматически откроется страница приложения `http://127.0.0.1:5173`.

Для остановки просто закройте оба окна терминала.

## Технологический стек

### Backend

- Node.js 20+
- TypeScript
- Fastify
- Google Vertex AI SDK
- pino / pino-pretty (структурированное логирование)
- p-limit (управление параллелизмом)

### Frontend

- Vite
- React 18 + TypeScript
- @tanstack/react-query (управление состоянием сервера)

## Структура проекта (основное)

```
backend/
  src/
    config.ts              # конфигурация из .env и vertex-ai-key.json
    server.ts              # Fastify-сервер, CORS/rate-limit
    routes/
      generate.ts          # POST /api/generate (text-to-image, image-to-image)
      gallery.ts           # GET /api/gallery (получение списка изображений)
    services/
      vertexAI.ts          # логика взаимодействия с Google Vertex AI
      cache.ts             # сохранение изображений в public/cache
frontend/
  src/
    ui2/                   # Исходный код нового интерфейса
      AppShell.tsx         # Корневой компонент UI
      components/          # Переиспользуемые компоненты (галерея, сайдбар и т.д.)
      hooks/               # React Query хуки (useGenerate, useGallery)
      api/                 # Клиенты для взаимодействия с API бэкенда
  vite.config.ts           # dev-сервер c host=127.0.0.1 и прокси на backend
public/
  cache/                   # сохранённые изображения (доступны по /cache/...)
start-nano.cmd             # Скрипт для запуска всего проекта
vertex-ai-key.json         # Ключ сервис-аккаунта Google Cloud (ВАЖНО: не коммитить)
style_rule.md              # Техническое задание на разработку UI
```

## Конфигурация и запуск

### 1. Ключ доступа Google Vertex AI

Для работы с Vertex AI требуется ключ сервис-аккаунта Google Cloud.

1.  Создайте сервис-аккаунт в вашем проекте Google Cloud с ролью `Vertex AI User`.
2.  Создайте и скачайте JSON-ключ для этого аккаунта.
3.  Переименуйте скачанный файл в `vertex-ai-key.json` и поместите его в корень проекта.

**Важно:** Этот файл содержит секретные данные. Он уже добавлен в `.gitignore` и не должен попадать в репозиторий.

### 2. Переменные окружения (.env)

В папке `backend/` должен находиться файл `.env`. Он используется для базовой конфигурации.

```ini
# Модель, используемая для генерации
IMAGE_MODEL=gemini-2.5-pro-flash-image-preview-0827

# Порт для бэкенд-сервера
PORT=3000

# Таймаут для запросов к Vertex AI (в миллисекундах)
REQUEST_TIMEOUT_MS=60000
```

## Контракт API (backend)

### GET /api/gallery

Возвращает список ранее сгенерированных изображений.
Ответ (успех):

```json
{
  "images": [
    {
      "filename": "167...-1.png",
      "path": "/cache/167...-1.png",
      "timestamp": 167...,
      "size": 123456
    }
  ]
}
```

### POST /api/generate

Генерирует новые изображения.
Тело запроса:

```json
{
  "prompt": "A photorealistic image of a red cat astronaut in space",
  "n": 1,
  "mode": "text-to-image" | "image-to-image",
  "imageDataUrl": "data:image/png;base64,..."   // только для image-to-image
}
```

Ответ (успех):

```json
{
  "images": ["/cache/167...-1.png", "/cache/167...-2.png"],
  "error": null
}
```

Ответ (ошибка):

```json
{
  "images": [],
  "error": "Vertex AI Error: The model ..."
}
```

## Тестирование из терминала (PowerShell)

Для тестирования API бэкенда можно использовать `Invoke-RestMethod` в PowerShell.

**Text-to-image:**

```powershell
$json = '{"prompt":"Red cat astronaut", "n":1, "mode":"text-to-image"}'
Invoke-RestMethod -Uri http://localhost:3000/api/generate -Method Post -ContentType 'application/json' -Body $json
```

**Image-to-image:**

```powershell
# Замените 'iVBORw0K...' на ваш base64-код изображения
$img = 'data:image/png;base64,iVBORw0K...'
$json = '{"prompt":"Enhance details", "n":1, "mode":"image-to-image", "imageDataUrl":"' + $img + '"}'
Invoke-RestMethod -Uri http://localhost:3000/api/generate -Method Post -ContentType 'application/json' -Body $json
```

## Траблшутинг

- **Ошибка аутентификации Vertex AI:** Убедитесь, что файл `vertex-ai-key.json` находится в корне проекта, он корректен и у сервис-аккаунта есть необходимые права.
- **Галерея не загружается / картинки сломаны:** Убедитесь, что фронтенд-сервер (`vite`) запущен и доступен по адресу `http://127.0.0.1:5173`. Проблема, связанная с проксированием статики, была исправлена в `vite.config.ts`.
- **Ошибки от Vertex AI (e.g. quota exceeded):** Проверьте квоты и лимиты в вашей консоли Google Cloud.
- **Предупреждение `punycode` в консоли бэкенда:** Это системное предупреждение от Node.js. Оно не влияет на работу приложения и на данный момент может быть проигнорировано.

## Безопасность

- **Никогда не переносите ключ `vertex-ai-key.json` на фронтенд.**
- Файл ключа и `.env` не должны коммититься в систему контроля версий.
