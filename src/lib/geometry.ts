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

export function rectToStyle(rect: Rect): { left: string; top: string; width: string; height: string } {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
  };
}
