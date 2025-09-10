import React from 'react';
import { useMutation } from '@tanstack/react-query';

async function postGenerate(body: any) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Request failed');
  return json as { images: string[]; error: string | null };
}

export function App() {
  const [prompt, setPrompt] = React.useState('A photorealistic image of a red cat astronaut in space');
  const [n, setN] = React.useState(1);
  const [imageDataUrl, setImageDataUrl] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<'text-to-image' | 'image-to-image'>('text-to-image');

  const mutation = useMutation({
    mutationFn: postGenerate,
  });

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string' && result.startsWith('data:image/')) {
        setImageDataUrl(result);
        setMode('image-to-image');
      } else {
        alert('Не удалось прочитать изображение. Попробуйте другой файл.');
      }
    };
    reader.onerror = () => {
      alert('Ошибка чтения файла изображения');
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'image-to-image' && !imageDataUrl) {
      alert('Для режима image-to-image сначала загрузите референс-изображение.');
      return;
    }
    mutation.mutate({ prompt, n, mode, imageDataUrl });
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Nano Generator</h1>
        <a 
          href="/new.html" 
          style={{ 
            background: '#6750a4', 
            color: 'white', 
            padding: '8px 16px', 
            borderRadius: '8px', 
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🚀 Новый UI
        </a>
      </div>
      <form onSubmit={onSubmit}>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} style={{ width: '100%' }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
          <label>
            Кол-во: 
            <input type="number" min={1} max={6} value={n} onChange={e => setN(parseInt(e.target.value || '1', 10))} />
          </label>
          <label>
            Режим: 
            <select value={mode} onChange={e => setMode(e.target.value as any)}>
              <option value="text-to-image">text-to-image</option>
              <option value="image-to-image">image-to-image</option>
            </select>
          </label>
          <label>
            Референс:
            <input type="file" accept="image/*" onChange={e => e.target.files && onFile(e.target.files[0])} />
          </label>
          <button type="submit" disabled={mutation.isPending}>Генерировать</button>
        </div>
      {mode === 'image-to-image' && !imageDataUrl && (
        <p style={{ color: '#a94442', marginTop: 8 }}>Для image-to-image загрузите изображение-референс.</p>
      )}
      </form>
      {mutation.isPending && <p>Генерация...</p>}
      {mutation.isError && <p style={{ color: 'red' }}>{(mutation.error as any)?.message}</p>}
      {mutation.data?.images?.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 12, marginTop: 12 }}>
          {mutation.data.images.map((src, i) => (
            <img key={i} src={src} style={{ width: '100%', borderRadius: 8 }} />
          ))}
        </div>
      ) : null}
    </div>
  );
}


