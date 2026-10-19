import { describe, expect, it } from 'vitest';
import { itemLabel, sectionLabel } from './labels';

describe('sectionLabel', () => {
  it('uses the name when set', () => {
    expect(sectionLabel(' Top shelf ', 0)).toBe('Top shelf');
  });

  it('falls back to a 1-based number', () => {
    expect(sectionLabel(undefined, 0)).toBe('Section 1');
    expect(sectionLabel('   ', 2)).toBe('Section 3');
  });
});

describe('itemLabel', () => {
  it('uses the name, or the type when unnamed', () => {
    expect(itemLabel({ name: 'Sneakers', type: 'shoes' })).toBe('Sneakers');
    expect(itemLabel({ type: 'shoes' })).toBe('Shoes');
    expect(itemLabel({ name: '', type: 'clothes' })).toBe('Clothes');
  });
});
