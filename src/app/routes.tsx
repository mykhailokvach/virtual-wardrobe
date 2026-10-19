import type { RouteObject } from 'react-router';
import { SectionSheet } from '../features/section/SectionSheet';
import { TracePage } from '../features/trace/TracePage';
import { WardrobeViewPage } from '../features/view/WardrobeViewPage';
import { NewWardrobePage } from '../features/wardrobes/NewWardrobePage';
import { WardrobeListPage } from '../features/wardrobes/WardrobeListPage';
import { AppShell } from './AppShell';
import { NotFound } from './NotFound';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <WardrobeListPage /> },
      { path: 'wardrobes/new', element: <NewWardrobePage /> },
      { path: 'wardrobes/:wardrobeId/edit', element: <TracePage /> },
      {
        path: 'wardrobes/:wardrobeId',
        element: <WardrobeViewPage />,
        children: [{ path: 'sections/:sectionId', element: <SectionSheet /> }],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];
