import { createContext, useContext, type ReactNode } from 'react';
import type { WardrobeRepository } from './repository';

const RepositoryContext = createContext<WardrobeRepository | null>(null);

export function RepositoryProvider({ repository, children }: { repository: WardrobeRepository; children: ReactNode }) {
  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>;
}

export function useRepository(): WardrobeRepository {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error('useRepository must be used inside <RepositoryProvider>');
  return repository;
}
