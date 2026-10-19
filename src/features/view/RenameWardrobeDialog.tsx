import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../components/Toast';
import { useRenameWardrobe } from '../../data/hooks';
import type { Wardrobe } from '../../data/types';
import { errorMessage } from '../../lib/errors';

export function RenameWardrobeDialog({ wardrobe, onClose }: { wardrobe: Wardrobe; onClose: () => void }) {
  const toast = useToast();
  const renameWardrobe = useRenameWardrobe(wardrobe.id);
  const [name, setName] = useState(wardrobe.name);
  const trimmed = name.trim();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    if (trimmed === wardrobe.name) {
      onClose();
      return;
    }
    renameWardrobe.mutateAsync(trimmed).then(onClose, (error) => toast(errorMessage(error)));
  }

  return (
    <Dialog title="Rename wardrobe" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="eyebrow flex flex-col gap-1.5">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            autoFocus
            className="field"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!trimmed || renameWardrobe.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
