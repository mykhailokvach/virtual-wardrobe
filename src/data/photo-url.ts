import { useEffect, useState } from 'react';
import { usePhoto } from './hooks';
import type { Photo } from './types';

/** Creates an object URL for the photo bytes and revokes it on change or unmount. */
export function useObjectUrl(photo: Pick<Photo, 'data' | 'mime'> | null | undefined): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!photo) return;
    const objectUrl = URL.createObjectURL(new Blob([photo.data], { type: photo.mime }));
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      setUrl(undefined);
    };
  }, [photo]);

  return url;
}

export function usePhotoUrl(photoId: string | undefined): string | undefined {
  return useObjectUrl(usePhoto(photoId).data);
}
