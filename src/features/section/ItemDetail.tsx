import { useState } from 'react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../components/Toast';
import { useDeleteItem, useUpdateItem } from '../../data/hooks';
import { usePhotoUrl } from '../../data/photo-url';
import type { Item, ItemPatch, Section } from '../../data/types';
import { errorMessage } from '../../lib/errors';
import { itemLabel, sectionLabel } from '../../lib/labels';
import { TypeToggle } from './TypeToggle';

export function ItemDetail({ item, sections, onClose }: { item: Item; sections: Section[]; onClose: () => void }) {
  const toast = useToast();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const url = usePhotoUrl(item.photoId);
  const [name, setName] = useState(item.name ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const label = itemLabel(item);

  function update(patch: ItemPatch, onSuccess?: () => void) {
    updateItem.mutate({ id: item.id, patch }, { onSuccess, onError: (error) => toast(errorMessage(error)) });
  }

  function saveName() {
    if (name.trim() !== (item.name ?? '')) update({ name });
  }

  function close() {
    saveName();
    onClose();
  }

  return (
    <Dialog title={label} onClose={close}>
      {url && <img src={url} alt={label} className="max-h-[40dvh] w-full rounded-xl bg-stone-100 object-contain" />}
      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={saveName}
            maxLength={60}
            className="rounded-lg border border-stone-300 px-3 py-2 text-base"
          />
        </label>
        <TypeToggle value={item.type} onChange={(type) => update({ type })} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Section
          <select
            value={item.sectionId}
            onChange={(event) =>
              update({ sectionId: event.target.value }, () => {
                toast('Item moved');
                onClose();
              })
            }
            className="rounded-lg border border-stone-300 px-2 py-2 text-base"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {sectionLabel(section.name, section.order)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-between gap-2 pt-2">
          {confirmingDelete ? (
            <Button
              variant="danger"
              disabled={deleteItem.isPending}
              onClick={() => deleteItem.mutate(item.id, { onSuccess: onClose, onError: (e) => toast(errorMessage(e)) })}
            >
              Really delete?
            </Button>
          ) : (
            <Button variant="ghost" className="text-red-600" onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
