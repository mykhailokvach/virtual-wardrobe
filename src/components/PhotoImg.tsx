import { usePhotoUrl } from '../data/photo-url';

export function PhotoImg({ photoId, alt, className = '' }: { photoId: string; alt: string; className?: string }) {
  const url = usePhotoUrl(photoId);
  if (!url) return <div aria-hidden="true" className={`animate-pulse bg-stone-200 ${className}`} />;
  return <img src={url} alt={alt} className={className} />;
}
