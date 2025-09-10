import type { GalleryResponse } from '../types/gallery';

const LIMIT = 12;

export async function fetchGallery(page: number = 1): Promise<GalleryResponse> {
  const res = await fetch(`/api/gallery?page=${page}&limit=${LIMIT}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json as GalleryResponse;
}
