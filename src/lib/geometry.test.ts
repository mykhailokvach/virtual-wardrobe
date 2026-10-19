import { describe, expect, it } from 'vitest';
import {
  alignSections,
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

describe('alignSections', () => {
  const at = (id: string, x: number, y: number, w: number, h: number) => ({ id, rect: { x, y, w, h } });

  it('snaps nearly equal edges of the same kind to their average', () => {
    // Two sections stacked in one column, drawn slightly off: left 0.10/0.11, right 0.40/0.39.
    const [top, bottom] = alignSections([at('top', 0.1, 0.1, 0.3, 0.2), at('bottom', 0.11, 0.35, 0.28, 0.2)]);
    expectRect(top.rect, { x: 0.105, y: 0.1, w: 0.29, h: 0.2 });
    expectRect(bottom.rect, { x: 0.105, y: 0.35, w: 0.29, h: 0.2 });
  });

  it('aligns rows as well as columns', () => {
    // Side by side in one row: tops 0.20/0.21, bottoms 0.50/0.51.
    const [left, right] = alignSections([at('l', 0.1, 0.2, 0.3, 0.3), at('r', 0.5, 0.21, 0.3, 0.3)]);
    expectRect(left.rect, { x: 0.1, y: 0.205, w: 0.3, h: 0.3 });
    expectRect(right.rect, { x: 0.5, y: 0.205, w: 0.3, h: 0.3 });
  });

  it('leaves edges further apart than the tolerance alone', () => {
    const sections = [at('a', 0.1, 0.1, 0.2, 0.2), at('b', 0.2, 0.5, 0.3, 0.3)];
    expect(alignSections(sections).map((s) => s.rect)).toEqual(sections.map((s) => s.rect));
  });

  it("keeps the gap between one section's right edge and its neighbour's left edge", () => {
    const [a, b] = alignSections([at('a', 0.1, 0.1, 0.3, 0.2), at('b', 0.41, 0.1, 0.3, 0.2)]);
    expect(a.rect.x + a.rect.w).toBeCloseTo(0.4);
    expect(b.rect.x).toBeCloseTo(0.41);
  });

  it('does not shrink a section below the minimum size', () => {
    // 'thin' spans 0.100–0.140. 'a' pulls its left edge to 0.1075 and 'b' pulls its right edge to 0.1325,
    // which would leave it 0.025 wide, so it keeps its x and w (y still aligns normally).
    const [, thin] = alignSections([
      at('a', 0.115, 0.1, 0.3, 0.2),
      at('thin', 0.1, 0.5, 0.04, 0.2),
      at('b', 0.025, 0.8, 0.1, 0.1),
    ]);
    expectRect(thin.rect, { x: 0.1, y: 0.5, w: 0.04, h: 0.2 });
  });

  it('keeps the other fields of each section', () => {
    const [section] = alignSections([{ id: 'a', name: 'Shelf', rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } }]);
    expect(section).toMatchObject({ id: 'a', name: 'Shelf' });
  });
});
