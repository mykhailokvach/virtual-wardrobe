import type { Rect } from '../lib/geometry';

export type ItemType = 'clothes' | 'shoes';

export interface Wardrobe {
  id: string;
  name: string;
  photoId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Section {
  id: string;
  wardrobeId: string;
  name?: string;
  /** Fractions (0–1) of the wardrobe photo. */
  rect: Rect;
  /** 0-based position: top-to-bottom, then left-to-right. */
  order: number;
}

export interface Item {
  id: string;
  wardrobeId: string;
  sectionId: string;
  type: ItemType;
  name?: string;
  photoId: string;
  createdAt: number;
}

/** Image bytes are stored as an ArrayBuffer (not a Blob) to avoid Safari's IndexedDB blob bugs. */
export interface Photo {
  id: string;
  data: ArrayBuffer;
  mime: string;
  width: number;
  height: number;
}

export type NewPhoto = Omit<Photo, 'id'>;

/** A section as edited in trace mode; the order is derived when saving. */
export interface SectionDraft {
  id: string;
  name?: string;
  rect: Rect;
}

/** For each removed section that has items: the section id to move them to, or null to delete them. */
export type SectionRemovals = Record<string, string | null>;

export interface NewItem {
  type: ItemType;
  name?: string;
  photo: NewPhoto;
}

export type ItemPatch = Partial<Pick<Item, 'name' | 'type' | 'sectionId'>>;

/** Item counts per section id. */
export type SectionCounts = Record<string, Record<ItemType, number>>;
