import type { NewPhoto } from '../data/types';

export const WARDROBE_MAX_EDGE = 2000;
export const ITEM_MAX_EDGE = 800;
const JPEG_QUALITY = 0.8;

export class ImageDecodeError extends Error {
  constructor() {
    super("Couldn't read that image. Try a JPG or PNG.");
    this.name = 'ImageDecodeError';
  }
}

export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Decodes any browser-readable image, honours EXIF rotation, and re-encodes it as a JPEG. */
export async function compressImage(file: Blob, maxEdge: number): Promise<NewPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageDecodeError();
  }

  const size = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new ImageDecodeError();
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new ImageDecodeError();

  return { data: await blob.arrayBuffer(), mime: 'image/jpeg', width: size.width, height: size.height };
}
