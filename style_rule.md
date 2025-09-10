
## Что реализовать
- Доступные функции: только **Text‑to‑Image** и **Image‑to‑Image**, поле prompt, выбор n (1–6), в I2I — загрузка изображения как Data URL, никаких ratio, seed, CFG и т. п.[3][1]
- API: POST /api/generate с телом { prompt, n, mode, imageDataUrl? } и ответом { images: string[], error: string|null }; кешированные картинки доступны по /cache/*. [1]  
- Стек фронта: Vite + React 18 + TypeScript + @tanstack/react‑query; dev‑сервер проксирует /api и /cache на backend Fastify.[1]
- Модель: google/gemini‑2.5‑flash‑image‑preview через OpenRouter; у модели есть image‑output и поддержка мультиизображений за вызов.[2][4]

## System prompt для LLM
“Ты — старший фронтенд‑инженер и UX/UI‑дизайнер. Создай минималистичный, быстрый интерфейс под Vite + React + TypeScript и @tanstack/react‑query для генерации изображений на моём бэкенде. Допустимы только два режима: Text‑to‑Image и Image‑to‑Image. Для I2I загружай одно изображение и читай его как Data URL. Поддержи выбор количества изображений n (1–6). Выполняй POST на /api/generate с телом { prompt, n, mode, imageDataUrl? }. Покажи галерею результатов из массива images, обработай ошибки из поля error. Не добавляй параметры вроде ratio/seed/CFG. Сделай адаптивный, доступный (A11y) тёмный UI в духе референсов: левая навигация, центр — превью‑сет, справа — панель настроек. Используй нейминг компонентов и типы, указанные в технической спецификации ниже.”[3][1]

## User prompt (шаблон)
“Сгенерируй готовый проект (src/ui) на React + TS + React Query под Vite. Реализуй layout с левой колонкой и правой панелью. В правой панели: переключатель режима (Text↔Image), textarea для prompt, dropzone/file input для Image‑to‑Image (принимает PNG/JPEG и сохраняет Data URL), степпер n=1..6, кнопка Generate. При запуске запроса — прелоадер/прогресс, дизейбл контролов, отмена по кнопке Cancel. По успеху — сетка 2–3 колонки с ImageCard, на карточке: скачивание, копирование ссылки /cache/*, кнопка ‘Сохранить все’. Обработай ошибки из ответа и сети. Вынеси API клиент и типы. Напиши юнит‑тесты на валидацию формы и обработку состояний.”[1]

## Техническая спецификация
- Контракты типов:  
  - Mode: 'text-to-image' | 'image-to-image'; GenerateRequest: { prompt: string; n: number; mode: Mode; imageDataUrl?: string }; GenerateResponse: { images: string[]; error: string|null }. [1]  
- Ограничения: n в ; imageDataUrl обязателен в I2I; prompt trim() и длина > 0; запрет дополнительных параметров.[5][4][1]
- Сеть: POST /api/generate, Content‑Type: application/json; ответы логируй; таймаут UI 60s с повтором по кнопке Retry.[1]
- Файлы: изображение читается на клиенте через FileReader.readAsDataURL → строка data:image/*; передавать как imageDataUrl.[3][1]
- Галерея: отображать массив images из ответа; ссылки относительные (/cache/..); кнопка “Download all” запускает последовательные загрузки.[1]
- Состояния: Idle → Ready → Generating → Success/Error; показывать тосты и disable‑состояния.[1]

## Компонентная архитектура
- Shell: AppShell (Sidebar, Header, Main, RightPanel); тема — тёмная, стекло/неоморфизм по вкусу.[1]
- RightPanel: ModeSwitch, PromptArea, ImageDropzone (показывать превью), BatchSizeStepper, GenerateButton, CancelButton.[1]
- Main: GalleryGrid, ImageCard (preview, copy link, download), EmptyState, LoadingState, ErrorState.[1]
- Data: api/generateClient.ts, hooks/useGenerate.ts (useMutation), types/generate.ts.[1]

## UX‑гайдлайн (в духе референсов)
- Лейаут: фиксированная левая панель 240px, центральная галерея, правая панель 320–360px; на мобиле — панель вниз по accordion.[1]
- Копирайтинг: поля “Промпт”, “Режим”, “Изображение‑референс (для I2I)”, “Количество (1–6)”, “Сгенерировать”, “Отмена”, “Скачать”, “Копировать ссылку”.[1]
- Обратная связь: индикатор шага “Генерация n из N”, тосты “Генерация началась/успех/ошибка”, подсказки по I2I.[1]

## Поток взаимодействия
- Выбор режима: T2I скрывает загрузчик; I2I показывает dropzone и валидирует наличие imageDataUrl перед отправкой.[1]
- Валидация: кнопка Generate активна только при валидном prompt и n∈, а для I2I — при наличии imageDataUrl.[4][5][1]
- Запрос: отправка POST /api/generate; во время выполнения — спиннер, disable контролов, возможность Cancel (abort signal).[1]
- Ответ: если error — показываем ErrorState; если images.length>0 — рисуем сетку; по клику “Скачать” — fetch blob и saveAs.[1]

## Acceptance criteria
- В режиме I2I при отсутствии загруженного файла отображается ошибка и запрет отправки.[1]
- n ограничен ползунком/степпером 1..6 и валидируется перед запросом.[1]
- Все успешные пути дают кликабельные /cache/* миниатюры и скачивание файлов.[1]
- Нет скрытых параметров (ratio/seed/CFG); запрос содержит только { prompt, n, mode, imageDataUrl? }.[1]
- Реализованы состояния загрузки/ошибки, доступность (aria‑label, клавиатурная навигация), адаптив 360px+.[1]

## Минимальный код‑скелет (фрагменты)
```tsx
// src/types/generate.ts
export type Mode = 'text-to-image' | 'image-to-image';

export interface GenerateRequest {
  prompt: string;
  n: number;
  mode: Mode;
  imageDataUrl?: string;
}

export interface GenerateResponse {
  images: string[];
  error: string | null;
}
```

```tsx
// src/api/generateClient.ts
export async function generateImages(body: GenerateRequest, signal?: AbortSignal): Promise<GenerateResponse> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

```tsx
// src/hooks/useGenerate.ts
import { useMutation } from '@tanstack/react-query';
import { generateImages } from '../api/generateClient';
import type { GenerateRequest, GenerateResponse } from '../types/generate';

export function useGenerate() {
  return useMutation<GenerateResponse, Error, GenerateRequest>({
    mutationFn: (vars) => {
      const ctrl = new AbortController();
      // Позволяет отменять снаружи через vars.signal при необходимости
      return generateImages(vars, ctrl.signal);
    },
  });
}
```

```tsx
// src/ui/App.tsx (упрощённо)
import { useState } from 'react';
import { useGenerate } from '../hooks/useGenerate';
import type { Mode, GenerateRequest } from '../types/generate';

export default function App() {
  const [mode, setMode] = useState<Mode>('text-to-image');
  const [prompt, setPrompt] = useState('');
  const [n, setN] = useState(1);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const gen = useGenerate();

  const onFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => setImageDataUrl(String(r.result));
    r.readAsDataURL(f);
  };

  const onGenerate = () => {
    const payload: GenerateRequest = { prompt: prompt.trim(), n, mode, imageDataUrl: mode==='image-to-image' ? imageDataUrl : undefined };
    gen.mutate(payload);
  };

  return (
    <div className="app-shell">
      {/* Sidebar ... */}
      <main>
        {/* RightPanel controls */}
        <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="text-to-image">Text-to-Image</option>
          <option value="image-to-image">Image-to-Image</option>
        </select>

        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Опишите, что создать..." />

        {mode === 'image-to-image' && (
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => e.target.files && onFile(e.target.files)} />
        )}

        <input type="number" min={1} max={6} value={n} onChange={(e) => setN(Number(e.target.value))} />

        <button disabled={gen.isPending || !prompt.trim() || (mode==='image-to-image' && !imageDataUrl)} onClick={onGenerate}>
          {gen.isPending ? 'Генерация…' : 'Сгенерировать'}
        </button>

        {/* Gallery */}
        <section className="grid">
          {gen.data?.images?.map((src) => (
            <figure key={src}><img src={src} alt="Generated" /></figure>
          ))}
        </section>

        {gen.data?.error && <div role="alert">{gen.data.error}</div>}
      </main>
    </div>
  );
}
```
Этот скелет следует контракту /api/generate, обрабатывает Data URL для I2I и показывает результаты из массива images, оставляя стилизацию под выбранный визуальный референс.[2][3][1]

## Заметки для модели
- Соблюдать структуру проекта и прокси dev‑сервера; не переносить ключи в фронт.[1]
- Использовать тёмную тему с правой панелью управления и сеткой результатов, как в референсах, без добавления недоступных параметров.[1]
- В комментариях кода пометить, где расширять функциональность (история генераций, прогресс, пресеты) без изменения текущих API.[1]

## Короткий бриф для копипаста
“Нужен UI под готовый Fastify‑backend: только Text‑to‑Image и Image‑to‑Image, prompt, n=1..6, загрузка I2I как Data URL, POST /api/generate, ответ { images, error }. Сборка Vite + React + TS, данные — @tanstack/react‑query. Тёмный layout: левый сайдбар, центр — галерея, справа — панель настроек (режим, prompt, загрузка, n, Generate/Cancel). Состояния: Idle/Generating/Success/Error, тосты и доступность. Без параметров вроде ratio/seed/CFG. Выдай готовые компоненты, типы, хуки и базовые стили.”[3][1]

## Источники и контекст
- API контракты, стек, маршруты, прокси и ограничения n=1..6 — из вашего README проекта.[1]
- Поддержка image‑выхода и статус модели Gemini 2.5 Flash Image Preview в OpenRouter и анонсы — из документации и страниц модели.[4][2]
- Требования к передаче изображений как base64 Data URL для мультимодальных запросов — из мультимодальной документации OpenRouter.[3]

[1](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/75231213/3435acc3-9f9f-4940-96a8-943d0b336f83/README.md)
[2](https://openrouter.ai/google/gemini-2.5-flash-image-preview:free)
[3](https://openrouter.ai/docs/features/multimodal/overview)
[4](https://openrouter.ai/announcements/the-first-ever-image-model-is-up-on-openrouter)
[5](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/75231213/03dadc7a-6acf-43fd-a3fb-0429e6532e2b/image.jpg?AWSAccessKeyId=ASIA2F3EMEYEWO7KGBBS&Signature=rjl%2F1yecxFEG1egjVDZMbayUR0k%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEDsaCXVzLWVhc3QtMSJIMEYCIQDrdF3iz1qpfBXU5zdj6I8MgswqySbI48QqAowPL3%2FtnAIhANp4LC%2BeVj7qnAuyS2Gfzsl8dxboIYTrpYoYHOF85E8iKvoECJT%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgyC1xAZ2ShRW6GIW%2B8qzgTLVXGSSPSsAIhzJRIGgOoLjBHAzdxUFxnoMSltX%2Bd9eGagoYkD%2BDgfsv%2Bgh8cCfxNY3qJ4l1npf1v5sB3pZrqH8v8nR3GckMImZF3zpp3aJ1Bj4n7S0U6rkymZdU5Mb%2BJYwgGDnvHRhAAmIRS5tajUp6BPtt37xJXvLbHUZgYwSptBBRKfuYYDyfVSO9NVFkMTCMfSXly2nIHioKSIabMS4GH7EQw1Il5CDxr2qwf1tGeMnN%2B1KcjkppBaQjxS6JX5rs5Y9QI3OnDcxSahi4ileEdwUPllSeiPTk2kEaQoxgbgAIHKXb2bc3OBuuPCTZM8pEj8KgaWwJkGTyYfOBN%2Fdm%2FEo0eFAdAAtISoBhySUZbomgeHc5ww2fYKM8do18DBh%2FzWUADicG0D5RgkTzgs47myywSgxrpfso2AiLjBbT%2FQtZoJcL4QVMrQxVzP41Bjzu%2BVVI5YLbopMsWD2%2FZHvdDK%2Bz9Y%2BPF5zjrO390gt4%2Ba45KciIdFkFltF6%2FgYKgec3ljH%2BIr44ulCZpAMIxs0mgqqp%2BcIhGmT%2FZ1MK13SfwI00Ks3Nn8iEtIxEkrHMTy2vZIE2W1KyvnypOyvJjoIU8AJ8LSrvvoRdZ8zZEsTrCQU21yVKTgMFc%2Fn199zCLt4hKdX1HQe3ow6Pnw3yEXGgGup3Xw%2BuV6o0SauIY6tdwBngyKjISgTXtr2HFYehxwWUESTO04ctlb9LV7zz7YFikiN5vV2wE1c20pu%2BAlWGPzfYFjM5dCpBKt%2B6NCFbWz%2F%2Fr%2Buvv%2BYJ4bhzjlkzDunL3FBjqZAfd14c63qpb0vzmyk55F3lRSkBDibebAKi%2Fwx4e91rm%2F%2FpTaJnDHaApWYwEl6gpsO6kJSEfSI4rC94m46mQEWB%2Bdl04fyvYKBS1E5Lq7eilwUynMabSW6CuGQyUSPBp3P2CBJcOSfwJpFcaqfdL1JUZNCopdn4F%2B3TJLUr1FRFext9PXlfg3BTetA7Dfj%2FeRYA4krtygFgFDjg%3D%3D&Expires=1756320743)
[6](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/75231213/2e3f3777-c8a4-4e25-aa2e-5f160edb3365/image.jpg?AWSAccessKeyId=ASIA2F3EMEYEWO7KGBBS&Signature=ztLfDF0j6o7MGLuN%2BTQIvZJTegI%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEDsaCXVzLWVhc3QtMSJIMEYCIQDrdF3iz1qpfBXU5zdj6I8MgswqySbI48QqAowPL3%2FtnAIhANp4LC%2BeVj7qnAuyS2Gfzsl8dxboIYTrpYoYHOF85E8iKvoECJT%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgyC1xAZ2ShRW6GIW%2B8qzgTLVXGSSPSsAIhzJRIGgOoLjBHAzdxUFxnoMSltX%2Bd9eGagoYkD%2BDgfsv%2Bgh8cCfxNY3qJ4l1npf1v5sB3pZrqH8v8nR3GckMImZF3zpp3aJ1Bj4n7S0U6rkymZdU5Mb%2BJYwgGDnvHRhAAmIRS5tajUp6BPtt37xJXvLbHUZgYwSptBBRKfuYYDyfVSO9NVFkMTCMfSXly2nIHioKSIabMS4GH7EQw1Il5CDxr2qwf1tGeMnN%2B1KcjkppBaQjxS6JX5rs5Y9QI3OnDcxSahi4ileEdwUPllSeiPTk2kEaQoxgbgAIHKXb2bc3OBuuPCTZM8pEj8KgaWwJkGTyYfOBN%2Fdm%2FEo0eFAdAAtISoBhySUZbomgeHc5ww2fYKM8do18DBh%2FzWUADicG0D5RgkTzgs47myywSgxrpfso2AiLjBbT%2FQtZoJcL4QVMrQxVzP41Bjzu%2BVVI5YLbopMsWD2%2FZHvdDK%2Bz9Y%2BPF5zjrO390gt4%2Ba45KciIdFkFltF6%2FgYKgec3ljH%2BIr44ulCZpAMIxs0mgqqp%2BcIhGmT%2FZ1MK13SfwI00Ks3Nn8iEtIxEkrHMTy2vZIE2W1KyvnypOyvJjoIU8AJ8LSrvvoRdZ8zZEsTrCQU21yVKTgMFc%2Fn199zCLt4hKdX1HQe3ow6Pnw3yEXGgGup3Xw%2BuV6o0SauIY6tdwBngyKjISgTXtr2HFYehxwWUESTO04ctlb9LV7zz7YFikiN5vV2wE1c20pu%2BAlWGPzfYFjM5dCpBKt%2B6NCFbWz%2F%2Fr%2Buvv%2BYJ4bhzjlkzDunL3FBjqZAfd14c63qpb0vzmyk55F3lRSkBDibebAKi%2Fwx4e91rm%2F%2FpTaJnDHaApWYwEl6gpsO6kJSEfSI4rC94m46mQEWB%2Bdl04fyvYKBS1E5Lq7eilwUynMabSW6CuGQyUSPBp3P2CBJcOSfwJpFcaqfdL1JUZNCopdn4F%2B3TJLUr1FRFext9PXlfg3BTetA7Dfj%2FeRYA4krtygFgFDjg%3D%3D&Expires=1756320743)
[7](https://developers.googleblog.com/en/introducing-gemini-2-5-flash-image/)
[8](https://openrouter.ai/models?q=gemini)
[9](https://openrouter.ai/provider/google-ai-studio)
[10](https://ai.google.dev/gemini-api/docs/openai)
[11](https://openrouter.ai/models?fmt=cards&output_modalities=image)
[12](https://www.youtube.com/watch?v=U2kbByQY0cI)
[13](https://ai.google.dev/gemini-api/docs/image-generation)