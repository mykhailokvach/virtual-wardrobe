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
        className="absolute inset-0 rounded-sm border-2 border-white/90 bg-white/10 shadow-[0_0_0_1px_rgba(0,0,0,0.35)] transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-amber-400"
      >
        <span className="absolute top-1 left-1 max-w-[calc(100%-2.75rem)] truncate rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
          {label}
        </span>
        {badge && (
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">{badge}</span>
        )}
      </Link>
      <ImagePickerButton
        multiple
        onPick={onAdd}
        aria-label={`Add item to ${label}`}
        className="absolute top-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl font-semibold text-stone-900 shadow"
      >
        +
      </ImagePickerButton>
    </div>
  );
}
