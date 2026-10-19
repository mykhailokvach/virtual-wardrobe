// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestRepository, testPhoto } from '../test/fixtures';
import type { DexieRepository } from './dexie-repository';

const rect = (x: number, y: number) => ({ x, y, w: 0.2, h: 0.2 });

let repo: DexieRepository;

beforeEach(() => {
  repo = createTestRepository();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function wardrobeWithSections() {
  const wardrobe = await repo.createWardrobe('Closet', testPhoto());
  const sections = await repo.saveSections(
    wardrobe.id,
    [
      { id: 'bottom', rect: rect(0.1, 0.7) },
      { id: 'top', name: 'Top shelf', rect: rect(0.1, 0.1) },
    ],
    {},
  );
  return { wardrobe, sections };
}

describe('wardrobes', () => {
  it('creates a wardrobe with its photo', async () => {
    const wardrobe = await repo.createWardrobe('Closet', testPhoto([9, 8, 7]));

    expect(await repo.getWardrobe(wardrobe.id)).toEqual(wardrobe);
    const photo = await repo.getPhoto(wardrobe.photoId);
    expect(new Uint8Array(photo!.data)).toEqual(new Uint8Array([9, 8, 7]));
    expect(photo).toMatchObject({ mime: 'image/jpeg', width: 400, height: 600 });
  });

  it('returns null for unknown ids', async () => {
    expect(await repo.getWardrobe('missing')).toBeNull();
    expect(await repo.getPhoto('missing')).toBeNull();
  });

  it('lists wardrobes newest first', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000);
    await repo.createWardrobe('Old', testPhoto());
    await repo.createWardrobe('New', testPhoto());

    expect((await repo.listWardrobes()).map((w) => w.name)).toEqual(['New', 'Old']);
  });

  it('renames a wardrobe, trimming the name', async () => {
    const wardrobe = await repo.createWardrobe('Closet', testPhoto());

    vi.spyOn(Date, 'now').mockReturnValue(wardrobe.updatedAt + 1000);
    const renamed = await repo.renameWardrobe(wardrobe.id, '  Hallway closet ');

    expect(renamed).toEqual({ ...wardrobe, name: 'Hallway closet', updatedAt: wardrobe.updatedAt + 1000 });
    expect(await repo.getWardrobe(wardrobe.id)).toEqual(renamed);
  });

  it('refuses a blank name or an unknown wardrobe', async () => {
    const wardrobe = await repo.createWardrobe('Closet', testPhoto());

    await expect(repo.renameWardrobe(wardrobe.id, '   ')).rejects.toThrow(/name/i);
    await expect(repo.renameWardrobe('missing', 'Hallway')).rejects.toThrow(/not found/i);
    expect((await repo.getWardrobe(wardrobe.id))?.name).toBe('Closet');
  });

  it('deletes a wardrobe with its sections, items and photos', async () => {
    const { wardrobe, sections } = await wardrobeWithSections();
    const [item] = await repo.addItems(sections[0].id, [{ type: 'shoes', photo: testPhoto() }]);

    await repo.deleteWardrobe(wardrobe.id);

    expect(await repo.getWardrobe(wardrobe.id)).toBeNull();
    expect(await repo.listSections(wardrobe.id)).toEqual([]);
    expect(await repo.listItems(sections[0].id)).toEqual([]);
    expect(await repo.getPhoto(wardrobe.photoId)).toBeNull();
    expect(await repo.getPhoto(item.photoId)).toBeNull();
  });
});

describe('sections', () => {
  it('saves sections ordered top-to-bottom', async () => {
    const { wardrobe, sections } = await wardrobeWithSections();

    expect(sections.map((s) => [s.id, s.order])).toEqual([
      ['top', 0],
      ['bottom', 1],
    ]);
    expect(await repo.listSections(wardrobe.id)).toEqual(sections);
  });

  it('trims names and drops empty ones', async () => {
    const wardrobe = await repo.createWardrobe('Closet', testPhoto());
    const [a, b] = await repo.saveSections(
      wardrobe.id,
      [
        { id: 'a', name: '  Socks ', rect: rect(0.1, 0.1) },
        { id: 'b', name: '   ', rect: rect(0.1, 0.5) },
      ],
      {},
    );
    expect(a.name).toBe('Socks');
    expect(b.name).toBeUndefined();
  });

  it('deletes the items of a removed section when told to', async () => {
    const { wardrobe } = await wardrobeWithSections();
    const [item] = await repo.addItems('bottom', [{ type: 'clothes', photo: testPhoto() }]);

    await repo.saveSections(wardrobe.id, [{ id: 'top', rect: rect(0.1, 0.1) }], { bottom: null });

    expect((await repo.listSections(wardrobe.id)).map((s) => s.id)).toEqual(['top']);
    expect(await repo.listItems('bottom')).toEqual([]);
    expect(await repo.getPhoto(item.photoId)).toBeNull();
  });

  it('moves the items of a removed section when told to', async () => {
    const { wardrobe } = await wardrobeWithSections();
    const [item] = await repo.addItems('bottom', [{ type: 'clothes', photo: testPhoto() }]);

    await repo.saveSections(wardrobe.id, [{ id: 'top', rect: rect(0.1, 0.1) }], { bottom: 'top' });

    expect((await repo.listItems('top')).map((i) => i.id)).toEqual([item.id]);
  });

  it('refuses to drop items without a decision and changes nothing', async () => {
    const { wardrobe, sections } = await wardrobeWithSections();
    await repo.addItems('bottom', [{ type: 'clothes', photo: testPhoto() }]);

    await expect(repo.saveSections(wardrobe.id, [{ id: 'top', rect: rect(0.1, 0.1) }], {})).rejects.toThrow(
      /no decision/i,
    );

    expect(await repo.listSections(wardrobe.id)).toEqual(sections);
    expect(await repo.listItems('bottom')).toHaveLength(1);
  });

  it('removes empty sections without a decision', async () => {
    const { wardrobe } = await wardrobeWithSections();
    await repo.saveSections(wardrobe.id, [{ id: 'top', rect: rect(0.1, 0.1) }], {});
    expect((await repo.listSections(wardrobe.id)).map((s) => s.id)).toEqual(['top']);
  });
});

describe('items', () => {
  it('adds items newest first and counts them per section', async () => {
    const { wardrobe } = await wardrobeWithSections();
    await repo.addItems('top', [
      { type: 'clothes', name: ' Shirt ', photo: testPhoto() },
      { type: 'shoes', photo: testPhoto() },
    ]);
    await repo.addItems('bottom', [{ type: 'shoes', photo: testPhoto() }]);

    const items = await repo.listItems('top');
    expect(items.map((i) => [i.type, i.name])).toEqual([
      ['shoes', undefined],
      ['clothes', 'Shirt'],
    ]);
    expect(items[0].wardrobeId).toBe(wardrobe.id);
    expect(await repo.countItems(wardrobe.id)).toEqual({
      top: { clothes: 1, shoes: 1 },
      bottom: { clothes: 0, shoes: 1 },
    });
  });

  it('rejects items for an unknown section', async () => {
    await expect(repo.addItems('missing', [{ type: 'shoes', photo: testPhoto() }])).rejects.toThrow(/not found/i);
  });

  it('renames, retypes and moves an item', async () => {
    await wardrobeWithSections();
    const [item] = await repo.addItems('top', [{ type: 'clothes', name: 'Shirt', photo: testPhoto() }]);

    await repo.updateItem(item.id, { name: 'Boots', type: 'shoes', sectionId: 'bottom' });

    expect(await repo.listItems('top')).toEqual([]);
    expect(await repo.listItems('bottom')).toMatchObject([{ id: item.id, name: 'Boots', type: 'shoes' }]);
  });

  it('clears the name when renamed to blank', async () => {
    await wardrobeWithSections();
    const [item] = await repo.addItems('top', [{ type: 'clothes', name: 'Shirt', photo: testPhoto() }]);

    await repo.updateItem(item.id, { name: '  ' });

    expect((await repo.listItems('top'))[0].name).toBeUndefined();
  });

  it("refuses to move an item into another wardrobe's section", async () => {
    await wardrobeWithSections();
    const [item] = await repo.addItems('top', [{ type: 'clothes', photo: testPhoto() }]);
    const other = await repo.createWardrobe('Other', testPhoto());
    await repo.saveSections(other.id, [{ id: 'elsewhere', rect: rect(0, 0) }], {});

    await expect(repo.updateItem(item.id, { sectionId: 'elsewhere' })).rejects.toThrow(/not found/i);
  });

  it('deletes an item and its photo', async () => {
    await wardrobeWithSections();
    const [item] = await repo.addItems('top', [{ type: 'clothes', photo: testPhoto() }]);

    await repo.deleteItem(item.id);

    expect(await repo.listItems('top')).toEqual([]);
    expect(await repo.getPhoto(item.photoId)).toBeNull();
  });
});
