import React from 'react';

export interface DropzoneProps {
  onFiles: (files: File[]) => void;
  previews: string[];
  onClear?: (index: number) => void;
  maxFiles?: number;
}

export function Dropzone({ onFiles, previews, onClear, maxFiles = 5 }: DropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) onFiles(files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onFiles(files);
  };

  const canAddMore = previews.length < maxFiles;

  return (
    <div className="dropzone-container">
      <div className="previews-grid">
        {previews.map((preview, i) => (
          <div key={i} className="preview">
            <img src={preview} alt={`Референс ${i + 1}`} />
            {onClear && <button className="clear-btn" onClick={() => onClear(i)} aria-label={`Очистить ${i+1}`}>×</button>}
          </div>
        ))}

        {canAddMore && (
          <div
            className={`dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label={`Загрузить еще (до ${maxFiles})`}
          >
            <div className="icon">➕</div>
            <div className="text">Добавить фото</div>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        multiple
      />
    </div>
  );
}
