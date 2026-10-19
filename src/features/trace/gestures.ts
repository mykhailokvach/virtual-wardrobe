import { moveRect, rectFromPoints, resizeRect, type Corner, type Point, type Rect } from '../../lib/geometry';

export type Gesture =
  | { kind: 'draw'; start: Point }
  | { kind: 'move'; id: string; start: Point; origin: Rect }
  | { kind: 'resize'; id: string; corner: Corner; origin: Rect };

/** The rectangle a gesture produces when the pointer is at `point`. */
export function applyGesture(gesture: Gesture, point: Point): Rect {
  switch (gesture.kind) {
    case 'draw':
      return rectFromPoints(gesture.start, point);
    case 'move':
      return moveRect(gesture.origin, point.x - gesture.start.x, point.y - gesture.start.y);
    case 'resize':
      return resizeRect(gesture.origin, gesture.corner, point);
  }
}
