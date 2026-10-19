import type { RouteObject } from 'react-router';
import { WardrobeListPage } from '../features/wardrobes/WardrobeListPage';
import { AppShell } from './AppShell';
import { NotFound } from './NotFound';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <WardrobeListPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];
