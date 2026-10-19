import { describe, expect, it } from 'vitest';
import { errorMessage } from './errors';
import { ImageDecodeError } from './image';

describe('errorMessage', () => {
  it('passes image decode errors through', () => {
    expect(errorMessage(new ImageDecodeError())).toMatch(/couldn't read that image/i);
  });

  it('explains a full storage quota', () => {
    const error = new Error('quota');
    error.name = 'QuotaExceededError';
    expect(errorMessage(error)).toMatch(/storage is full/i);
  });

  it('detects quota errors wrapped by Dexie', () => {
    const error = Object.assign(new Error('abort'), { name: 'AbortError', inner: { name: 'QuotaExceededError' } });
    expect(errorMessage(error)).toMatch(/storage is full/i);
  });

  it('falls back to a generic message', () => {
    expect(errorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
    expect(errorMessage('nope')).toBe('Something went wrong. Please try again.');
  });
});
