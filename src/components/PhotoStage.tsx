import type { ComponentProps } from 'react';
import { usePhotoUrl } from '../data/photo-url';

/**
 * Shows the wardrobe photo at its exact aspect ratio, fitted to both the width and
 * (viewport height − reservedHeight), so children can be positioned in percentages.
 */
export function PhotoStage({
  photoId,
  width,
  height,
  alt,
  reservedHeight = 160,
  className = '',
  children,
  ...divProps
}: {
  photoId: string;
  width: number;
  height: number;
  alt: string;
  reservedHeight?: number;
} & ComponentProps<'div'>) {
  const url = usePhotoUrl(photoId);
  return (
    <div
      className={`relative mx-auto ${className}`}
      style={{
        aspectRatio: `${width} / ${height}`,
        width: `min(100%, calc((100dvh - ${reservedHeight}px) * ${width / height}))`,
      }}
      {...divProps}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover outline-1 outline-line2 select-none"
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-plate" />
      )}
      {children}
    </div>
  );
}
