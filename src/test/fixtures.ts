import { WardrobeDB } from '../data/db';
import { DexieRepository } from '../data/dexie-repository';
import type { WardrobeRepository } from '../data/repository';
import type { NewPhoto } from '../data/types';

/** A repository backed by a fresh, uniquely named fake-indexeddb database. */
export function createTestRepository(): DexieRepository {
  return new DexieRepository(new WardrobeDB(`test-${crypto.randomUUID()}`));
}

export function testPhoto(bytes: number[] = [1, 2, 3]): NewPhoto {
  return { data: new Uint8Array(bytes).buffer, mime: 'image/jpeg', width: 400, height: 600 };
}

/** A wardrobe with one section named "Top shelf" (id "shelf"). */
export async function seedShelf(repository: WardrobeRepository) {
  const wardrobe = await repository.createWardrobe('Closet', testPhoto());
  const [shelf] = await repository.saveSections(
    wardrobe.id,
    [{ id: 'shelf', name: 'Top shelf', rect: { x: 0.1, y: 0.1, w: 0.5, h: 0.2 } }],
    {},
  );
  return { wardrobe, shelf };
}
