import React from 'react';
import { useGenerate } from './hooks/useGenerate';
import { useGallery } from './hooks/useGallery';
import type { Mode, GenerateBody } from './types/generate';
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

  // Initial gallery fetch
  React.useEffect(() => {
    if (!gallery.data && !gallery.isLoading && !gallery.isError) {
      gallery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allGalleryImages = React.useMemo(() => {
    return gallery.data?.pages.flatMap(page => page.images) || [];
  }, [gallery.data]);

  const newImages = React.useMemo(() => {
    return gen.data?.images.map(path => ({ 
      path, 
      filename: path.split('/').pop()!,
      timestamp: Date.now(),
      size: 0 // Недоступно для свежесгенерированных
    })) || [];
  }, [gen.data]);

  const [mode, setMode] = React.useState<Mode>('text-to-image');
  const [prompt, setPrompt] = React.useState('A photorealistic image of a red cat astronaut floating in space');
  const [n, setN] = React.useState(1);
  const [aspectRatio, setAspectRatio] = React.useState('1:1');
  const [canvasColor, setCanvasColor] = React.useState('#000000');
  const [useAspectRatioCanvas, setUseAspectRatioCanvas] = React.useState(false);
  const [isAspectRatioSectionOpen, setIsAspectRatioSectionOpen] = React.useState(false);
  const [imageDataUrls, setImageDataUrls] = React.useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);
  const [lastPayload, setLastPayload] = React.useState<GenerateBody | null>(null);

  const MAX_IMAGES = 5;

  const handleMoveToReference = async (imagePath: string) => {
    try {
      // 1. Fetch the image
      const response = await fetch(imagePath);
      const blob = await response.blob();

      // 2. Convert to a base64 data URL
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // 3. Update state
        if (imageDataUrls.length < MAX_IMAGES) {
          setImageDataUrls(prev => [...prev, dataUrl]);
          setImagePreviews(prev => [...prev, dataUrl]);
        }
        // 4. Switch mode
        setMode('image-to-image');
        toast.push({ kind: 'info', text: 'Изображение добавлено в референсы' });
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Failed to move image to reference:', error);
      toast.push({ kind: 'error', text: 'Не удалось переместить изображение' });
    }
  };

  const onToggleAspectRatioSection = () => {
    const newIsOpenState = !isAspectRatioSectionOpen;
    setIsAspectRatioSectionOpen(newIsOpenState);
    setUseAspectRatioCanvas(newIsOpenState);
  };

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

  const handleGeneration = (payload: GenerateBody) => {
    setLastPayload(payload);
    gen.mutate(payload, {
      onSuccess: () => setTimeout(() => gallery.refetch(), 2000),
      onError: (e: any) => {
        toast.push({ kind: 'error', text: e.message || 'Ошибка генерации' });
      },
    });
  };

  const onGenerate = () => {
    if (!canGenerate) return;
    let payload: GenerateBody;
    if (useAspectRatioCanvas) {
      const canvasDataUrl = generateBlankCanvasDataUrl(aspectRatio, canvasColor);
      const modifiedPrompt = `${prompt.trim()} Соотношение сторон как у приложенного холста.`;
      const finalImageDataUrls = mode === 'text-to-image' ? [canvasDataUrl] : [...imageDataUrls, canvasDataUrl];
      payload = { prompt: modifiedPrompt, n, mode: 'image-to-image', imageDataUrls: finalImageDataUrls };
    } else {
      payload = { prompt: prompt.trim(), n, mode, imageDataUrls: mode === 'image-to-image' ? imageDataUrls : [] };
    }
    handleGeneration(payload);
  };

  const onRetry = () => {
    if (lastPayload) {
      handleGeneration(lastPayload);
    }
  };

  return (
    <div className="ng-shell">
      <Sidebar />
      <main className="ng-main">
        <header className="ng-header">
          <h1>Gemini 2.5 — Image Generation</h1>
          {gen.isPending && <div className="progress-text">Генерация...</div>}
        </header>
        <div className="content">
          {gen.isPending ? (
            <SkeletonGrid count={n} />
          ) : newImages.length > 0 ? (
            <>
              <Gallery 
                images={newImages} 
                title="Новая генерация" 
                onMoveToReference={handleMoveToReference}
              />
              <Gallery 
                images={allGalleryImages} 
                title="Все изображения" 
                onLoadMore={() => gallery.fetchNextPage()}
                hasMore={gallery.hasNextPage}
                isLoadingMore={gallery.isFetchingNextPage}
                onMoveToReference={handleMoveToReference}
              />
            </>
          ) : gen.isError ? (
            <div className="empty-state error-state">
              <div className="icon">⚠️</div>
              <h3>Ошибка генерации</h3>
              <p>{gen.error?.message || 'Что-то пошло не так'}</p>
              {lastPayload && <button className="secondary" onClick={onRetry}>Повторить</button>}
            </div>
          ) : (
            <div className="content-with-gallery">
              {allGalleryImages.length > 0 ? (
                <Gallery 
                  images={allGalleryImages} 
                  title="Все изображения" 
                  onLoadMore={() => gallery.fetchNextPage()}
                  hasMore={gallery.hasNextPage}
                  isLoadingMore={gallery.isFetchingNextPage}
                  onMoveToReference={handleMoveToReference}
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
                <div className="empty-state">
                  <div className="icon">🎨</div>
                  <h3>Начните создавать</h3>
                  <p>Введите описание и нажмите «Сгенерировать»</p>
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
        isAspectRatioSectionOpen={isAspectRatioSectionOpen}
        onToggleAspectRatioSection={onToggleAspectRatioSection}
        canvasColor={canvasColor}
        setCanvasColor={setCanvasColor}
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
        error={gen.isError ? gen.error.message : undefined}
        onRetry={onRetry}
      />
      <ToastContainer toasts={toast.toasts} remove={toast.remove} />
    </div>
  );
}