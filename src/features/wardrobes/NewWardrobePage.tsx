import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, buttonClass } from '../../components/Button';
import { ImagePickerButton } from '../../components/ImagePickerButton';
import { useToast } from '../../components/Toast';
import { useCreateWardrobe } from '../../data/hooks';
import { useObjectUrl } from '../../data/photo-url';
import type { NewPhoto } from '../../data/types';
import { errorMessage } from '../../lib/errors';
import { compressImage, WARDROBE_MAX_EDGE } from '../../lib/image';

const DEFAULT_NAME = 'My wardrobe';

export function NewWardrobePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const createWardrobe = useCreateWardrobe();
  const [name, setName] = useState(DEFAULT_NAME);
  const [photo, setPhoto] = useState<NewPhoto | null>(null);
  const [processing, setProcessing] = useState(false);
  const previewUrl = useObjectUrl(photo);

  async function handlePick([file]: File[]) {
    setProcessing(true);
    try {
      setPhoto(await compressImage(file, WARDROBE_MAX_EDGE));
    } catch (error) {
      toast(errorMessage(error));
    } finally {
      setProcessing(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!photo) return;
    createWardrobe.mutate(
      { name: name.trim() || DEFAULT_NAME, photo },
      {
        onSuccess: (wardrobe) => navigate(`/wardrobes/${wardrobe.id}/edit`, { replace: true }),
        onError: (error) => toast(errorMessage(error)),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="caps text-2xl">New wardrobe</h1>

      <label className="eyebrow flex flex-col gap-1.5">
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          className="field"
        />
      </label>

      {previewUrl ? (
        <img src={previewUrl} alt="Wardrobe photo preview" className="max-h-[50dvh] w-full border border-line bg-plate object-contain" />
      ) : (
        <div className="flex aspect-[3/4] max-h-[50dvh] w-full items-center justify-center border border-dashed border-line2 p-6 text-center text-sm text-muted">
          {processing ? 'Processing…' : 'Photograph your whole wardrobe with the doors open.'}
        </div>
      )}

      <ImagePickerButton onPick={handlePick} className={buttonClass('secondary')} disabled={processing}>
        {photo ? 'Choose another photo' : 'Choose or take a photo'}
      </ImagePickerButton>

      <Button type="submit" disabled={!photo || createWardrobe.isPending}>
        Create and trace sections
      </Button>
    </form>
  );
}
