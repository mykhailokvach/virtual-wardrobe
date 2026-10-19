import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useRepository } from './repository-context';
import type { ItemPatch, NewItem, NewPhoto, SectionDraft, SectionRemovals } from './types';

export const queryKeys = {
  wardrobes: ['wardrobes'] as const,
  wardrobe: (id: string) => ['wardrobe', id] as const,
  sections: (wardrobeId: string) => ['sections', wardrobeId] as const,
  counts: (wardrobeId: string) => ['counts', wardrobeId] as const,
  items: (sectionId: string) => ['items', sectionId] as const,
  photo: (id: string) => ['photo', id] as const,
};

function invalidateItems(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['items'] }),
    queryClient.invalidateQueries({ queryKey: ['counts'] }),
  ]);
}

export function useWardrobes() {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.wardrobes, queryFn: () => repo.listWardrobes() });
}

export function useWardrobe(id: string) {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.wardrobe(id), queryFn: () => repo.getWardrobe(id) });
}

export function useSections(wardrobeId: string) {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.sections(wardrobeId), queryFn: () => repo.listSections(wardrobeId) });
}

export function useSectionCounts(wardrobeId: string) {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.counts(wardrobeId), queryFn: () => repo.countItems(wardrobeId) });
}

export function useItems(sectionId: string) {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.items(sectionId), queryFn: () => repo.listItems(sectionId) });
}

/** Photos never change once stored, so they are cached forever. */
export function usePhoto(id: string | undefined) {
  const repo = useRepository();
  return useQuery({
    queryKey: queryKeys.photo(id ?? ''),
    queryFn: () => repo.getPhoto(id!),
    enabled: Boolean(id),
    staleTime: Infinity,
  });
}

export function useCreateWardrobe() {
  const repo = useRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, photo }: { name: string; photo: NewPhoto }) => repo.createWardrobe(name, photo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.wardrobes }),
  });
}

export function useRenameWardrobe(id: string) {
  const repo = useRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => repo.renameWardrobe(id, name),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wardrobes }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe(id) }),
      ]),
  });
}

export function useDeleteWardrobe() {
  const repo = useRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteWardrobe(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.wardrobes }),
  });
}

export function useSaveSections(wardrobeId: string) {
  const repo = useRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ drafts, removals }: { drafts: SectionDraft[]; removals: SectionRemovals }) =>
      repo.saveSections(wardrobeId, drafts, removals),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sections(wardrobeId) }),
        invalidateItems(queryClient),
      ]),
  });
}

export function useAddItems() {
  const repo = useRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, items }: { sectionId: string; items: NewItem[] }) => repo.addItems(sectionId, items),
    onSuccess: () => invalidateItems(queryClient),
  });
}

export function useUpdateItem() {
  const repo = useRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ItemPatch }) => repo.updateItem(id, patch),
    onSuccess: () => invalidateItems(queryClient),
  });
}

export function useDeleteItem() {
  const repo = useRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteItem(id),
    onSuccess: () => invalidateItems(queryClient),
  });
}
