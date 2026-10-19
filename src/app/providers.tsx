import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ToastProvider } from '../components/Toast';
import type { WardrobeRepository } from '../data/repository';
import { RepositoryProvider } from '../data/repository-context';

/** Data is local, so queries must run even when the browser reports it is offline. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  });
}

export function AppProviders({
  repository,
  queryClient,
  children,
}: {
  repository: WardrobeRepository;
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repository={repository}>
        <ToastProvider>{children}</ToastProvider>
      </RepositoryProvider>
    </QueryClientProvider>
  );
}
