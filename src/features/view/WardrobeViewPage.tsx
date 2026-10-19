import { useState } from 'react';
import { Link, Outlet, useNavigate, useParams } from 'react-router';
import { NotFound } from '../../app/NotFound';
import { Button, buttonClass } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PhotoStage } from '../../components/PhotoStage';
import { TrashIcon } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { useDeleteWardrobe, usePhoto, useSectionCounts, useSections, useWardrobe } from '../../data/hooks';
import { errorMessage } from '../../lib/errors';
import { sectionLabel } from '../../lib/labels';
import { AddItemSheet } from '../section/AddItemSheet';
import { SectionHotspot } from './SectionHotspot';

export function WardrobeViewPage() {
  const { wardrobeId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const wardrobe = useWardrobe(wardrobeId);
  const sections = useSections(wardrobeId);
  const counts = useSectionCounts(wardrobeId);
  const photo = usePhoto(wardrobe.data?.photoId);
  const deleteWardrobe = useDeleteWardrobe();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adding, setAdding] = useState<{ sectionId: string; label: string; files: File[] } | null>(null);

  if (wardrobe.isPending || sections.isPending || (wardrobe.data && photo.isPending)) return null;
  if (!wardrobe.data || !photo.data) return <NotFound what="wardrobe" />;

  const current = wardrobe.data;
  const sectionList = sections.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="caps truncate text-2xl">{current.name}</h1>
        <div className="flex shrink-0 gap-1">
          <Link to={`/wardrobes/${current.id}/edit`} className={buttonClass('secondary')}>
            Edit layout
          </Link>
          <Button variant="danger" className="w-11 px-0" aria-label="Delete wardrobe" onClick={() => setConfirmDelete(true)}>
            <TrashIcon />
          </Button>
        </div>
      </div>

      <PhotoStage
        photoId={current.photoId}
        width={photo.data.width}
        height={photo.data.height}
        alt={current.name}
        reservedHeight={150}
      >
        {sectionList.map((section) => (
          <SectionHotspot
            key={section.id}
            section={section}
            label={sectionLabel(section.name, section.order)}
            counts={counts.data?.[section.id]}
            onAdd={(files) =>
              setAdding({ sectionId: section.id, label: sectionLabel(section.name, section.order), files })
            }
          />
        ))}
      </PhotoStage>

      {sectionList.length === 0 && (
        <div className="border border-dashed border-line2 p-6 text-center">
          <p className="text-text3">No sections yet.</p>
          <Link to={`/wardrobes/${current.id}/edit`} className={buttonClass('primary', 'mt-3')}>
            Trace sections
          </Link>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${current.name}?`}
          message="This deletes the wardrobe, its sections and every item in it."
          confirmLabel="Delete wardrobe"
          busy={deleteWardrobe.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() =>
            deleteWardrobe.mutate(current.id, {
              onSuccess: () => navigate('/', { replace: true }),
              onError: (error) => toast(errorMessage(error)),
            })
          }
        />
      )}

      {adding && (
        <AddItemSheet
          sectionId={adding.sectionId}
          sectionLabel={adding.label}
          files={adding.files}
          onClose={() => setAdding(null)}
        />
      )}

      <Outlet />
    </div>
  );
}
