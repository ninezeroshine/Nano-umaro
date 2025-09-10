import React from 'react';
import { useGenerate } from './hooks/useGenerate';
import { useGallery } from './hooks/useGallery';
import type { Mode } from './types/generate';
import { Sidebar } from './components/Sidebar';
import { RightPanel } from './components/RightPanel';
import { Gallery } from './components/Gallery';
import { SkeletonGrid } from './components/SkeletonGrid';
import { useToasts, ToastContainer } from './components/Toasts';
import { generateBlankCanvasDataUrl } from './utils/canvas';

export function AppShell() {
  const gen = useGenerate();
  const gallery = useGallery();
  const toast = useToasts();
  
  // Инициальная загрузка галереи только один раз
  React.useEffect(() => {
    if (!gallery.data && !gallery.isLoading && !gallery.isError) {
      gallery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Логируем только ошибки галереи
  React.useEffect(() => {
    if (gallery.isError) {
      console.error('❌ Ошибка загрузки галереи:', gallery.error);
    }
  }, [gallery.isError, gallery.error]);

  // Объединяем все страницы с изображениями в один плоский массив
  const allGalleryImages = React.useMemo(() => {
    return gallery.data?.pages.flatMap(page => page.images.map(img => img.path)) || [];
  }, [gallery.data]);

  const [mode, setMode] = React.useState<Mode>('text-to-image');
  const [prompt, setPrompt] = React.useState('A photorealistic image of a red cat astronaut floating in space');
  const [n, setN] = React.useState(1);
  const [aspectRatio, setAspectRatio] = React.useState('1:1');
  const [imageDataUrls, setImageDataUrls] = React.useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);
  const MAX_IMAGES = 5;

  const onFiles = (files: File[]) => {
    const readers = files.slice(0, MAX_IMAGES - imagePreviews.length).map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(newUrls => {
      setImageDataUrls(prev => [...prev, ...newUrls]);
      setImagePreviews(prev => [...prev, ...newUrls]);
    });
  };

  const onClearImage = (index: number) => {
    setImageDataUrls(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const canGenerate = prompt.trim().length > 0 && n >= 1 && n <= 6 && (mode === 'text-to-image' || imageDataUrls.length > 0);

  const onGenerate = () => {
    if (!canGenerate) return;

    // 1. Генерируем белый холст с нужным соотношением сторон
    const canvasDataUrl = generateBlankCanvasDataUrl(aspectRatio);

    // 2. Модифицируем промпт, делая его коротким и ясным
    const modifiedPrompt = `${prompt.trim()} Соотношение сторон как у приложенного черного холста.`;

    // 3. Собираем финальный массив изображений для отправки
    //    - В режиме T2I - только холст
    //    - В режиме I2I - сначала пользовательские изображения, потом холст (чтобы он был последней "инструкцией")
    const finalImageDataUrls = mode === 'text-to-image' 
      ? [canvasDataUrl] 
      : [...imageDataUrls, canvasDataUrl];
    
    // 4. Формируем payload. Режим всегда 'image-to-image', если выбран aspect ratio
    const payload = { 
      prompt: modifiedPrompt, 
      n, 
      mode: 'image-to-image' as Mode, // Принудительно ставим режим I2I
      imageDataUrls: finalImageDataUrls
    };
    
    gen.mutate(
      payload,
      {
        onSuccess: (data) => {
          toast.push({ kind: 'success', text: `Готово: ${data.images.length} изображ.` });
          // Обновляем галерею через большую задержку для стабильности
          setTimeout(() => gallery.refetch(), 2000);
        },
        onError: (e) => {
          console.error('❌ Ошибка генерации:', e);
          
          // Пытаемся извлечь расширенную информацию об ошибке из response
          let errorText = (e as Error).message || 'Ошибка генерации';
          let suggestions: string[] | undefined;
          let retryable: boolean | undefined;
          
          try {
            // Если в ошибке есть дополнительная информация из API
            const errorMessage = (e as any)?.message || '';
            if (errorMessage.includes('Рекомендации:')) {
              const parts = errorMessage.split('Рекомендации:');
              errorText = parts[0].trim();
              const suggestionsText = parts[1]?.trim();
              if (suggestionsText) {
                suggestions = suggestionsText
                  .split('• ')
                  .filter((s: string) => s.trim())
                  .map((s: string) => s.trim());
              }
            }
          } catch (err) {
            console.warn('Не удалось парсить расширенную информацию об ошибке:', err);
          }
          
          toast.push({ 
            kind: 'error', 
            text: errorText,
            suggestions,
            retryable
          });
        },
      }
    );
  };

  const onRetry = () => {
    gen.reset();
    onGenerate();
  };

  return (
    <div className="ng-shell">
      <Sidebar />
      <main className="ng-main">
        <header className="ng-header">
          <h1>Gemini 2.5 — Image Generation</h1>
          {gen.isPending && <div className="progress-text">Генерация {n > 1 ? `1-${n}` : '1'} из {n}…</div>}
        </header>
        
        {gen.isPending && (
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" />
            </div>
          </div>
        )}

        <div className="content">
          {gen.isPending ? (
            <SkeletonGrid count={n} />
          ) : gen.data?.images?.length ? (
            <>
              <Gallery images={gen.data.images} title="Новая генерация" />
              {allGalleryImages.length > 0 ? (
                <Gallery 
                  images={allGalleryImages} 
                  title="Все изображения" 
                  showActions={false}
                  onLoadMore={() => gallery.fetchNextPage()}
                  hasMore={gallery.hasNextPage}
                  isLoadingMore={gallery.isFetchingNextPage}
                />
              ) : null}
            </>
          ) : gen.isError ? (
            <>
              <div className="empty-state error-state">
                <div className="icon">⚠️</div>
                <h3>Ошибка генерации</h3>
                <p>{gen.error?.message || 'Что-то пошло не так'}</p>
                <button className="secondary" onClick={onRetry}>Повторить</button>
              </div>
              {allGalleryImages.length > 0 ? (
                <Gallery 
                  images={allGalleryImages} 
                  title="Все изображения" 
                  showActions={false}
                  onLoadMore={() => gallery.fetchNextPage()}
                  hasMore={gallery.hasNextPage}
                  isLoadingMore={gallery.isFetchingNextPage}
                />
              ) : null}
            </>
          ) : (
            <div className="content-with-gallery">
              <div className="empty-state">
                <div className="icon">🎨</div>
                <h3>Начните создавать</h3>
                <p>Введите описание и нажмите «Сгенерировать»</p>
              </div>
              {allGalleryImages.length > 0 ? (
                <Gallery 
                  images={allGalleryImages} 
                  title="Все изображения" 
                  showActions={false}
                  onLoadMore={() => gallery.fetchNextPage()}
                  hasMore={gallery.hasNextPage}
                  isLoadingMore={gallery.isFetchingNextPage}
                />
              ) : gallery.isLoading ? (
                <div className="loading-gallery">Загрузка галереи...</div>
              ) : gallery.isError ? (
                <div className="gallery-error">
                  <div className="icon">📁</div>
                  <div>Ошибка загрузки галереи: {gallery.error?.message}</div>
                  <button className="secondary" onClick={() => gallery.refetch()}>Повторить</button>
                </div>
              ) : (
                <div className="no-gallery">
                  <div className="icon">📂</div>
                  <div>Галерея пуста</div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      <RightPanel 
        mode={mode} 
        setMode={setMode} 
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        prompt={prompt} 
        setPrompt={setPrompt} 
        n={n} 
        setN={setN} 
        onFiles={onFiles} 
        previews={imagePreviews}
        onClearImage={onClearImage}
        canGenerate={canGenerate} 
        generating={gen.isPending} 
        onGenerate={onGenerate}
        onCancel={gen.cancel}
        error={gen.isError ? gen.error?.message : undefined}
        onRetry={onRetry}
      />
      
      <ToastContainer toasts={toast.toasts} remove={toast.remove} />
    </div>
  );
}


