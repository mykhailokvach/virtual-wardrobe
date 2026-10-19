import { Link } from 'react-router';
import { ImagePickerButton } from '../../components/ImagePickerButton';
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
  const badge = [clothes > 0 && `👕 ${clothes}`, shoes > 0 && `👟 ${shoes}`].filter(Boolean).join(' · ');

  return (
    <div className="absolute" style={rectToStyle(section.rect)}>
      <Link
        to={`/wardrobes/${section.wardrobeId}/sections/${section.id}`}
        aria-label={`Open ${label}`}
        className="absolute inset-0 border-2 border-[#e9e7e2]/90 bg-[#e9e7e2]/5 shadow-[0_0_0_1px_rgba(0,0,0,0.45)] transition hover:border-accent hover:bg-accent/15"
      >
        <span className="caps absolute top-1.5 left-1.5 max-w-[calc(100%-3rem)] truncate bg-[#141516]/80 px-1.5 py-0.5 text-[#e9e7e2] text-xs">
          {label}
        </span>
        {badge && (
          <span className="absolute bottom-1.5 left-1.5 bg-[#141516]/80 px-1.5 py-0.5 text-[#e9e7e2] font-mono text-xs">{badge}</span>
        )}
      </Link>
      <ImagePickerButton
        multiple
        onPick={onAdd}
        aria-label={`Add item to ${label}`}
        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center bg-accent font-mono text-xl font-medium text-on-accent shadow-[inset_0_-2px_0_var(--accent-edge)] hover:bg-accent-hover"
      >
        +
      </ImagePickerButton>
    </div>
  );
}
