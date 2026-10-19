import { sortSections } from '../lib/geometry';
import { WardrobeDB } from './db';
import type { WardrobeRepository } from './repository';
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

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

const cleanName = (name: string | undefined) => name?.trim() || undefined;

export class DexieRepository implements WardrobeRepository {
  constructor(private readonly db = new WardrobeDB()) {}

  async listWardrobes(): Promise<Wardrobe[]> {
    return this.db.wardrobes.orderBy('createdAt').reverse().toArray();
  }

  async getWardrobe(id: string): Promise<Wardrobe | null> {
    return (await this.db.wardrobes.get(id)) ?? null;
  }

  async createWardrobe(name: string, photo: NewPhoto): Promise<Wardrobe> {
    const now = Date.now();
    const wardrobe: Wardrobe = {
      id: crypto.randomUUID(),
      name: name.trim(),
      photoId: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await this.db.transaction('rw', this.db.wardrobes, this.db.photos, async () => {
      await this.db.photos.add({ id: wardrobe.photoId, ...photo });
      await this.db.wardrobes.add(wardrobe);
    });
    return wardrobe;
  }

  async renameWardrobe(id: string, name: string): Promise<Wardrobe> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('A wardrobe name is required');
    return this.db.transaction('rw', this.db.wardrobes, async () => {
      const wardrobe = await this.db.wardrobes.get(id);
      if (!wardrobe) throw new NotFoundError(`Wardrobe ${id} not found`);
      const renamed: Wardrobe = { ...wardrobe, name: trimmed, updatedAt: Date.now() };
      await this.db.wardrobes.put(renamed);
      return renamed;
    });
  }

  async deleteWardrobe(id: string): Promise<void> {
    const { wardrobes, sections, items, photos } = this.db;
    await this.db.transaction('rw', [wardrobes, sections, items, photos], async () => {
      const wardrobe = await wardrobes.get(id);
      if (!wardrobe) return;
      const wardrobeItems = await items.where('wardrobeId').equals(id).toArray();
      await photos.bulkDelete([wardrobe.photoId, ...wardrobeItems.map((i) => i.photoId)]);
      await items.bulkDelete(wardrobeItems.map((i) => i.id));
      await sections.where('wardrobeId').equals(id).delete();
      await wardrobes.delete(id);
    });
  }

  async listSections(wardrobeId: string): Promise<Section[]> {
    return this.db.sections.where('wardrobeId').equals(wardrobeId).sortBy('order');
  }

  async saveSections(wardrobeId: string, drafts: SectionDraft[], removals: SectionRemovals): Promise<Section[]> {
    const next: Section[] = sortSections(drafts).map((draft, order) => ({
      id: draft.id,
      wardrobeId,
      name: cleanName(draft.name),
      rect: draft.rect,
      order,
    }));
    const keptIds = new Set(next.map((s) => s.id));
    const { wardrobes, sections, items, photos } = this.db;

    await this.db.transaction('rw', [wardrobes, sections, items, photos], async () => {
      if (!(await wardrobes.get(wardrobeId))) throw new NotFoundError(`Wardrobe ${wardrobeId} not found`);

      const removed = (await sections.where('wardrobeId').equals(wardrobeId).toArray()).filter(
        (s) => !keptIds.has(s.id),
      );
      for (const section of removed) {
        const sectionItems = await items.where('sectionId').equals(section.id).toArray();
        if (sectionItems.length === 0) continue;

        const target = removals[section.id];
        if (target === undefined) throw new Error(`No decision for the items in section ${section.id}`);
        if (target === null) {
          await photos.bulkDelete(sectionItems.map((i) => i.photoId));
          await items.bulkDelete(sectionItems.map((i) => i.id));
        } else {
          if (!keptIds.has(target)) throw new NotFoundError(`Target section ${target} not found`);
          await items.where('sectionId').equals(section.id).modify({ sectionId: target });
        }
      }

      await sections.bulkDelete(removed.map((s) => s.id));
      await sections.bulkPut(next);
      await wardrobes.update(wardrobeId, { updatedAt: Date.now() });
    });

    return next;
  }

  async countItems(wardrobeId: string): Promise<SectionCounts> {
    const counts: SectionCounts = {};
    await this.db.items
      .where('wardrobeId')
      .equals(wardrobeId)
      .each((item) => {
        counts[item.sectionId] ??= { clothes: 0, shoes: 0 };
        counts[item.sectionId][item.type] += 1;
      });
    return counts;
  }

  async listItems(sectionId: string): Promise<Item[]> {
    const items = await this.db.items.where('sectionId').equals(sectionId).sortBy('createdAt');
    return items.reverse();
  }

  async addItems(sectionId: string, newItems: NewItem[]): Promise<Item[]> {
    const { sections, items, photos } = this.db;
    return this.db.transaction('rw', [sections, items, photos], async () => {
      const section = await sections.get(sectionId);
      if (!section) throw new NotFoundError(`Section ${sectionId} not found`);

      const now = Date.now();
      const created: Item[] = newItems.map((input, index) => ({
        id: crypto.randomUUID(),
        wardrobeId: section.wardrobeId,
        sectionId,
        type: input.type,
        name: cleanName(input.name),
        photoId: crypto.randomUUID(),
        // Distinct timestamps keep "newest first" stable for batch uploads.
        createdAt: now + index,
      }));
      await photos.bulkAdd(newItems.map((input, index) => ({ id: created[index].photoId, ...input.photo })));
      await items.bulkAdd(created);
      return created;
    });
  }

  async updateItem(id: string, patch: ItemPatch): Promise<void> {
    const { sections, items } = this.db;
    await this.db.transaction('rw', [sections, items], async () => {
      const item = await items.get(id);
      if (!item) throw new NotFoundError(`Item ${id} not found`);
      if (patch.sectionId && patch.sectionId !== item.sectionId) {
        const target = await sections.get(patch.sectionId);
        if (!target || target.wardrobeId !== item.wardrobeId) {
          throw new NotFoundError(`Section ${patch.sectionId} not found`);
        }
      }
      const changes: ItemPatch = { ...patch };
      if ('name' in patch) changes.name = cleanName(patch.name);
      await items.update(id, changes);
    });
  }

  async deleteItem(id: string): Promise<void> {
    const { items, photos } = this.db;
    await this.db.transaction('rw', [items, photos], async () => {
      const item = await items.get(id);
      if (!item) return;
      await photos.delete(item.photoId);
      await items.delete(id);
    });
  }

  async getPhoto(id: string): Promise<Photo | null> {
    return (await this.db.photos.get(id)) ?? null;
  }
}
