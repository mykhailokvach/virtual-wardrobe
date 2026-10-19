import Dexie, { type EntityTable } from 'dexie';
import type { Item, Photo, Section, Wardrobe } from './types';

export class WardrobeDB extends Dexie {
  wardrobes!: EntityTable<Wardrobe, 'id'>;
  sections!: EntityTable<Section, 'id'>;
  items!: EntityTable<Item, 'id'>;
  photos!: EntityTable<Photo, 'id'>;

  constructor(name = 'virtual-wardrobe') {
    super(name);
    this.version(1).stores({
      wardrobes: 'id, createdAt',
      sections: 'id, wardrobeId',
      items: 'id, sectionId, wardrobeId, createdAt',
      photos: 'id',
    });
  }
}
