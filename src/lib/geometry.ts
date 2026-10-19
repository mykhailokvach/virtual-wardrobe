export interface Point {
  x: number;
  y: number;
}

/** A rectangle in photo-relative units: every value is a fraction (0–1) of the photo size. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Corner = 'nw' | 'ne' | 'sw' | 'se';

/** Smallest section side, as a fraction of the photo. Smaller drags are treated as taps. */
export const MIN_SIZE = 0.03;

/** Sections whose tops are this close are treated as one row when numbering. */
export const ROW_TOLERANCE = 0.02;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function rectFromPoints(a: Point, b: Point): Rect {
  const x1 = clamp(Math.min(a.x, b.x), 0, 1);
  const y1 = clamp(Math.min(a.y, b.y), 0, 1);
  const x2 = clamp(Math.max(a.x, b.x), 0, 1);
  const y2 = clamp(Math.max(a.y, b.y), 0, 1);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function isBigEnough(rect: Rect, min = MIN_SIZE): boolean {
  return rect.w >= min && rect.h >= min;
}

export function moveRect(rect: Rect, dx: number, dy: number): Rect {
  return {
    ...rect,
    x: clamp(rect.x + dx, 0, 1 - rect.w),
    y: clamp(rect.y + dy, 0, 1 - rect.h),
  };
}

/** Moves one corner to `point`, keeping the opposite corner fixed and the size at least `min`. */
export function resizeRect(rect: Rect, corner: Corner, point: Point, min = MIN_SIZE): Rect {
  const right = corner === 'ne' || corner === 'se';
  const bottom = corner === 'sw' || corner === 'se';
  const fixedX = right ? rect.x : rect.x + rect.w;
  const fixedY = bottom ? rect.y : rect.y + rect.h;
  const x = right ? clamp(point.x, fixedX + min, 1) : clamp(point.x, 0, fixedX - min);
  const y = bottom ? clamp(point.y, fixedY + min, 1) : clamp(point.y, 0, fixedY - min);
  return rectFromPoints({ x: fixedX, y: fixedY }, { x, y });
}

/** Orders sections top-to-bottom, then left-to-right within a row. */
export function sortSections<T extends { rect: Rect }>(sections: readonly T[]): T[] {
  const byTop = [...sections].sort((a, b) => a.rect.y - b.rect.y);
  const rows: T[][] = [];
  for (const section of byTop) {
    const row = rows.at(-1);
    if (row && section.rect.y - row[0].rect.y <= ROW_TOLERANCE) row.push(section);
    else rows.push([section]);
  }
  return rows.flatMap((row) => row.sort((a, b) => a.rect.x - b.rect.x));
}

/**
 * Edges of the same kind closer than this (as a fraction of the photo) are snapped together by
 * `alignSections`. Matches MIN_SIZE: differences under 3% of the photo are treated as drawing noise.
 */
export const ALIGN_TOLERANCE = MIN_SIZE;

/**
 * Groups values that lie within `tolerance` of the smallest value in their group and replaces each
 * with its group's average. Measuring from the group's first value stops long chains from drifting.
 */
function snapValues(values: readonly number[], tolerance: number): number[] {
  const order = values.map((_, index) => index).sort((a, b) => values[a] - values[b]);
  const result = [...values];
  let group: number[] = [];
  const flush = () => {
    const mean = group.reduce((sum, index) => sum + values[index], 0) / group.length;
    for (const index of group) result[index] = mean;
    group = [];
  };
  for (const index of order) {
    if (group.length > 0 && values[index] - values[group[0]] > tolerance) flush();
    group.push(index);
  }
  if (group.length > 0) flush();
  return result;
}

/**
 * Tidies hand-drawn sections: left edges that nearly line up are snapped together, and likewise
 * right, top and bottom edges. Different kinds are never merged, so gaps between neighbours stay.
 * If snapping would make a section smaller than `min` on an axis, it keeps its original extent there.
 */
export function alignSections<T extends { rect: Rect }>(
  sections: readonly T[],
  tolerance = ALIGN_TOLERANCE,
  min = MIN_SIZE,
): T[] {
  const lefts = snapValues(sections.map((s) => s.rect.x), tolerance);
  const rights = snapValues(sections.map((s) => s.rect.x + s.rect.w), tolerance);
  const tops = snapValues(sections.map((s) => s.rect.y), tolerance);
  const bottoms = snapValues(sections.map((s) => s.rect.y + s.rect.h), tolerance);

  /** The snapped start and size on one axis, or the original ones if nothing moved or it would get too small. */
  function axis(start: number, size: number, snappedStart: number, snappedEnd: number): [number, number] {
    const moved = snappedStart !== start || snappedEnd !== start + size;
    const snappedSize = snappedEnd - snappedStart;
    return moved && snappedSize >= min ? [snappedStart, snappedSize] : [start, size];
  }

  return sections.map((section, i) => {
    const { rect } = section;
    const [x, w] = axis(rect.x, rect.w, lefts[i], rights[i]);
    const [y, h] = axis(rect.y, rect.h, tops[i], bottoms[i]);
    return { ...section, rect: { x, y, w, h } };
  });
}

export function rectToStyle(rect: Rect): { left: string; top: string; width: string; height: string } {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
  };
}
