import { describe, expect, it } from 'vitest';
import { applyGesture } from './gestures';

describe('applyGesture', () => {
  it('draws a rectangle from the start point to the pointer', () => {
    const rect = applyGesture({ kind: 'draw', start: { x: 0.5, y: 0.5 } }, { x: 0.2, y: 0.9 });
    expect(rect.x).toBeCloseTo(0.2);
    expect(rect.y).toBeCloseTo(0.5);
    expect(rect.w).toBeCloseTo(0.3);
    expect(rect.h).toBeCloseTo(0.4);
  });

  it('moves the original rectangle by the pointer delta', () => {
    const rect = applyGesture(
      { kind: 'move', id: 'a', start: { x: 0.5, y: 0.5 }, origin: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } },
      { x: 0.6, y: 0.7 },
    );
    expect(rect.x).toBeCloseTo(0.2);
    expect(rect.y).toBeCloseTo(0.3);
  });

  it('resizes the original rectangle from the dragged corner', () => {
    const rect = applyGesture(
      { kind: 'resize', id: 'a', corner: 'se', origin: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } },
      { x: 0.5, y: 0.5 },
    );
    expect(rect.w).toBeCloseTo(0.4);
    expect(rect.h).toBeCloseTo(0.4);
  });
});
