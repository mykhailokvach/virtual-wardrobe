import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { buttonClass } from '../../components/Button';
import { ImagePickerButton } from '../../components/ImagePickerButton';
import { Sheet } from '../../components/Sheet';
import { PhotoImg } from '../../components/PhotoImg';
import { useItems, useSections } from '../../data/hooks';
import type { ItemType } from '../../data/types';
import { itemLabel, sectionLabel } from '../../lib/labels';
import { AddItemSheet } from './AddItemSheet';
import { ItemDetail } from './ItemDetail';

type Filter = 'all' | ItemType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'clothes', label: 'Clothes' },
  { value: 'shoes', label: 'Shoes' },
];

export function SectionSheet() {
  const { wardrobeId = '', sectionId = '' } = useParams();
  const navigate = useNavigate();
  const sections = useSections(wardrobeId);
  const items = useItems(sectionId);
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState<File[] | null>(null);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const close = useCallback(() => navigate(`/wardrobes/${wardrobeId}`), [navigate, wardrobeId]);

  if (sections.isPending) return null;
  const section = sections.data?.find((s) => s.id === sectionId);
  if (!section) {
    return (
      <Sheet title="Not found" onClose={close}>
        <p className="text-stone-600">This section doesn't exist anymore.</p>
      </Sheet>
    );
  }

  const label = sectionLabel(section.name, section.order);
  const visible = (items.data ?? []).filter((item) => filter === 'all' || item.type === filter);
  const openItem = items.data?.find((item) => item.id === openItemId);

  return (
    <>
      <Sheet
        title={label}
        onClose={close}
        footer={
          <ImagePickerButton multiple onPick={setAdding} className={buttonClass('primary', 'w-full')}>
            + Add clothes or shoes
          </ImagePickerButton>
        }
      >
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                filter === f.value ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {items.data && visible.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-500">
            {filter === 'all' ? 'Nothing here yet.' : 'No items of this type.'}
          </p>
        )}

        {visible.length > 0 && (
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setOpenItemId(item.id)}
                  className="block w-full overflow-hidden rounded-xl bg-stone-100"
                >
                  <PhotoImg photoId={item.photoId} alt={itemLabel(item)} className="aspect-square w-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
      {adding && (
        <AddItemSheet sectionId={section.id} sectionLabel={label} files={adding} onClose={() => setAdding(null)} />
      )}
      {openItem && (
        <ItemDetail item={openItem} sections={sections.data ?? []} onClose={() => setOpenItemId(null)} />
      )}
    </>
  );
}
