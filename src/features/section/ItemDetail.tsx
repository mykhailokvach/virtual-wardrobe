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
    // mutateAsync rather than mutate callbacks: moving the item out of this section can unmount this dialog
    // before the mutation settles, and TanStack Query skips per-call callbacks once the observer is gone.
    updateItem.mutateAsync({ id: item.id, patch }).then(onSuccess, (error) => toast(errorMessage(error)));
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
      {url && <img src={url} alt={label} className="max-h-[40dvh] w-full border border-line bg-plate object-contain" />}
      <div className="mt-4 flex flex-col gap-3">
        <label className="eyebrow flex flex-col gap-1.5">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={saveName}
            maxLength={60}
            className="field"
          />
        </label>
        <TypeToggle value={item.type} onChange={(type) => update({ type })} />
        <label className="eyebrow flex flex-col gap-1.5">
          Section
          <select
            value={item.sectionId}
            onChange={(event) =>
              update({ sectionId: event.target.value }, () => {
                toast('Item moved');
                onClose();
              })
            }
            className="field"
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
              onClick={() => deleteItem.mutateAsync(item.id).then(onClose, (e) => toast(errorMessage(e)))}
            >
              Really delete?
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
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
