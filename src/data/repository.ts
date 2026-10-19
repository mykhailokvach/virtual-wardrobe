import type {
  Item,
  ItemPatch,
  NewItem,
  NewPhoto,
  Photo,
  Section,
  SectionCounts,
  SectionDraft,
  SectionRemovals,
  Wardrobe,
} from './types';

/**
 * The only way the app touches persistent data. v1 uses IndexedDB (DexieRepository);
 * a future HttpRepository must pass the same contract tests (dexie-repository.test.ts).
 * Lookups return null (not undefined) because TanStack Query rejects undefined data.
 */
export interface WardrobeRepository {
  /** Newest first. */
  listWardrobes(): Promise<Wardrobe[]>;
  getWardrobe(id: string): Promise<Wardrobe | null>;
  createWardrobe(name: string, photo: NewPhoto): Promise<Wardrobe>;
  /** Also deletes its sections, items and every photo. */
  deleteWardrobe(id: string): Promise<void>;

  /** Sorted by `order`. */
  listSections(wardrobeId: string): Promise<Section[]>;
  /**
   * Replaces the wardrobe's sections with `drafts` atomically. Sections missing from `drafts`
   * are removed; if one has items, `removals[id]` decides what happens to them, and a missing
   * decision is an error.
   */
  saveSections(wardrobeId: string, drafts: SectionDraft[], removals: SectionRemovals): Promise<Section[]>;

  countItems(wardrobeId: string): Promise<SectionCounts>;
  /** Newest first. */
  listItems(sectionId: string): Promise<Item[]>;
  addItems(sectionId: string, items: NewItem[]): Promise<Item[]>;
  updateItem(id: string, patch: ItemPatch): Promise<void>;
  deleteItem(id: string): Promise<void>;

  getPhoto(id: string): Promise<Photo | null>;
}
