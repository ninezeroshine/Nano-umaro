export interface GalleryImage {
  filename: string;
  path: string;
  timestamp: number;
  size: number;
  metadata?: {
    prompt?: string;
    model?: string;
    mode?: string;
    [key: string]: any;
  };
}

export interface GalleryResponse {
  images: GalleryImage[];
  totalPages: number;
  currentPage: number;
  error?: string;
}
