export type ImagePresetName = 'thumbnail' | 'medium' | 'large' | 'full';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
}

export function getOptimizedImageUrl(
  src: string,
  preset?: ImagePresetName,
  options?: ImageTransformOptions
): string {
  // Return original src for now - implement optimization later
  return src;
}

export function getTransformUrl(
  src: string,
  options?: ImageTransformOptions,
  bucket?: string
): string {
  return src;
}

export function getPublicObjectUrl(path: string, bucket?: string): string {
  return path;
}

export function getBlurPlaceholder(src?: string): Promise<string | undefined> {
  return Promise.resolve(undefined);
}

export function isTransformableImage(src: string): boolean {
  return true;
}

export function generateBlurDataURL(src: string): Promise<string | undefined> {
  return Promise.resolve(undefined);
}

export const imagePresets: Record<ImagePresetName, ImageTransformOptions> = {
  thumbnail: { width: 150, height: 150, quality: 80 },
  medium: { width: 400, height: 300, quality: 85 },
  large: { width: 800, height: 600, quality: 90 },
  full: { quality: 95 },
};

export const IMAGE_PRESETS = imagePresets;

export const RESPONSIVE_SIZES = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};
