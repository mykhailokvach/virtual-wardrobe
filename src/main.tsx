import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppProviders, createQueryClient } from './app/providers';
import { routes } from './app/routes';
import { DexieRepository } from './data/dexie-repository';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/sofia-sans/400.css';
import '@fontsource/sofia-sans/500.css';
import '@fontsource/sofia-sans/600.css';
import '@fontsource/sofia-sans-condensed/600.css';
import '@fontsource/sofia-sans-condensed/700.css';
import './index.css';

const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders repository={new DexieRepository()} queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
