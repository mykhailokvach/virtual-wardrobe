import type { Item } from '../data/types';

export function sectionLabel(name: string | undefined, index: number): string {
  return name?.trim() || `Section ${index + 1}`;
}

export function itemLabel(item: Pick<Item, 'name' | 'type'>): string {
  return item.name?.trim() || (item.type === 'shoes' ? 'Shoes' : 'Clothes');
}
