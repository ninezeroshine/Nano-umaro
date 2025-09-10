import React from 'react';

export interface ImageModalProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageModal({ src, alt, onClose }: ImageModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрыть">×</button>
        <img src={src} alt={alt || 'Увеличенное изображение'} className="modal-image" />
        <div className="modal-actions">
          <a href={src} download className="modal-download">Скачать</a>
          <button onClick={() => navigator.clipboard.writeText(window.location.origin + src)} className="modal-copy">
            Копировать ссылку
          </button>
        </div>
      </div>
    </div>
  );
}
