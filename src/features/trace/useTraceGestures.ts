import { useState, type Dispatch, type PointerEvent, type RefObject, type SetStateAction } from 'react';
import type { SectionDraft } from '../../data/types';
import { clamp, isBigEnough, type Corner, type Point, type Rect } from '../../lib/geometry';
import { applyGesture, type Gesture } from './gestures';

export function useTraceGestures({
  stageRef,
  setSections,
  onSelect,
}: {
  stageRef: RefObject<HTMLDivElement | null>;
  setSections: Dispatch<SetStateAction<SectionDraft[]>>;
  onSelect: (id: string | null) => void;
}) {
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [drawRect, setDrawRect] = useState<Rect | null>(null);

  function toPoint(event: PointerEvent): Point {
    const box = stageRef.current!.getBoundingClientRect();
    return {
      x: clamp((event.clientX - box.left) / box.width, 0, 1),
      y: clamp((event.clientY - box.top) / box.height, 0, 1),
    };
  }

  function begin(event: PointerEvent, next: Gesture) {
    event.stopPropagation();
    event.preventDefault();
    stageRef.current?.setPointerCapture(event.pointerId);
    setGesture(next);
  }

  function finish() {
    setGesture(null);
    setDrawRect(null);
  }

  return {
    /** The rectangle being drawn right now, if any. */
    drawRect,

    startDraw(event: PointerEvent) {
      onSelect(null);
      const start = toPoint(event);
      begin(event, { kind: 'draw', start });
      setDrawRect(applyGesture({ kind: 'draw', start }, start));
    },

    startMove(event: PointerEvent, section: SectionDraft) {
      onSelect(section.id);
      begin(event, { kind: 'move', id: section.id, start: toPoint(event), origin: section.rect });
    },

    startResize(event: PointerEvent, section: SectionDraft, corner: Corner) {
      begin(event, { kind: 'resize', id: section.id, corner, origin: section.rect });
    },

    stageHandlers: {
      onPointerMove(event: PointerEvent) {
        if (!gesture) return;
        const rect = applyGesture(gesture, toPoint(event));
        if (gesture.kind === 'draw') setDrawRect(rect);
        else setSections((prev) => prev.map((s) => (s.id === gesture.id ? { ...s, rect } : s)));
      },
      onPointerUp(event: PointerEvent) {
        if (gesture?.kind === 'draw') {
          const rect = applyGesture(gesture, toPoint(event));
          if (isBigEnough(rect)) {
            const id = crypto.randomUUID();
            setSections((prev) => [...prev, { id, rect }]);
            onSelect(id);
          }
        }
        finish();
      },
      onPointerCancel: finish,
    },
  };
}
