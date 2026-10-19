import type { PointerEvent } from 'react';
import type { SectionDraft } from '../../data/types';
import { rectToStyle, type Corner } from '../../lib/geometry';

const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];

// 16px handles centred on the 2px border line: 8px half-size + 1px half-border (children sit inside the border).
const cornerClass: Record<Corner, string> = {
  nw: '-top-[9px] -left-[9px] cursor-nwse-resize',
  ne: '-top-[9px] -right-[9px] cursor-nesw-resize',
  sw: '-bottom-[9px] -left-[9px] cursor-nesw-resize',
  se: '-right-[9px] -bottom-[9px] cursor-nwse-resize',
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
      className={`absolute cursor-move border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.45)] ${
        selected ? 'z-10 border-accent bg-accent/20' : 'border-[#e9e7e2] bg-[#e9e7e2]/10'
      }`}
    >
      <span className="caps pointer-events-none absolute top-1.5 left-1.5 max-w-[calc(100%-0.75rem)] truncate bg-[#141516]/80 px-1.5 py-0.5 text-[#e9e7e2] text-[8px]">
        {label}
      </span>
      {selected &&
        CORNERS.map((corner) => (
          <span
            key={corner}
            onPointerDown={(event) => onHandlePointerDown(event, corner)}
            className={`absolute h-4 w-4 border-2 border-[#141516] bg-accent ${cornerClass[corner]}`}
          />
        ))}
    </div>
  );
}
