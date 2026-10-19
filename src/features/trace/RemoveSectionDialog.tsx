import { useState } from 'react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';

export function RemoveSectionDialog({
  label,
  itemCount,
  targets,
  onConfirm,
  onCancel,
}: {
  label: string;
  itemCount: number;
  /** Sections the items can be moved to. */
  targets: { id: string; label: string }[];
  /** null = delete the items too. */
  onConfirm: (target: string | null) => void;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState(targets[0]?.id ?? '');

  return (
    <Dialog title={`Delete ${label}?`} onClose={onCancel}>
      <p className="text-sm text-stone-600">
        This section has {itemCount} {itemCount === 1 ? 'item' : 'items'}.
      </p>
      {targets.length > 0 && (
        <div className="mt-4 flex gap-2">
          <select
            aria-label="Move items to"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2 py-2 text-base"
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <Button onClick={() => onConfirm(target)}>Move items</Button>
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => onConfirm(null)}>
          Delete items too
        </Button>
      </div>
    </Dialog>
  );
}
