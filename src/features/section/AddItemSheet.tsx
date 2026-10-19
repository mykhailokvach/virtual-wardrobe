import { useEffect, useEffectEvent, useState } from 'react';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { useAddItems } from '../../data/hooks';
import { useObjectUrl } from '../../data/photo-url';
import type { ItemType, NewPhoto } from '../../data/types';
import { errorMessage } from '../../lib/errors';
import { compressImage, ITEM_MAX_EDGE } from '../../lib/image';
import { TypeToggle } from './TypeToggle';

const LAST_TYPE_KEY = 'virtual-wardrobe:last-item-type';

function readLastType(): ItemType {
  try {
    return localStorage.getItem(LAST_TYPE_KEY) === 'shoes' ? 'shoes' : 'clothes';
  } catch {
    return 'clothes';
  }
}

function writeLastType(type: ItemType) {
  try {
    localStorage.setItem(LAST_TYPE_KEY, type);
  } catch {
    // Storage unavailable: the default is good enough.
  }
}

function PhotoPreview({ photo, large }: { photo: NewPhoto; large: boolean }) {
  const url = useObjectUrl(photo);
  const className = large
    ? 'col-span-3 max-h-64 w-full border border-line bg-plate object-contain'
    : 'aspect-square w-full border border-line object-cover';
  return url ? <img src={url} alt="" className={className} /> : <div className={`${className} bg-plate`} />;
}

export function AddItemSheet({
  sectionId,
  sectionLabel,
  files,
  onClose,
}: {
  sectionId: string;
  sectionLabel: string;
  files: File[];
  onClose: () => void;
}) {
  const toast = useToast();
  const addItems = useAddItems();
  const [photos, setPhotos] = useState<NewPhoto[] | null>(null);
  const [type, setType] = useState<ItemType>(readLastType);
  const [name, setName] = useState('');

  const onCompressed = useEffectEvent((results: PromiseSettledResult<NewPhoto>[]) => {
    const ready = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (ready.length === 0) {
      toast(errorMessage(failed[0]?.reason));
      onClose();
      return;
    }
    if (failed.length > 0) toast(`${failed.length} of ${results.length} images couldn't be read and were skipped.`);
    setPhotos(ready);
  });

  useEffect(() => {
    let active = true;
    Promise.allSettled(files.map((file) => compressImage(file, ITEM_MAX_EDGE))).then((results) => {
      if (active) onCompressed(results);
    });
    return () => {
      active = false;
    };
  }, [files]);

  function handleSave() {
    if (!photos) return;
    const itemName = photos.length === 1 ? name : undefined;
    addItems.mutate(
      { sectionId, items: photos.map((photo) => ({ type, name: itemName, photo })) },
      {
        onSuccess: (items) => {
          writeLastType(type);
          toast(items.length === 1 ? 'Item added' : `${items.length} items added`);
          onClose();
        },
        onError: (error) => toast(errorMessage(error)),
      },
    );
  }

  const title = files.length === 1 ? `Add to ${sectionLabel}` : `Add ${files.length} items to ${sectionLabel}`;

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <Button className="w-full" onClick={handleSave} disabled={!photos || addItems.isPending}>
          Save
        </Button>
      }
    >
      {!photos ? (
        <p className="py-8 text-center text-sm text-muted">Preparing photos…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <PhotoPreview key={index} photo={photo} large={photos.length === 1} />
            ))}
          </div>
          <TypeToggle value={type} onChange={setType} />
          {photos.length === 1 && (
            <label className="eyebrow flex flex-col gap-1.5">
              Name (optional)
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                className="field"
              />
            </label>
          )}
        </div>
      )}
    </Sheet>
  );
}
