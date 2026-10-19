import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <h1 className="p-4 text-xl font-semibold">Virtual Wardrobe</h1>
  </StrictMode>,
);
