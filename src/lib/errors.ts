import { ImageDecodeError } from './image';

function hasName(value: unknown, name: string): boolean {
  return typeof value === 'object' && value !== null && (value as { name?: unknown }).name === name;
}

function isQuotaError(error: unknown): boolean {
  if (hasName(error, 'QuotaExceededError')) return true;
  // Dexie wraps the underlying DOMException in `inner`.
  return typeof error === 'object' && error !== null && hasName((error as { inner?: unknown }).inner, 'QuotaExceededError');
}

export function errorMessage(error: unknown): string {
  if (error instanceof ImageDecodeError) return error.message;
  if (isQuotaError(error)) return 'Storage is full. Delete some items or wardrobes and try again.';
  return 'Something went wrong. Please try again.';
}
