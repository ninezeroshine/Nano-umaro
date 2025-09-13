import type { GalleryResponse } from '../types/gallery';

export async function fetchGallery(page: number = 1, limit: number = 12): Promise<GalleryResponse> {
  const res = await fetch(`/api/gallery?page=${page}&limit=${limit}`);
  if (!res.ok) {
    throw new Error('Failed to fetch gallery');
  }
  return res.json();
}

export async function deleteImage(filename: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/gallery/image/${filename}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to delete image. Status: ${res.status}`);
  }

  return res.json();
}
