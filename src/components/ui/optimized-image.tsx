'use client'

import Image, { type ImageProps } from 'next/image'
import { cn } from '@/lib/utils'
import {
  getTransformUrl,
  getPublicObjectUrl,
  getBlurPlaceholder,
  isTransformableImage,
  IMAGE_PRESETS,
  RESPONSIVE_SIZES,
  type ImagePresetName,
  type ImageTransformOptions,
} from '@/lib/images'

export interface OptimizedImageProps
  extends Omit<ImageProps, 'src' | 'placeholder' | 'blurDataURL'> {
  storagePath?: string
  src?: string
  bucket?: string
  preset?: ImagePresetName
  transform?: ImageTransformOptions
  mimeType?: string
  showPlaceholder?: boolean
}

export function OptimizedImage({
  storagePath,
  src,
  bucket = 'public-assets',
  preset,
  transform,
  mimeType,
  showPlaceholder = true,
  width,
  height,
  sizes,
  className,
  alt,
  ...rest
}: OptimizedImageProps) {
  let imageSrc: string

  if (src) {
    imageSrc = src
  } else if (!storagePath) {
    return null
  } else if (mimeType && !isTransformableImage(mimeType)) {
    imageSrc = getPublicObjectUrl(storagePath, bucket)
  } else if (transform) {
    imageSrc = getTransformUrl(storagePath, transform, bucket)
  } else if (preset) {
    imageSrc = getTransformUrl(storagePath, IMAGE_PRESETS[preset], bucket)
  } else {
    imageSrc = getPublicObjectUrl(storagePath, bucket)
  }

  const resolvedPreset: ImageTransformOptions | undefined = preset
    ? IMAGE_PRESETS[preset]
    : undefined
  const resolvedWidth = width ?? transform?.width ?? resolvedPreset?.width
  const resolvedHeight = height ?? transform?.height ?? resolvedPreset?.height
  const resolvedSizes =
    sizes ?? (preset ? RESPONSIVE_SIZES[preset as keyof typeof RESPONSIVE_SIZES] : undefined)

  const useFill = !resolvedWidth && !resolvedHeight

  const placeholderProps = showPlaceholder
    ? { placeholder: 'blur' as const, blurDataURL: getBlurPlaceholder() }
    : {}

  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={cn('object-cover', className)}
      {...(useFill
        ? { fill: true, sizes: resolvedSizes ?? '100vw' }
        : { width: resolvedWidth, height: resolvedHeight, sizes: resolvedSizes })}
      {...placeholderProps}
      {...rest}
    />
  )
}
