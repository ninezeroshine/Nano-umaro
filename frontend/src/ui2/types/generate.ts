export type Mode = 'text-to-image' | 'image-to-image';

export interface GenerateBody {
  prompt: string;
  n: number;
  mode: Mode;
  imageDataUrls?: string[];
}

export interface GenerateResponse {
  images: string[];
  error: string | null;
  errorType?: string;
  suggestions?: string[];
  retryable?: boolean;
}


