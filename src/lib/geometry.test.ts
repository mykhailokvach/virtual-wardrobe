import { describe, expect, it } from 'vitest';
import {
  clamp,
  isBigEnough,
  moveRect,
  rectFromPoints,
  rectToStyle,
  resizeRect,
  sortSections,
  type Rect,
} from './geometry';

function expectRect(actual: Rect, expected: Rect) {
  for (const key of ['x', 'y', 'w', 'h'] as const) {
    expect(actual[key], key).toBeCloseTo(expected[key]);
  }
}

describe('clamp', () => {
  it('limits a value to a range', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});

describe('rectFromPoints', () => {
  it('normalizes a drag in any direction', () => {
    expectRect(rectFromPoints({ x: 0.6, y: 0.7 }, { x: 0.2, y: 0.1 }), { x: 0.2, y: 0.1, w: 0.4, h: 0.6 });
  });

  it('clamps points to the photo', () => {
    expectRect(rectFromPoints({ x: -0.5, y: 0.5 }, { x: 0.5, y: 1.5 }), { x: 0, y: 0.5, w: 0.5, h: 0.5 });
  });
});

describe('isBigEnough', () => {
  it('rejects rectangles thinner than the minimum size', () => {
    expect(isBigEnough({ x: 0, y: 0, w: 0.02, h: 0.5 })).toBe(false);
    expect(isBigEnough({ x: 0, y: 0, w: 0.5, h: 0.01 })).toBe(false);
  });

  it('accepts rectangles at or above the minimum size', () => {
    expect(isBigEnough({ x: 0, y: 0, w: 0.03, h: 0.03 })).toBe(true);
  });
});

describe('moveRect', () => {
  it('moves by a delta', () => {
    expectRect(moveRect({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, 0.1, 0.2), { x: 0.2, y: 0.3, w: 0.2, h: 0.2 });
  });

  it('keeps the rectangle inside the photo', () => {
    expectRect(moveRect({ x: 0.7, y: 0.1, w: 0.2, h: 0.2 }, 0.3, -0.5), { x: 0.8, y: 0, w: 0.2, h: 0.2 });
  });
});

describe('resizeRect', () => {
  const rect = { x: 0.1, y: 0.1, w: 0.2, h: 0.2 };

  it('resizes from the bottom-right corner', () => {
    expectRect(resizeRect(rect, 'se', { x: 0.5, y: 0.6 }), { x: 0.1, y: 0.1, w: 0.4, h: 0.5 });
  });

  it('resizes from the top-left corner, keeping the opposite corner fixed', () => {
    expectRect(resizeRect(rect, 'nw', { x: 0, y: 0.05 }), { x: 0, y: 0.05, w: 0.3, h: 0.25 });
  });

  it('never shrinks below the minimum size', () => {
    expectRect(resizeRect(rect, 'se', { x: 0.1, y: 0.1 }), { x: 0.1, y: 0.1, w: 0.03, h: 0.03 });
  });

  it('does not flip when dragged past the opposite corner', () => {
    expectRect(resizeRect(rect, 'nw', { x: 0.9, y: 0.9 }), { x: 0.27, y: 0.27, w: 0.03, h: 0.03 });
  });
});

describe('sortSections', () => {
  it('orders top-to-bottom, then left-to-right within a row', () => {
    const a = { id: 'a', rect: { x: 0.1, y: 0.5, w: 0.2, h: 0.2 } };
    const b = { id: 'b', rect: { x: 0.6, y: 0.1, w: 0.2, h: 0.2 } };
    const c = { id: 'c', rect: { x: 0.1, y: 0.11, w: 0.2, h: 0.2 } };
    expect(sortSections([a, b, c]).map((s) => s.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('rectToStyle', () => {
  it('converts fractions to CSS percentages', () => {
    expect(rectToStyle({ x: 0.1, y: 0.25, w: 0.5, h: 0.75 })).toEqual({
      left: '10%',
      top: '25%',
      width: '50%',
      height: '75%',
    });
  });
});
