import React from 'react';
import { ImageModal } from './ImageModal';

export interface GalleryProps {
  images: string[];
  title?: string;
  showActions?: boolean;
  // Для infinite scroll
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function Gallery({ 
  images, 
  title, 
  showActions = true,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: GalleryProps) {
  const [modalImage, setModalImage] = React.useState<string | null>(null);
  const observer = React.useRef<IntersectionObserver>();

  // Этот callback будет следить за последним элементом в галерее.
  // Как только он появится на экране, вызовется onLoadMore.
  const lastImageRef = React.useCallback(node => {
    if (isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && onLoadMore) {
        onLoadMore();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoadingMore, hasMore, onLoadMore]);

  if (!images?.length) return <div className="info">Пока нет изображений</div>;

  const onDownloadAll = async () => {
    for (const url of images) {
      const a = document.createElement('a');
      a.href = url;
      a.download = url.split('/').pop() || 'image.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise(r => setTimeout(r, 200));
    }
  };

  return (
    <section className="ng-gallery">
      {title && <h3 className="gallery-title">{title}</h3>}
      {showActions && (
        <div className="gallery-actions">
          <button onClick={onDownloadAll}>Скачать все ({images.length})</button>
        </div>
      )}
      <div className="grid">
        {images.map((src, index) => {
          const isLast = index === images.length - 1;
          return (
            <figure 
              key={src + index} 
              className="card"
              // Если это последний элемент, вешаем на него "наблюдатель"
              ref={isLast ? lastImageRef : null}
            >
              <img 
                src={src} 
                alt="Generated" 
                onClick={() => setModalImage(src)}
                style={{ cursor: 'pointer' }}
                title="Нажмите для увеличения"
              />
              <figcaption>
                <button onClick={() => setModalImage(src)} className="view-btn">Увеличить</button>
                <a href={src} download>Скачать</a>
                <button onClick={() => navigator.clipboard.writeText(location.origin + src)}>Копировать</button>
              </figcaption>
            </figure>
          )
        })}
      </div>
      
      {isLoadingMore && <div className="loading-gallery">Загрузка...</div>}
      
      {modalImage && (
        <ImageModal 
          src={modalImage} 
          onClose={() => setModalImage(null)}
        />
      )}
    </section>
  );
}