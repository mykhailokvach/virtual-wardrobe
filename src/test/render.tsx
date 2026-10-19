import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders, createQueryClient } from '../app/providers';
import { routes } from '../app/routes';
import type { WardrobeRepository } from '../data/repository';
import { createTestRepository } from './fixtures';

/** Renders the whole app at `path` against an isolated repository. */
export function renderRoute(path: string, { repository = createTestRepository() }: { repository?: WardrobeRepository } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  render(
    <AppProviders repository={repository} queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { repository, router, user };
}
