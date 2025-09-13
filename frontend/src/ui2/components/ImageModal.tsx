import React from 'react';
import type { GalleryImage } from '../types/gallery';

export interface ImageModalProps {
  image: GalleryImage;
  allImages: GalleryImage[];
  onClose: () => void;
  onDelete: (filename: string) => void;
  onMoveToReference: (imagePath: string) => void;
  onNavigate: (image: GalleryImage) => void;
}

export function ImageModal({ image, allImages, onClose, onDelete, onMoveToReference, onNavigate }: ImageModalProps) {
  const [copied, setCopied] = React.useState(false);

  const currentIndex = allImages.findIndex(img => img.path === image.path);

  const goToNext = React.useCallback(() => {
    const nextIndex = (currentIndex + 1) % allImages.length;
    onNavigate(allImages[nextIndex]);
  }, [currentIndex, allImages, onNavigate]);

  const goToPrevious = React.useCallback(() => {
    const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
    onNavigate(allImages[prevIndex]);
  }, [currentIndex, allImages, onNavigate]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrevious();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToNext, goToPrevious]);

  const handleCopyPrompt = () => {
    if (!image.metadata?.prompt) return;
    navigator.clipboard.writeText(image.metadata.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    onDelete(image.filename);
    onClose();
  };

  const handleMove = () => {
    onMoveToReference(image.path);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {allImages.length > 1 && (
        <>
          <button className="modal-nav-btn prev" onClick={(e) => { e.stopPropagation(); goToPrevious(); }} aria-label="Previous image">‹</button>
          <button className="modal-nav-btn next" onClick={(e) => { e.stopPropagation(); goToNext(); }} aria-label="Next image">›</button>
        </>
      )}
      <div className="modal-layout" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-image-column">
          <img src={image.path} alt={image.filename} className="modal-image-large" />
        </div>

        <div className="modal-details-column">
          <h3>Детали генерации</h3>
          
          {image.metadata && Object.keys(image.metadata).length > 0 ? (
            <div className="metadata-section">
              {image.metadata.prompt && (
                <div className="metadata-item">
                  <label>Промпт</label>
                  <div className="prompt-container">
                    <p>{image.metadata.prompt}</p>
                    <button onClick={handleCopyPrompt} className="ghost-btn">
                      {copied ? 'Скопировано!' : 'Копировать'}
                    </button>
                  </div>
                </div>
              )}
              {image.metadata.model && (
                <div className="metadata-item">
                  <label>Модель</label>
                  <p>{image.metadata.model}</p>
                </div>
              )}
              {image.metadata.mode && (
                <div className="metadata-item">
                  <label>Режим</label>
                  <p>{image.metadata.mode}</p>
                </div>
              )}
               {image.metadata.createdAt && (
                <div className="metadata-item">
                  <label>Создано</label>
                  <p>{new Date(image.metadata.createdAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="metadata-empty-state">
              <p>Метаданные отсутствуют</p>
            </div>
          )}

          <div className="modal-actions-new">
            <a href={image.path} download={image.filename} className="action-btn primary">
              Скачать
            </a>
            <button onClick={handleMove} className="action-btn secondary">
              Переместить в Reference
            </button>
            <button onClick={() => navigator.clipboard.writeText(window.location.origin + image.path)} className="action-btn secondary">
              Копировать ссылку
            </button>
            <button onClick={handleDelete} className="action-btn danger">
              Удалить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}