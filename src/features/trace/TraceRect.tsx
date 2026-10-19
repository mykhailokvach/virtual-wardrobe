import type { PointerEvent } from 'react';
import type { SectionDraft } from '../../data/types';
import { rectToStyle, type Corner } from '../../lib/geometry';

const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];

const cornerClass: Record<Corner, string> = {
  nw: '-top-3 -left-3 cursor-nwse-resize',
  ne: '-top-3 -right-3 cursor-nesw-resize',
  sw: '-bottom-3 -left-3 cursor-nesw-resize',
  se: '-right-3 -bottom-3 cursor-nwse-resize',
};

export function TraceRect({
  section,
  label,
  selected,
  onPointerDown,
  onHandlePointerDown,
}: {
  section: SectionDraft;
  label: string;
  selected: boolean;
  onPointerDown: (event: PointerEvent) => void;
  onHandlePointerDown: (event: PointerEvent, corner: Corner) => void;
}) {
  return (
    <div
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPointerDown={onPointerDown}
      style={rectToStyle(section.rect)}
      className={`absolute cursor-move rounded-sm border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.4)] ${
        selected ? 'z-10 border-amber-400 bg-amber-300/25' : 'border-white bg-white/15'
      }`}
    >
      <span className="pointer-events-none absolute top-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
        {label}
      </span>
      {selected &&
        CORNERS.map((corner) => (
          <span
            key={corner}
            onPointerDown={(event) => onHandlePointerDown(event, corner)}
            className={`absolute h-6 w-6 rounded-full border-2 border-amber-400 bg-white shadow ${cornerClass[corner]}`}
          />
        ))}
    </div>
  );
}
