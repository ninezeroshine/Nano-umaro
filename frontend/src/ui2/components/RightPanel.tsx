import React from 'react';
import type { Mode } from '../types/generate';
import { Dropzone } from './Dropzone';

export interface RightPanelProps {
  mode: Mode;
  setMode: (m: Mode) => void;
  aspectRatio: string;
  setAspectRatio: (ar: string) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  n: number;
  setN: (v: number) => void;
  onFiles: (f: File[]) => void;
  previews: string[];
  onClearImage?: (index: number) => void;
  canGenerate: boolean;
  generating: boolean;
  onGenerate: () => void;
  onCancel?: () => void;
  error?: string;
  onRetry?: () => void;
}

const ASPECT_RATIOS = ['16:9', '4:3', '1:1', '3:4', '9:16'];

export function RightPanel(props: RightPanelProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      if (props.canGenerate) {
        props.onGenerate();
      }
    }
  };

  return (
    <aside className="ng-right">
      <div className="panel">
        <div className="panel-row">
          <label>Режим</label>
          <div className="mode-selector">
            <button 
              className={`mode-btn ${props.mode === 'text-to-image' ? 'active' : ''}`}
              onClick={() => props.setMode('text-to-image')}
              disabled={props.generating}
            >
              Text-to-Image
            </button>
            <button 
              className={`mode-btn ${props.mode === 'image-to-image' ? 'active' : ''}`}
              onClick={() => props.setMode('image-to-image')}
              disabled={props.generating}
            >
              Image-to-Image
            </button>
          </div>
        </div>

        <div className="panel-row">
          <label htmlFor="prompt-textarea">Промпт</label>
          <textarea 
            id="prompt-textarea" 
            rows={6} 
            value={props.prompt} 
            onChange={e => props.setPrompt(e.target.value)} 
            onKeyDown={handleKeyDown}
            placeholder="Опишите, что создать… (Ctrl+Enter для запуска)" 
            disabled={props.generating}
          />
          {!props.prompt.trim() && <div className="field-error">Требуется описание</div>}
        </div>

        {props.mode === 'image-to-image' && (
          <div className="panel-row">
            <label>Изображения-референсы</label>
            <Dropzone onFiles={props.onFiles} previews={props.previews} onClear={props.onClearImage} />
            {props.mode === 'image-to-image' && !props.previews.length && (
              <div className="field-error">Загрузите хотя бы 1 изображение</div>
            )}
          </div>
        )}

        <div className="panel-row">
          <label>Соотношение сторон</label>
          <div className="aspect-ratio-selector">
            {ASPECT_RATIOS.map(ar => (
              <button 
                key={ar} 
                className={`aspect-ratio-btn ${props.aspectRatio === ar ? 'active' : ''}`}
                onClick={() => props.setAspectRatio(ar)}
                disabled={props.generating}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-row">
          <label htmlFor="count-range">Количество (1–6)</label>
          <input 
            id="count-range" 
            type="range" 
            min={1} 
            max={6} 
            value={props.n} 
            onChange={e => props.setN(Number(e.target.value))} 
            disabled={props.generating}
          />
          <div className="hint">
            n = {props.n}
            {props.n > 2 && <div style={{ fontSize: '11px', opacity: 0.7 }}>Большие батчи медленнее</div>}
          </div>
        </div>

        <div className="panel-actions">
          <button 
            className="primary" 
            disabled={!props.canGenerate || props.generating} 
            onClick={props.onGenerate}
            title={!props.canGenerate ? 'Проверьте промпт и изображение' : ''}
          >
            {props.generating ? 'Генерация…' : 'Сгенерировать'}
          </button>
          {props.generating && (
            <button className="ghost" onClick={props.onCancel}>Отмена</button>
          )}
          {props.error && props.onRetry && (
            <button className="secondary" onClick={props.onRetry}>Повторить</button>
          )}
        </div>
      </div>
    </aside>
  );
}


