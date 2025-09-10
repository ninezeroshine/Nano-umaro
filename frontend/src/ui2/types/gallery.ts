export interface GalleryImage {
  filename: string;
  path: string;
  timestamp: number;
  size: number;
}

export interface GalleryResponse {
  images: GalleryImage[];
  totalPages: number;
  currentPage: number;
  error?: string;
}
