import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { NotFound } from '../../app/NotFound';
import { Button } from '../../components/Button';
import { PhotoStage } from '../../components/PhotoStage';
import { AlignIcon } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { usePhoto, useSaveSections, useSectionCounts, useSections, useWardrobe } from '../../data/hooks';
import type { Photo, Section, SectionCounts, SectionDraft, SectionRemovals, Wardrobe } from '../../data/types';
import { errorMessage } from '../../lib/errors';
import { alignSections, rectToStyle, sortSections, type Rect } from '../../lib/geometry';
import { sectionLabel } from '../../lib/labels';
import { RemoveSectionDialog } from './RemoveSectionDialog';
import { TraceRect } from './TraceRect';
import { useTraceGestures } from './useTraceGestures';

export function TracePage() {
  const { wardrobeId = '' } = useParams();
  const wardrobe = useWardrobe(wardrobeId);
  const sections = useSections(wardrobeId);
  const counts = useSectionCounts(wardrobeId);
  const photo = usePhoto(wardrobe.data?.photoId);

  if (wardrobe.isPending || sections.isPending || counts.isPending || (wardrobe.data && photo.isPending)) return null;
  if (!wardrobe.data || !photo.data) return <NotFound what="wardrobe" />;

  return (
    <TraceEditor
      wardrobe={wardrobe.data}
      photo={photo.data}
      initialSections={sections.data ?? []}
      counts={counts.data ?? {}}
    />
  );
}

function TraceEditor({
  wardrobe,
  photo,
  initialSections,
  counts,
}: {
  wardrobe: Wardrobe;
  photo: Photo;
  initialSections: Section[];
  counts: SectionCounts;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const saveSections = useSaveSections(wardrobe.id);
  const stageRef = useRef<HTMLDivElement>(null);
  const [drafts, setDrafts] = useState<SectionDraft[]>(() =>
    initialSections.map(({ id, name, rect }) => ({ id, name, rect })),
  );
  const [removals, setRemovals] = useState<SectionRemovals>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SectionDraft | null>(null);
  const gestures = useTraceGestures({ stageRef, setSections: setDrafts, onSelect: setSelectedId });

  const indexOf = new Map(sortSections(drafts).map((s, index) => [s.id, index]));
  const labelOf = (section: SectionDraft) => sectionLabel(section.name, indexOf.get(section.id) ?? 0);
  const selected = drafts.find((s) => s.id === selectedId) ?? null;
  const persistedIds = new Set(initialSections.map((s) => s.id));

  /** Stored items in this section plus any moved here from sections deleted in this session. */
  function itemCount(sectionId: string): number {
    const own = (counts[sectionId]?.clothes ?? 0) + (counts[sectionId]?.shoes ?? 0);
    const movedIn = Object.entries(removals)
      .filter(([, target]) => target === sectionId)
      .reduce((sum, [removedId]) => sum + itemCount(removedId), 0);
    return own + movedIn;
  }

  function removeSection(section: SectionDraft, target: string | null) {
    setDrafts((prev) => prev.filter((s) => s.id !== section.id));
    setRemovals((prev) => {
      const next: SectionRemovals = {};
      for (const [removedId, oldTarget] of Object.entries(prev)) {
        next[removedId] = oldTarget === section.id ? target : oldTarget;
      }
      if (persistedIds.has(section.id)) next[section.id] = target;
      return next;
    });
    setSelectedId(null);
    setPendingDelete(null);
  }

  function requestDelete(section: SectionDraft) {
    if (itemCount(section.id) > 0) setPendingDelete(section);
    else removeSection(section, null);
  }

  function rename(section: SectionDraft, name: string) {
    setDrafts((prev) => prev.map((s) => (s.id === section.id ? { ...s, name } : s)));
  }

  function handleAlign() {
    const aligned = alignSections(drafts);
    const changed = aligned.some((section, i) => !sameRect(section.rect, drafts[i].rect));
    if (changed) setDrafts(aligned);
    toast(changed ? 'Sections aligned' : 'Already aligned');
  }

  function handleDone() {
    saveSections.mutate(
      { drafts, removals },
      {
        onSuccess: () => navigate(`/wardrobes/${wardrobe.id}`, { replace: true }),
        onError: (error) => toast(errorMessage(error)),
      },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => navigate(`/wardrobes/${wardrobe.id}`)}>
          Cancel
        </Button>
        <h1 className="caps truncate text-lg">{wardrobe.name}</h1>
        <Button onClick={handleDone} disabled={saveSections.isPending}>
          Done
        </Button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Drag on the photo to mark a shelf, drawer or rail.</p>
        <Button variant="secondary" className="shrink-0" onClick={handleAlign} disabled={drafts.length < 2}>
          <AlignIcon className="h-4 w-4" />
          Align
        </Button>
      </div>

      <PhotoStage
        ref={stageRef}
        data-testid="trace-stage"
        photoId={wardrobe.photoId}
        width={photo.width}
        height={photo.height}
        alt={wardrobe.name}
        reservedHeight={240}
        className="touch-none select-none"
        onPointerDown={gestures.startDraw}
        {...gestures.stageHandlers}
      >
        {drafts.map((section) => (
          <TraceRect
            key={section.id}
            section={section}
            label={labelOf(section)}
            selected={section.id === selectedId}
            onPointerDown={(event) => gestures.startMove(event, section)}
            onHandlePointerDown={(event, corner) => gestures.startResize(event, section, corner)}
          />
        ))}
        {gestures.drawRect && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-accent bg-accent/15"
            style={rectToStyle(gestures.drawRect)}
          />
        )}
      </PhotoStage>

      {selected && (
        <div className="flex items-center gap-2 border border-line bg-surface p-2">
          <input
            aria-label="Section name"
            placeholder={sectionLabel(undefined, indexOf.get(selected.id) ?? 0)}
            value={selected.name ?? ''}
            onChange={(event) => rename(selected, event.target.value)}
            maxLength={40}
            className="field min-w-0 flex-1"
          />
          <Button variant="danger" onClick={() => requestDelete(selected)}>
            Delete
          </Button>
        </div>
      )}

      {pendingDelete && (
        <RemoveSectionDialog
          label={labelOf(pendingDelete)}
          itemCount={itemCount(pendingDelete.id)}
          targets={sortSections(drafts)
            .filter((s) => s.id !== pendingDelete.id)
            .map((s) => ({ id: s.id, label: labelOf(s) }))}
          onConfirm={(target) => removeSection(pendingDelete, target)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}
