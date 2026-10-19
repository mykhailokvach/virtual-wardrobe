import { WardrobeDB } from '../data/db';
import { DexieRepository } from '../data/dexie-repository';
import type { NewPhoto } from '../data/types';

/** A repository backed by a fresh, uniquely named fake-indexeddb database. */
export function createTestRepository(): DexieRepository {
  return new DexieRepository(new WardrobeDB(`test-${crypto.randomUUID()}`));
}

export function testPhoto(bytes: number[] = [1, 2, 3]): NewPhoto {
  return { data: new Uint8Array(bytes).buffer, mime: 'image/jpeg', width: 400, height: 600 };
}
