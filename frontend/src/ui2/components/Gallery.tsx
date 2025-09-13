import React from 'react';
import { ImageModal } from './ImageModal';
import { useDeleteImage } from '../hooks/useGallery';
import type { GalleryImage } from '../types/gallery'; // Import from central types

export interface GalleryProps {
  images: GalleryImage[];
  title?: string;
  showActions?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onMoveToReference?: (imagePath: string) => void;
}

export function Gallery({ 
  images, 
  title, 
  showActions = true,
  onLoadMore,
  hasMore,
  isLoadingMore,
  onMoveToReference = () => {},
}: GalleryProps) {
  const [modalImage, setModalImage] = React.useState<GalleryImage | null>(null);
  const deleteMutation = useDeleteImage();
  const observer = React.useRef<IntersectionObserver>();

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

  if (!images?.length) return null; // Return null instead of a div

  const onDownloadAll = async () => {
    for (const image of images) {
      const a = document.createElement('a');
      a.href = image.path;
      a.download = image.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise(r => setTimeout(r, 200));
    }
  };

  const handleDelete = (filename: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить ${filename}?`)) {
      deleteMutation.mutate(filename);
    }
  };

  return (
    <section className="ng-gallery">
      {title && <h3 className="gallery-title">{title}</h3>}
      {showActions && images.length > 1 && (
        <div className="gallery-actions">
          <button onClick={onDownloadAll}>Скачать все ({images.length})</button>
        </div>
      )}
      <div className="grid">
        {images.map((image, index) => {
          const isLast = index === images.length - 1;
          return (
            <figure 
              key={image.path + index} 
              className="card"
              ref={isLast ? lastImageRef : null}
            >
              <img 
                src={image.path} 
                alt={image.filename} 
                onClick={() => setModalImage(image)}
                style={{ cursor: 'pointer' }}
                title="Нажмите для увеличения"
              />
              <figcaption>
                <a href={image.path} download={image.filename} className="card-btn">Скачать</a>
                <button onClick={() => handleDelete(image.filename)} className="card-btn btn-delete" disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending && deleteMutation.variables === image.filename ? '…' : 'Удалить'}
                </button>
              </figcaption>
            </figure>
          )
        })}
      </div>
      
      {isLoadingMore && <div className="loading-gallery">Загрузка...</div>}
      
      {modalImage && (
        <ImageModal 
          image={modalImage} 
          allImages={images}
          onClose={() => setModalImage(null)}
          onDelete={handleDelete}
          onMoveToReference={onMoveToReference}
          onNavigate={setModalImage}
        />
      )}
    </section>
  );
}