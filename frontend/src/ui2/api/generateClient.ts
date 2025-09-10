import type { GenerateBody, GenerateResponse } from '../types/generate';

export async function generateImages(body: GenerateBody, signal?: AbortSignal): Promise<GenerateResponse> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  const json = await res.json();
  
  if (!res.ok) {
    // Прокидываем расширенное сообщение об ошибке, если оно есть
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  
  return json as GenerateResponse;
}


