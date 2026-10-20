import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ImagePickerButton } from '../../components/ImagePickerButton';
import { PlusIcon, ShirtIcon, ShoeIcon } from '../../components/icons';
import type { ItemType, Section } from '../../data/types';
import { rectToStyle } from '../../lib/geometry';

export function SectionHotspot({
  section,
  label,
  counts,
  onAdd,
}: {
  section: Section;
  label: string;
  counts: Record<ItemType, number> | undefined;
  onAdd: (files: File[]) => void;
}) {
  const clothes = counts?.clothes ?? 0;
  const shoes = counts?.shoes ?? 0;

  return (
    <div className="absolute" style={rectToStyle(section.rect)}>
      <Link
        to={`/wardrobes/${section.wardrobeId}/sections/${section.id}`}
        aria-label={`Open ${label}`}
        className="absolute inset-0 border-2 border-[#e9e7e2]/90 bg-[#e9e7e2]/5 shadow-[0_0_0_1px_rgba(0,0,0,0.45)] transition hover:border-accent hover:bg-accent/15"
      >
        <span className="caps absolute top-1 left-1.5 max-w-[calc(100%-3rem)] truncate bg-[#141516]/80 px-1.5 py-0.5 text-[#e9e7e2] text-[9px]">
          {label}
        </span>
        {(clothes > 0 || shoes > 0) && (
          <span className="absolute bottom-1.5 left-1.5 flex items-center gap-2 bg-[#141516]/80 px-1.5 py-0.5 font-mono text-xs text-[#e9e7e2]">
            {clothes > 0 && <CountBadge icon={<ShirtIcon className="h-3.5 w-3.5" />} label="Clothes" count={clothes} />}
            {shoes > 0 && <CountBadge icon={<ShoeIcon className="h-3.5 w-3.5" />} label="Shoes" count={shoes} />}
          </span>
        )}
      </Link>
      <ImagePickerButton
        multiple
        onPick={onAdd}
        aria-label={`Add item to ${label}`}
        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center bg-accent text-on-accent shadow-[inset_0_-2px_0_var(--accent-edge)] hover:bg-accent-hover"
      >
        <PlusIcon className="h-2.5 w-2.5" strokeWidth={4} />
      </ImagePickerButton>
    </div>
  );
}

/** Icon + number, announced as e.g. "Shoes: 2". */
function CountBadge({ icon, label, count }: { icon: ReactNode; label: string; count: number }) {
  return (
    <span role="img" aria-label={`${label}: ${count}`} className="flex items-center gap-1">
      {icon}
      {count}
    </span>
  );
}
