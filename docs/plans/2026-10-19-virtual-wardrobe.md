# Virtual Wardrobe Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first React SPA where users photograph a wardrobe, trace its sections over the photo, and add clothes and shoes (by photo) to each section.

**Architecture:** Vite + React + TypeScript SPA. All persistence goes through a `WardrobeRepository` interface; v1 implements it with Dexie (IndexedDB), and the UI reads it only via TanStack Query hooks, so an HTTP backend can replace it later. Section rectangles are stored as 0–1 fractions of the photo and rendered as percent-positioned elements over the image; drawing, moving and resizing use Pointer Events, which cover touch and mouse.

**Tech Stack:** Vite 8, React 19, TypeScript, React Router (`react-router`), TanStack Query 5, Dexie 4, Tailwind CSS 4 (`@tailwindcss/vite`), Vitest + jsdom + Testing Library + fake-indexeddb, Playwright.

**Design doc:** `docs/plans/2026-10-19-virtual-wardrobe-design.md`

---

## Conventions

- Project root: `~/projects/virtual-wardrobe` (git already initialized on `main`). All paths below are relative to it.
- Package manager: `pnpm`. Node 24.
- Tests live next to the code as `*.test.ts(x)`. Run a single file with `pnpm vitest run <path>`.
- Commit after every task. End each commit message with the co-author trailer your harness requires.
- Use relative imports (no path aliases).
- Latest majors at the time of writing were vite 8.3, react 19.3, react-router 8.4, vitest 5.0, dexie 4.4 and tailwind 4.3. The code uses only long-stable APIs (`createBrowserRouter`, `RouterProvider`, `useParams`, `useQuery`, `EntityTable`, and so on). If an install resolves to a newer major and something fails to compile, check that library's migration guide rather than rewriting the design.

---

### Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/index.css`, `src/test/setup.ts`

**Step 1: Create `package.json`**

```json
{
  "name": "virtual-wardrobe",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  }
}
```

**Step 2: Install dependencies**

```bash
pnpm add react react-dom react-router @tanstack/react-query dexie
pnpm add -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node \
  tailwindcss @tailwindcss/vite \
  vitest jsdom fake-indexeddb @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  @playwright/test
```

If pnpm reports "Ignored build scripts", run `pnpm approve-builds` and approve them.

**Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vite/client", "vitest/globals", "node"]
  },
  "include": ["src", "e2e", "vite.config.ts", "playwright.config.ts"]
}
```

**Step 4: Create `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

**Step 5: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// jsdom has no object URLs; components only need a string to put in <img src>.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock';
  URL.revokeObjectURL = () => {};
}
```

**Step 6: Create `index.html`, `src/index.css`, `src/main.tsx` and `.gitignore`**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#fafaf9" />
    <title>Virtual Wardrobe</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/index.css`:
```css
@import "tailwindcss";

html {
  -webkit-tap-highlight-color: transparent;
}
```

`src/main.tsx` (temporary; replaced in Task 9):
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <h1 className="p-4 text-xl font-semibold">Virtual Wardrobe</h1>
  </StrictMode>,
);
```

`.gitignore`:
```
node_modules
dist
test-results
playwright-report
*.local
.DS_Store
```

**Step 7: Verify**

Run: `pnpm build && pnpm vitest run --passWithNoTests`
Expected: the build succeeds and vitest exits 0 with "No test files found".

Run `pnpm dev`, open http://localhost:5173 and check that the styled heading "Virtual Wardrobe" appears. Stop the server.

**Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS project with Tailwind and Vitest"
```

---

### Task 2: Geometry helpers

All section rectangles are fractions (0–1) of the photo. These pure helpers hold the drawing maths.

**Files:**
- Create: `src/lib/geometry.ts`
- Test: `src/lib/geometry.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  clamp,
  isBigEnough,
  moveRect,
  rectFromPoints,
  rectToStyle,
  resizeRect,
  sortSections,
  type Rect,
} from './geometry';

function expectRect(actual: Rect, expected: Rect) {
  for (const key of ['x', 'y', 'w', 'h'] as const) {
    expect(actual[key], key).toBeCloseTo(expected[key]);
  }
}

describe('clamp', () => {
  it('limits a value to a range', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});

describe('rectFromPoints', () => {
  it('normalizes a drag in any direction', () => {
    expectRect(rectFromPoints({ x: 0.6, y: 0.7 }, { x: 0.2, y: 0.1 }), { x: 0.2, y: 0.1, w: 0.4, h: 0.6 });
  });

  it('clamps points to the photo', () => {
    expectRect(rectFromPoints({ x: -0.5, y: 0.5 }, { x: 0.5, y: 1.5 }), { x: 0, y: 0.5, w: 0.5, h: 0.5 });
  });
});

describe('isBigEnough', () => {
  it('rejects rectangles thinner than the minimum size', () => {
    expect(isBigEnough({ x: 0, y: 0, w: 0.02, h: 0.5 })).toBe(false);
    expect(isBigEnough({ x: 0, y: 0, w: 0.5, h: 0.01 })).toBe(false);
  });

  it('accepts rectangles at or above the minimum size', () => {
    expect(isBigEnough({ x: 0, y: 0, w: 0.03, h: 0.03 })).toBe(true);
  });
});

describe('moveRect', () => {
  it('moves by a delta', () => {
    expectRect(moveRect({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, 0.1, 0.2), { x: 0.2, y: 0.3, w: 0.2, h: 0.2 });
  });

  it('keeps the rectangle inside the photo', () => {
    expectRect(moveRect({ x: 0.7, y: 0.1, w: 0.2, h: 0.2 }, 0.3, -0.5), { x: 0.8, y: 0, w: 0.2, h: 0.2 });
  });
});

describe('resizeRect', () => {
  const rect = { x: 0.1, y: 0.1, w: 0.2, h: 0.2 };

  it('resizes from the bottom-right corner', () => {
    expectRect(resizeRect(rect, 'se', { x: 0.5, y: 0.6 }), { x: 0.1, y: 0.1, w: 0.4, h: 0.5 });
  });

  it('resizes from the top-left corner, keeping the opposite corner fixed', () => {
    expectRect(resizeRect(rect, 'nw', { x: 0, y: 0.05 }), { x: 0, y: 0.05, w: 0.3, h: 0.25 });
  });

  it('never shrinks below the minimum size', () => {
    expectRect(resizeRect(rect, 'se', { x: 0.1, y: 0.1 }), { x: 0.1, y: 0.1, w: 0.03, h: 0.03 });
  });

  it('does not flip when dragged past the opposite corner', () => {
    expectRect(resizeRect(rect, 'nw', { x: 0.9, y: 0.9 }), { x: 0.27, y: 0.27, w: 0.03, h: 0.03 });
  });
});

describe('sortSections', () => {
  it('orders top-to-bottom, then left-to-right within a row', () => {
    const a = { id: 'a', rect: { x: 0.1, y: 0.5, w: 0.2, h: 0.2 } };
    const b = { id: 'b', rect: { x: 0.6, y: 0.1, w: 0.2, h: 0.2 } };
    const c = { id: 'c', rect: { x: 0.1, y: 0.11, w: 0.2, h: 0.2 } };
    expect(sortSections([a, b, c]).map((s) => s.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('rectToStyle', () => {
  it('converts fractions to CSS percentages', () => {
    expect(rectToStyle({ x: 0.1, y: 0.25, w: 0.5, h: 0.75 })).toEqual({
      left: '10%',
      top: '25%',
      width: '50%',
      height: '75%',
    });
  });
});
```

**Step 2: Run the tests to check they fail**

Run: `pnpm vitest run src/lib/geometry.test.ts`
Expected: FAIL, because `./geometry` cannot be resolved.

**Step 3: Implement `src/lib/geometry.ts`**

```ts
export interface Point {
  x: number;
  y: number;
}

/** A rectangle in photo-relative units: every value is a fraction (0–1) of the photo size. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Corner = 'nw' | 'ne' | 'sw' | 'se';

/** Smallest section side, as a fraction of the photo. Smaller drags are treated as taps. */
export const MIN_SIZE = 0.03;

/** Sections whose tops are this close are treated as one row when numbering. */
export const ROW_TOLERANCE = 0.02;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function rectFromPoints(a: Point, b: Point): Rect {
  const x1 = clamp(Math.min(a.x, b.x), 0, 1);
  const y1 = clamp(Math.min(a.y, b.y), 0, 1);
  const x2 = clamp(Math.max(a.x, b.x), 0, 1);
  const y2 = clamp(Math.max(a.y, b.y), 0, 1);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function isBigEnough(rect: Rect, min = MIN_SIZE): boolean {
  return rect.w >= min && rect.h >= min;
}

export function moveRect(rect: Rect, dx: number, dy: number): Rect {
  return {
    ...rect,
    x: clamp(rect.x + dx, 0, 1 - rect.w),
    y: clamp(rect.y + dy, 0, 1 - rect.h),
  };
}

/** Moves one corner to `point`, keeping the opposite corner fixed and the size at least `min`. */
export function resizeRect(rect: Rect, corner: Corner, point: Point, min = MIN_SIZE): Rect {
  const right = corner === 'ne' || corner === 'se';
  const bottom = corner === 'sw' || corner === 'se';
  const fixedX = right ? rect.x : rect.x + rect.w;
  const fixedY = bottom ? rect.y : rect.y + rect.h;
  const x = right ? clamp(point.x, fixedX + min, 1) : clamp(point.x, 0, fixedX - min);
  const y = bottom ? clamp(point.y, fixedY + min, 1) : clamp(point.y, 0, fixedY - min);
  return rectFromPoints({ x: fixedX, y: fixedY }, { x, y });
}

/** Orders sections top-to-bottom, then left-to-right within a row. */
export function sortSections<T extends { rect: Rect }>(sections: readonly T[]): T[] {
  const byTop = [...sections].sort((a, b) => a.rect.y - b.rect.y);
  const rows: T[][] = [];
  for (const section of byTop) {
    const row = rows.at(-1);
    if (row && section.rect.y - row[0].rect.y <= ROW_TOLERANCE) row.push(section);
    else rows.push([section]);
  }
  return rows.flatMap((row) => row.sort((a, b) => a.rect.x - b.rect.x));
}

export function rectToStyle(rect: Rect): { left: string; top: string; width: string; height: string } {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
  };
}
```

**Step 4: Run the tests to check they pass**

Run: `pnpm vitest run src/lib/geometry.test.ts`
Expected: PASS (13 tests).

**Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: add geometry helpers for section rectangles"
```

---

### Task 3: Domain types and repository interface

There is no runtime behaviour here, so it is verified by the typecheck.

**Files:**
- Create: `src/data/types.ts`, `src/data/repository.ts`

**Step 1: Create `src/data/types.ts`**

```ts
import type { Rect } from '../lib/geometry';

export type ItemType = 'clothes' | 'shoes';

export interface Wardrobe {
  id: string;
  name: string;
  photoId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Section {
  id: string;
  wardrobeId: string;
  name?: string;
  /** Fractions (0–1) of the wardrobe photo. */
  rect: Rect;
  /** 0-based position: top-to-bottom, then left-to-right. */
  order: number;
}

export interface Item {
  id: string;
  wardrobeId: string;
  sectionId: string;
  type: ItemType;
  name?: string;
  photoId: string;
  createdAt: number;
}

/** Image bytes are stored as an ArrayBuffer (not a Blob) to avoid Safari's IndexedDB blob bugs. */
export interface Photo {
  id: string;
  data: ArrayBuffer;
  mime: string;
  width: number;
  height: number;
}

export type NewPhoto = Omit<Photo, 'id'>;

/** A section as edited in trace mode; the order is derived when saving. */
export interface SectionDraft {
  id: string;
  name?: string;
  rect: Rect;
}

/** For each removed section that has items: the section id to move them to, or null to delete them. */
export type SectionRemovals = Record<string, string | null>;

export interface NewItem {
  type: ItemType;
  name?: string;
  photo: NewPhoto;
}

export type ItemPatch = Partial<Pick<Item, 'name' | 'type' | 'sectionId'>>;

/** Item counts per section id. */
export type SectionCounts = Record<string, Record<ItemType, number>>;
```

**Step 2: Create `src/data/repository.ts`**

```ts
import type {
  Item,
  ItemPatch,
  NewItem,
  NewPhoto,
  Photo,
  Section,
  SectionCounts,
  SectionDraft,
  SectionRemovals,
  Wardrobe,
} from './types';

/**
 * The only way the app touches persistent data. v1 uses IndexedDB (DexieRepository);
 * a future HttpRepository must pass the same contract tests (dexie-repository.test.ts).
 * Lookups return null (not undefined) because TanStack Query rejects undefined data.
 */
export interface WardrobeRepository {
  /** Newest first. */
  listWardrobes(): Promise<Wardrobe[]>;
  getWardrobe(id: string): Promise<Wardrobe | null>;
  createWardrobe(name: string, photo: NewPhoto): Promise<Wardrobe>;
  /** Also deletes its sections, items and every photo. */
  deleteWardrobe(id: string): Promise<void>;

  /** Sorted by `order`. */
  listSections(wardrobeId: string): Promise<Section[]>;
  /**
   * Replaces the wardrobe's sections with `drafts` atomically. Sections missing from `drafts`
   * are removed; if one has items, `removals[id]` decides what happens to them, and a missing
   * decision is an error.
   */
  saveSections(wardrobeId: string, drafts: SectionDraft[], removals: SectionRemovals): Promise<Section[]>;

  countItems(wardrobeId: string): Promise<SectionCounts>;
  /** Newest first. */
  listItems(sectionId: string): Promise<Item[]>;
  addItems(sectionId: string, items: NewItem[]): Promise<Item[]>;
  updateItem(id: string, patch: ItemPatch): Promise<void>;
  deleteItem(id: string): Promise<void>;

  getPhoto(id: string): Promise<Photo | null>;
}
```

**Step 3: Verify**

Run: `pnpm typecheck`
Expected: no errors.

**Step 4: Commit**

```bash
git add src/data
git commit -m "feat: define domain types and WardrobeRepository interface"
```

---

### Task 4: Image utilities

**Files:**
- Create: `src/lib/image.ts`
- Test: `src/lib/image.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { fitWithin } from './image';

describe('fitWithin', () => {
  it('scales a landscape image down to the max edge', () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
  });

  it('scales a portrait image down to the max edge', () => {
    expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });

  it('never upscales', () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });

  it('keeps at least one pixel on each side', () => {
    expect(fitWithin(4000, 1, 800)).toEqual({ width: 800, height: 1 });
  });
});
```

**Step 2: Run the tests to check they fail**

Run: `pnpm vitest run src/lib/image.test.ts`
Expected: FAIL, because the module is not found.

**Step 3: Implement `src/lib/image.ts`**

`compressImage` relies on browser canvas APIs that jsdom lacks. It is covered by the Playwright test in Task 17, and component tests mock it.

```ts
import type { NewPhoto } from '../data/types';

export const WARDROBE_MAX_EDGE = 2000;
export const ITEM_MAX_EDGE = 800;
const JPEG_QUALITY = 0.8;

export class ImageDecodeError extends Error {
  constructor() {
    super("Couldn't read that image. Try a JPG or PNG.");
    this.name = 'ImageDecodeError';
  }
}

export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Decodes any browser-readable image, honours EXIF rotation, and re-encodes it as a JPEG. */
export async function compressImage(file: Blob, maxEdge: number): Promise<NewPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageDecodeError();
  }

  const size = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new ImageDecodeError();
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new ImageDecodeError();

  return { data: await blob.arrayBuffer(), mime: 'image/jpeg', width: size.width, height: size.height };
}
```

**Step 4: Run the tests to check they pass**

Run: `pnpm vitest run src/lib/image.test.ts && pnpm typecheck`
Expected: PASS (4 tests), with no type errors.

**Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: add client-side image resize and compression"
```

---

### Task 5: Labels and user-facing error messages

**Files:**
- Create: `src/lib/labels.ts`, `src/lib/errors.ts`
- Test: `src/lib/labels.test.ts`, `src/lib/errors.test.ts`

**Step 1: Write the failing tests**

`src/lib/labels.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { itemLabel, sectionLabel } from './labels';

describe('sectionLabel', () => {
  it('uses the name when set', () => {
    expect(sectionLabel(' Top shelf ', 0)).toBe('Top shelf');
  });

  it('falls back to a 1-based number', () => {
    expect(sectionLabel(undefined, 0)).toBe('Section 1');
    expect(sectionLabel('   ', 2)).toBe('Section 3');
  });
});

describe('itemLabel', () => {
  it('uses the name, or the type when unnamed', () => {
    expect(itemLabel({ name: 'Sneakers', type: 'shoes' })).toBe('Sneakers');
    expect(itemLabel({ type: 'shoes' })).toBe('Shoes');
    expect(itemLabel({ name: '', type: 'clothes' })).toBe('Clothes');
  });
});
```

`src/lib/errors.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { errorMessage } from './errors';
import { ImageDecodeError } from './image';

describe('errorMessage', () => {
  it('passes image decode errors through', () => {
    expect(errorMessage(new ImageDecodeError())).toMatch(/couldn't read that image/i);
  });

  it('explains a full storage quota', () => {
    const error = new Error('quota');
    error.name = 'QuotaExceededError';
    expect(errorMessage(error)).toMatch(/storage is full/i);
  });

  it('detects quota errors wrapped by Dexie', () => {
    const error = Object.assign(new Error('abort'), { name: 'AbortError', inner: { name: 'QuotaExceededError' } });
    expect(errorMessage(error)).toMatch(/storage is full/i);
  });

  it('falls back to a generic message', () => {
    expect(errorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
    expect(errorMessage('nope')).toBe('Something went wrong. Please try again.');
  });
});
```

**Step 2: Run the tests to check they fail**

Run: `pnpm vitest run src/lib/labels.test.ts src/lib/errors.test.ts`
Expected: FAIL, because the modules are not found.

**Step 3: Implement**

`src/lib/labels.ts`:
```ts
import type { Item } from '../data/types';

export function sectionLabel(name: string | undefined, index: number): string {
  return name?.trim() || `Section ${index + 1}`;
}

export function itemLabel(item: Pick<Item, 'name' | 'type'>): string {
  return item.name?.trim() || (item.type === 'shoes' ? 'Shoes' : 'Clothes');
}
```

`src/lib/errors.ts`:
```ts
import { ImageDecodeError } from './image';

function hasName(value: unknown, name: string): boolean {
  return typeof value === 'object' && value !== null && (value as { name?: unknown }).name === name;
}

function isQuotaError(error: unknown): boolean {
  if (hasName(error, 'QuotaExceededError')) return true;
  // Dexie wraps the underlying DOMException in `inner`.
  return typeof error === 'object' && error !== null && hasName((error as { inner?: unknown }).inner, 'QuotaExceededError');
}

export function errorMessage(error: unknown): string {
  if (error instanceof ImageDecodeError) return error.message;
  if (isQuotaError(error)) return 'Storage is full. Delete some items or wardrobes and try again.';
  return 'Something went wrong. Please try again.';
}
```

**Step 4: Run the tests to check they pass**

Run: `pnpm vitest run src/lib`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: add section/item labels and user-facing error messages"
```

---

### Task 6: Dexie repository

These tests are the repository contract. They run in the `node` environment, where `fake-indexeddb` stores `ArrayBuffer`s natively.

**Files:**
- Create: `src/data/db.ts`, `src/data/dexie-repository.ts`, `src/test/fixtures.ts`
- Test: `src/data/dexie-repository.test.ts`

**Step 1: Create `src/data/db.ts` and the test fixtures**

`src/data/db.ts`:
```ts
import Dexie, { type EntityTable } from 'dexie';
import type { Item, Photo, Section, Wardrobe } from './types';

export class WardrobeDB extends Dexie {
  wardrobes!: EntityTable<Wardrobe, 'id'>;
  sections!: EntityTable<Section, 'id'>;
  items!: EntityTable<Item, 'id'>;
  photos!: EntityTable<Photo, 'id'>;

  constructor(name = 'virtual-wardrobe') {
    super(name);
    this.version(1).stores({
      wardrobes: 'id, createdAt',
      sections: 'id, wardrobeId',
      items: 'id, sectionId, wardrobeId, createdAt',
      photos: 'id',
    });
  }
}
```

`src/test/fixtures.ts`:
```ts
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
```

**Step 2: Write the failing tests in `src/data/dexie-repository.test.ts`**

```ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestRepository, testPhoto } from '../test/fixtures';
import type { DexieRepository } from './dexie-repository';

const rect = (x: number, y: number) => ({ x, y, w: 0.2, h: 0.2 });

let repo: DexieRepository;

beforeEach(() => {
  repo = createTestRepository();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function wardrobeWithSections() {
  const wardrobe = await repo.createWardrobe('Closet', testPhoto());
  const sections = await repo.saveSections(
    wardrobe.id,
    [
      { id: 'bottom', rect: rect(0.1, 0.7) },
      { id: 'top', name: 'Top shelf', rect: rect(0.1, 0.1) },
    ],
    {},
  );
  return { wardrobe, sections };
}

describe('wardrobes', () => {
  it('creates a wardrobe with its photo', async () => {
    const wardrobe = await repo.createWardrobe('Closet', testPhoto([9, 8, 7]));

    expect(await repo.getWardrobe(wardrobe.id)).toEqual(wardrobe);
    const photo = await repo.getPhoto(wardrobe.photoId);
    expect(new Uint8Array(photo!.data)).toEqual(new Uint8Array([9, 8, 7]));
    expect(photo).toMatchObject({ mime: 'image/jpeg', width: 400, height: 600 });
  });

  it('returns null for unknown ids', async () => {
    expect(await repo.getWardrobe('missing')).toBeNull();
    expect(await repo.getPhoto('missing')).toBeNull();
  });

  it('lists wardrobes newest first', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000);
    await repo.createWardrobe('Old', testPhoto());
    await repo.createWardrobe('New', testPhoto());

    expect((await repo.listWardrobes()).map((w) => w.name)).toEqual(['New', 'Old']);
  });

  it('deletes a wardrobe with its sections, items and photos', async () => {
    const { wardrobe, sections } = await wardrobeWithSections();
    const [item] = await repo.addItems(sections[0].id, [{ type: 'shoes', photo: testPhoto() }]);

    await repo.deleteWardrobe(wardrobe.id);

    expect(await repo.getWardrobe(wardrobe.id)).toBeNull();
    expect(await repo.listSections(wardrobe.id)).toEqual([]);
    expect(await repo.listItems(sections[0].id)).toEqual([]);
    expect(await repo.getPhoto(wardrobe.photoId)).toBeNull();
    expect(await repo.getPhoto(item.photoId)).toBeNull();
  });
});

describe('sections', () => {
  it('saves sections ordered top-to-bottom', async () => {
    const { wardrobe, sections } = await wardrobeWithSections();

    expect(sections.map((s) => [s.id, s.order])).toEqual([
      ['top', 0],
      ['bottom', 1],
    ]);
    expect(await repo.listSections(wardrobe.id)).toEqual(sections);
  });

  it('trims names and drops empty ones', async () => {
    const wardrobe = await repo.createWardrobe('Closet', testPhoto());
    const [a, b] = await repo.saveSections(
      wardrobe.id,
      [
        { id: 'a', name: '  Socks ', rect: rect(0.1, 0.1) },
        { id: 'b', name: '   ', rect: rect(0.1, 0.5) },
      ],
      {},
    );
    expect(a.name).toBe('Socks');
    expect(b.name).toBeUndefined();
  });

  it('deletes the items of a removed section when told to', async () => {
    const { wardrobe } = await wardrobeWithSections();
    const [item] = await repo.addItems('bottom', [{ type: 'clothes', photo: testPhoto() }]);

    await repo.saveSections(wardrobe.id, [{ id: 'top', rect: rect(0.1, 0.1) }], { bottom: null });

    expect((await repo.listSections(wardrobe.id)).map((s) => s.id)).toEqual(['top']);
    expect(await repo.listItems('bottom')).toEqual([]);
    expect(await repo.getPhoto(item.photoId)).toBeNull();
  });

  it('moves the items of a removed section when told to', async () => {
    const { wardrobe } = await wardrobeWithSections();
    const [item] = await repo.addItems('bottom', [{ type: 'clothes', photo: testPhoto() }]);

    await repo.saveSections(wardrobe.id, [{ id: 'top', rect: rect(0.1, 0.1) }], { bottom: 'top' });

    expect((await repo.listItems('top')).map((i) => i.id)).toEqual([item.id]);
  });

  it('refuses to drop items without a decision and changes nothing', async () => {
    const { wardrobe, sections } = await wardrobeWithSections();
    await repo.addItems('bottom', [{ type: 'clothes', photo: testPhoto() }]);

    await expect(repo.saveSections(wardrobe.id, [{ id: 'top', rect: rect(0.1, 0.1) }], {})).rejects.toThrow(
      /no decision/i,
    );

    expect(await repo.listSections(wardrobe.id)).toEqual(sections);
    expect(await repo.listItems('bottom')).toHaveLength(1);
  });

  it('removes empty sections without a decision', async () => {
    const { wardrobe } = await wardrobeWithSections();
    await repo.saveSections(wardrobe.id, [{ id: 'top', rect: rect(0.1, 0.1) }], {});
    expect((await repo.listSections(wardrobe.id)).map((s) => s.id)).toEqual(['top']);
  });
});

describe('items', () => {
  it('adds items newest first and counts them per section', async () => {
    const { wardrobe } = await wardrobeWithSections();
    await repo.addItems('top', [
      { type: 'clothes', name: ' Shirt ', photo: testPhoto() },
      { type: 'shoes', photo: testPhoto() },
    ]);
    await repo.addItems('bottom', [{ type: 'shoes', photo: testPhoto() }]);

    const items = await repo.listItems('top');
    expect(items.map((i) => [i.type, i.name])).toEqual([
      ['shoes', undefined],
      ['clothes', 'Shirt'],
    ]);
    expect(items[0].wardrobeId).toBe(wardrobe.id);
    expect(await repo.countItems(wardrobe.id)).toEqual({
      top: { clothes: 1, shoes: 1 },
      bottom: { clothes: 0, shoes: 1 },
    });
  });

  it('rejects items for an unknown section', async () => {
    await expect(repo.addItems('missing', [{ type: 'shoes', photo: testPhoto() }])).rejects.toThrow(/not found/i);
  });

  it('renames, retypes and moves an item', async () => {
    await wardrobeWithSections();
    const [item] = await repo.addItems('top', [{ type: 'clothes', name: 'Shirt', photo: testPhoto() }]);

    await repo.updateItem(item.id, { name: 'Boots', type: 'shoes', sectionId: 'bottom' });

    expect(await repo.listItems('top')).toEqual([]);
    expect(await repo.listItems('bottom')).toMatchObject([{ id: item.id, name: 'Boots', type: 'shoes' }]);
  });

  it('clears the name when renamed to blank', async () => {
    await wardrobeWithSections();
    const [item] = await repo.addItems('top', [{ type: 'clothes', name: 'Shirt', photo: testPhoto() }]);

    await repo.updateItem(item.id, { name: '  ' });

    expect((await repo.listItems('top'))[0].name).toBeUndefined();
  });

  it("refuses to move an item into another wardrobe's section", async () => {
    await wardrobeWithSections();
    const [item] = await repo.addItems('top', [{ type: 'clothes', photo: testPhoto() }]);
    const other = await repo.createWardrobe('Other', testPhoto());
    await repo.saveSections(other.id, [{ id: 'elsewhere', rect: rect(0, 0) }], {});

    await expect(repo.updateItem(item.id, { sectionId: 'elsewhere' })).rejects.toThrow(/not found/i);
  });

  it('deletes an item and its photo', async () => {
    await wardrobeWithSections();
    const [item] = await repo.addItems('top', [{ type: 'clothes', photo: testPhoto() }]);

    await repo.deleteItem(item.id);

    expect(await repo.listItems('top')).toEqual([]);
    expect(await repo.getPhoto(item.photoId)).toBeNull();
  });
});
```

**Step 3: Run the tests to check they fail**

Run: `pnpm vitest run src/data/dexie-repository.test.ts`
Expected: FAIL, because `../data/dexie-repository` is not found.

**Step 4: Implement `src/data/dexie-repository.ts`**

```ts
import { sortSections } from '../lib/geometry';
import { WardrobeDB } from './db';
import type { WardrobeRepository } from './repository';
import type {
  Item,
  ItemPatch,
  NewItem,
  NewPhoto,
  Photo,
  Section,
  SectionCounts,
  SectionDraft,
  SectionRemovals,
  Wardrobe,
} from './types';

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

const cleanName = (name: string | undefined) => name?.trim() || undefined;

export class DexieRepository implements WardrobeRepository {
  constructor(private readonly db = new WardrobeDB()) {}

  async listWardrobes(): Promise<Wardrobe[]> {
    return this.db.wardrobes.orderBy('createdAt').reverse().toArray();
  }

  async getWardrobe(id: string): Promise<Wardrobe | null> {
    return (await this.db.wardrobes.get(id)) ?? null;
  }

  async createWardrobe(name: string, photo: NewPhoto): Promise<Wardrobe> {
    const now = Date.now();
    const wardrobe: Wardrobe = {
      id: crypto.randomUUID(),
      name: name.trim(),
      photoId: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await this.db.transaction('rw', this.db.wardrobes, this.db.photos, async () => {
      await this.db.photos.add({ id: wardrobe.photoId, ...photo });
      await this.db.wardrobes.add(wardrobe);
    });
    return wardrobe;
  }

  async deleteWardrobe(id: string): Promise<void> {
    const { wardrobes, sections, items, photos } = this.db;
    await this.db.transaction('rw', [wardrobes, sections, items, photos], async () => {
      const wardrobe = await wardrobes.get(id);
      if (!wardrobe) return;
      const wardrobeItems = await items.where('wardrobeId').equals(id).toArray();
      await photos.bulkDelete([wardrobe.photoId, ...wardrobeItems.map((i) => i.photoId)]);
      await items.bulkDelete(wardrobeItems.map((i) => i.id));
      await sections.where('wardrobeId').equals(id).delete();
      await wardrobes.delete(id);
    });
  }

  async listSections(wardrobeId: string): Promise<Section[]> {
    return this.db.sections.where('wardrobeId').equals(wardrobeId).sortBy('order');
  }

  async saveSections(wardrobeId: string, drafts: SectionDraft[], removals: SectionRemovals): Promise<Section[]> {
    const next: Section[] = sortSections(drafts).map((draft, order) => ({
      id: draft.id,
      wardrobeId,
      name: cleanName(draft.name),
      rect: draft.rect,
      order,
    }));
    const keptIds = new Set(next.map((s) => s.id));
    const { wardrobes, sections, items, photos } = this.db;

    await this.db.transaction('rw', [wardrobes, sections, items, photos], async () => {
      if (!(await wardrobes.get(wardrobeId))) throw new NotFoundError(`Wardrobe ${wardrobeId} not found`);

      const removed = (await sections.where('wardrobeId').equals(wardrobeId).toArray()).filter(
        (s) => !keptIds.has(s.id),
      );
      for (const section of removed) {
        const sectionItems = await items.where('sectionId').equals(section.id).toArray();
        if (sectionItems.length === 0) continue;

        const target = removals[section.id];
        if (target === undefined) throw new Error(`No decision for the items in section ${section.id}`);
        if (target === null) {
          await photos.bulkDelete(sectionItems.map((i) => i.photoId));
          await items.bulkDelete(sectionItems.map((i) => i.id));
        } else {
          if (!keptIds.has(target)) throw new NotFoundError(`Target section ${target} not found`);
          await items.where('sectionId').equals(section.id).modify({ sectionId: target });
        }
      }

      await sections.bulkDelete(removed.map((s) => s.id));
      await sections.bulkPut(next);
      await wardrobes.update(wardrobeId, { updatedAt: Date.now() });
    });

    return next;
  }

  async countItems(wardrobeId: string): Promise<SectionCounts> {
    const counts: SectionCounts = {};
    await this.db.items
      .where('wardrobeId')
      .equals(wardrobeId)
      .each((item) => {
        counts[item.sectionId] ??= { clothes: 0, shoes: 0 };
        counts[item.sectionId][item.type] += 1;
      });
    return counts;
  }

  async listItems(sectionId: string): Promise<Item[]> {
    const items = await this.db.items.where('sectionId').equals(sectionId).sortBy('createdAt');
    return items.reverse();
  }

  async addItems(sectionId: string, newItems: NewItem[]): Promise<Item[]> {
    const { sections, items, photos } = this.db;
    return this.db.transaction('rw', [sections, items, photos], async () => {
      const section = await sections.get(sectionId);
      if (!section) throw new NotFoundError(`Section ${sectionId} not found`);

      const now = Date.now();
      const created: Item[] = newItems.map((input, index) => ({
        id: crypto.randomUUID(),
        wardrobeId: section.wardrobeId,
        sectionId,
        type: input.type,
        name: cleanName(input.name),
        photoId: crypto.randomUUID(),
        // Distinct timestamps keep "newest first" stable for batch uploads.
        createdAt: now + index,
      }));
      await photos.bulkAdd(newItems.map((input, index) => ({ id: created[index].photoId, ...input.photo })));
      await items.bulkAdd(created);
      return created;
    });
  }

  async updateItem(id: string, patch: ItemPatch): Promise<void> {
    const { sections, items } = this.db;
    await this.db.transaction('rw', [sections, items], async () => {
      const item = await items.get(id);
      if (!item) throw new NotFoundError(`Item ${id} not found`);
      if (patch.sectionId && patch.sectionId !== item.sectionId) {
        const target = await sections.get(patch.sectionId);
        if (!target || target.wardrobeId !== item.wardrobeId) {
          throw new NotFoundError(`Section ${patch.sectionId} not found`);
        }
      }
      const changes: ItemPatch = { ...patch };
      if ('name' in patch) changes.name = cleanName(patch.name);
      await items.update(id, changes);
    });
  }

  async deleteItem(id: string): Promise<void> {
    const { items, photos } = this.db;
    await this.db.transaction('rw', [items, photos], async () => {
      const item = await items.get(id);
      if (!item) return;
      await photos.delete(item.photoId);
      await items.delete(id);
    });
  }

  async getPhoto(id: string): Promise<Photo | null> {
    return (await this.db.photos.get(id)) ?? null;
  }
}
```

Note: Dexie's `update` removes a property whose new value is `undefined`. That is how a blank rename clears the name.

**Step 5: Run the tests to check they pass**

Run: `pnpm vitest run src/data && pnpm typecheck`
Expected: PASS (16 tests), with no type errors.

**Step 6: Commit**

```bash
git add src/data src/test
git commit -m "feat: implement IndexedDB repository with Dexie"
```

---

### Task 7: React data layer (context, query client, hooks, photo URLs)

**Files:**
- Create: `src/data/repository-context.tsx`, `src/data/hooks.ts`, `src/data/photo-url.ts`

**Step 1: Create `src/data/repository-context.tsx`**

```tsx
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
```

**Step 2: Create `src/data/hooks.ts`**

```ts
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
```

**Step 3: Create `src/data/photo-url.ts`**

```ts
import { useEffect, useState } from 'react';
import { usePhoto } from './hooks';
import type { Photo } from './types';

/** Creates an object URL for the photo bytes and revokes it on change or unmount. */
export function useObjectUrl(photo: Pick<Photo, 'data' | 'mime'> | null | undefined): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!photo) return;
    const objectUrl = URL.createObjectURL(new Blob([photo.data], { type: photo.mime }));
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      setUrl(undefined);
    };
  }, [photo]);

  return url;
}

export function usePhotoUrl(photoId: string | undefined): string | undefined {
  return useObjectUrl(usePhoto(photoId).data);
}
```

**Step 4: Verify**

Run: `pnpm typecheck`
Expected: no errors. These hooks are exercised by the component tests from Task 9 onwards.

**Step 5: Commit**

```bash
git add src/data
git commit -m "feat: add repository context, query hooks and photo URL hooks"
```

---

### Task 8: UI primitives

**Files:**
- Create: `src/components/Button.tsx`, `src/components/Dialog.tsx`, `src/components/ConfirmDialog.tsx`, `src/components/Sheet.tsx`, `src/components/ImagePickerButton.tsx`, `src/components/Toast.tsx`, `src/components/PhotoImg.tsx`, `src/components/PhotoStage.tsx`

**Step 1: `src/components/Button.tsx`**

```tsx
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-stone-900 text-white hover:bg-stone-700',
  secondary: 'bg-white text-stone-900 ring-1 ring-stone-300 hover:bg-stone-100',
  danger: 'bg-red-600 text-white hover:bg-red-500',
  ghost: 'text-stone-700 hover:bg-stone-100',
};

/** Shared so links can look like buttons. min-h-11 keeps a 44px touch target. */
export function buttonClass(variant: Variant = 'primary', extra = ''): string {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:opacity-50 ${variants[variant]} ${extra}`;
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
```

**Step 2: `src/components/Dialog.tsx` and `src/components/ConfirmDialog.tsx`**

```tsx
// Dialog.tsx
import { useEffect, type ReactNode } from 'react';

/** Centered modal. Listens for Escape in the capture phase so it closes before any Sheet beneath it. */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 className="mb-3 text-lg font-semibold">{title}</h2>
        {children}
      </section>
    </div>
  );
}
```

```tsx
// ConfirmDialog.tsx
import { Button } from './Button';
import { Dialog } from './Dialog';

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <p className="text-sm text-stone-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
```

**Step 3: `src/components/Sheet.tsx`**

```tsx
import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';

/** Bottom sheet on phones, right-hand panel from the `md` breakpoint. */
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl bg-white shadow-xl md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[420px] md:rounded-none"
      >
        <header className="flex items-center justify-between gap-2 border-b border-stone-200 py-2 pr-2 pl-4">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <footer className="border-t border-stone-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</footer>
        )}
      </section>
    </div>
  );
}
```

**Step 4: `src/components/ImagePickerButton.tsx`**

```tsx
import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

/** A button that opens the image picker. On phones, `accept="image/*"` offers both camera and gallery. */
export function ImagePickerButton({
  onPick,
  multiple = false,
  className,
  children,
  ...buttonProps
}: {
  onPick: (files: File[]) => void;
  multiple?: boolean;
  className?: string;
  children: ReactNode;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'disabled'>) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
        {...buttonProps}
      >
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = ''; // allow picking the same file again
          if (files.length > 0) onPick(files);
        }}
      />
    </>
  );
}
```

**Step 5: `src/components/Toast.tsx`**

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);

  const show = useCallback<ShowToast>((message) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div key={toast.id} role="status" className="rounded-xl bg-stone-900 px-4 py-2 text-sm text-white shadow-lg">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
```

**Step 6: `src/components/PhotoImg.tsx` and `src/components/PhotoStage.tsx`**

```tsx
// PhotoImg.tsx
import { usePhotoUrl } from '../data/photo-url';

export function PhotoImg({ photoId, alt, className = '' }: { photoId: string; alt: string; className?: string }) {
  const url = usePhotoUrl(photoId);
  if (!url) return <div aria-hidden="true" className={`animate-pulse bg-stone-200 ${className}`} />;
  return <img src={url} alt={alt} className={className} />;
}
```

```tsx
// PhotoStage.tsx
import type { ComponentProps } from 'react';
import { usePhotoUrl } from '../data/photo-url';

/**
 * Shows the wardrobe photo at its exact aspect ratio, fitted to both the width and
 * (viewport height − reservedHeight), so children can be positioned in percentages.
 */
export function PhotoStage({
  photoId,
  width,
  height,
  alt,
  reservedHeight = 160,
  className = '',
  children,
  ...divProps
}: {
  photoId: string;
  width: number;
  height: number;
  alt: string;
  reservedHeight?: number;
} & ComponentProps<'div'>) {
  const url = usePhotoUrl(photoId);
  return (
    <div
      className={`relative mx-auto ${className}`}
      style={{
        aspectRatio: `${width} / ${height}`,
        width: `min(100%, calc((100dvh - ${reservedHeight}px) * ${width / height}))`,
      }}
      {...divProps}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          draggable={false}
          className="absolute inset-0 h-full w-full rounded-lg object-cover select-none"
        />
      ) : (
        <div className="absolute inset-0 animate-pulse rounded-lg bg-stone-200" />
      )}
      {children}
    </div>
  );
}
```

React 19 passes `ref` as a normal prop, so `<PhotoStage ref={…}>` works without `forwardRef`.

**Step 7: Verify**

Run: `pnpm typecheck`
Expected: no errors.

**Step 8: Commit**

```bash
git add src/components
git commit -m "feat: add UI primitives (button, dialog, sheet, picker, toast, photo stage)"
```

---

### Task 9: App shell, routing and wardrobe list

**Files:**
- Create: `src/app/providers.tsx`, `src/app/routes.tsx`, `src/app/AppShell.tsx`, `src/app/NotFound.tsx`, `src/app/StorageBanner.tsx`, `src/data/storage.ts`, `src/features/wardrobes/WardrobeListPage.tsx`, `src/test/render.tsx`
- Modify: `src/main.tsx` (full replacement)
- Test: `src/app/routes.test.tsx`

**Step 1: Create the test helper `src/test/render.tsx`**

```tsx
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
```

**Step 2: Write the failing tests in `src/app/routes.test.tsx`**

```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTestRepository, testPhoto } from '../test/fixtures';
import { renderRoute } from '../test/render';

describe('wardrobe list', () => {
  it('shows an empty state when there are no wardrobes', async () => {
    renderRoute('/');
    expect(await screen.findByText('No wardrobes yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New wardrobe' })).toHaveAttribute('href', '/wardrobes/new');
  });

  it('lists saved wardrobes', async () => {
    const repository = createTestRepository();
    const wardrobe = await repository.createWardrobe('Bedroom closet', testPhoto());

    renderRoute('/', { repository });

    const link = await screen.findByRole('link', { name: /bedroom closet/i });
    expect(link).toHaveAttribute('href', `/wardrobes/${wardrobe.id}`);
  });
});

describe('not found', () => {
  it('shows a not-found page for unknown paths', async () => {
    renderRoute('/nope');
    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument();
  });
});
```

**Step 3: Run the tests to check they fail**

Run: `pnpm vitest run src/app`
Expected: FAIL, because `../app/providers` is not found.

**Step 4: Implement**

`src/app/providers.tsx`:
```tsx
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
```

`src/data/storage.ts`:
```ts
/** Returns false when IndexedDB is unusable (e.g. some private-browsing modes). */
export async function probeStorage(): Promise<boolean> {
  try {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('virtual-wardrobe-probe');
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return false;
  }
  // Ask the browser not to evict our data under storage pressure (best effort).
  navigator.storage?.persist?.().catch(() => {});
  return true;
}
```

`src/app/StorageBanner.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { probeStorage } from '../data/storage';

export function StorageBanner() {
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let active = true;
    probeStorage().then((ok) => {
      if (active) setAvailable(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  if (available) return null;
  return (
    <p role="alert" className="bg-amber-100 px-4 py-2 text-sm text-amber-900">
      Your browser is blocking storage, so wardrobes won't be saved. Try leaving private browsing mode.
    </p>
  );
}
```

`src/app/NotFound.tsx`:
```tsx
import { Link } from 'react-router';
import { buttonClass } from '../components/Button';

export function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-2 text-stone-600">We couldn't find that {what}.</p>
      <Link to="/" className={buttonClass('secondary', 'mt-6')}>
        Back to wardrobes
      </Link>
    </div>
  );
}
```

`src/app/AppShell.tsx`:
```tsx
import { Link, Outlet } from 'react-router';
import { StorageBanner } from './StorageBanner';

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900 antialiased">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <Link to="/" className="font-semibold">
          👗 Virtual Wardrobe
        </Link>
      </header>
      <StorageBanner />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
```

`src/features/wardrobes/WardrobeListPage.tsx`:
```tsx
import { Link } from 'react-router';
import { buttonClass } from '../../components/Button';
import { PhotoImg } from '../../components/PhotoImg';
import { useWardrobes } from '../../data/hooks';

export function WardrobeListPage() {
  const { data: wardrobes } = useWardrobes();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Your wardrobes</h1>
        <Link to="/wardrobes/new" className={buttonClass()}>
          New wardrobe
        </Link>
      </div>

      {wardrobes?.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 p-8 text-center text-stone-600">
          <p>No wardrobes yet.</p>
          <p className="mt-1 text-sm">Take a photo of your wardrobe to get started.</p>
        </div>
      )}

      {wardrobes && wardrobes.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {wardrobes.map((wardrobe) => (
            <li key={wardrobe.id}>
              <Link
                to={`/wardrobes/${wardrobe.id}`}
                className="block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200"
              >
                <PhotoImg photoId={wardrobe.photoId} alt="" className="aspect-[3/4] w-full object-cover" />
                <span className="block truncate p-3 text-sm font-medium">{wardrobe.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`src/app/routes.tsx`:
```tsx
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
```

`src/main.tsx` (replace the whole file):
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppProviders, createQueryClient } from './app/providers';
import { routes } from './app/routes';
import { DexieRepository } from './data/dexie-repository';
import './index.css';

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders repository={new DexieRepository()} queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
```

**Step 5: Run the tests to check they pass**

Run: `pnpm test && pnpm typecheck`
Expected: all tests pass, with no type errors.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add app shell, routing and wardrobe list"
```

---

### Task 10: New wardrobe page

**Files:**
- Create: `src/features/wardrobes/NewWardrobePage.tsx`
- Modify: `src/app/routes.tsx` (add a route)

**Step 1: Implement `src/features/wardrobes/NewWardrobePage.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, buttonClass } from '../../components/Button';
import { ImagePickerButton } from '../../components/ImagePickerButton';
import { useToast } from '../../components/Toast';
import { useCreateWardrobe } from '../../data/hooks';
import { useObjectUrl } from '../../data/photo-url';
import type { NewPhoto } from '../../data/types';
import { errorMessage } from '../../lib/errors';
import { compressImage, WARDROBE_MAX_EDGE } from '../../lib/image';

const DEFAULT_NAME = 'My wardrobe';

export function NewWardrobePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const createWardrobe = useCreateWardrobe();
  const [name, setName] = useState(DEFAULT_NAME);
  const [photo, setPhoto] = useState<NewPhoto | null>(null);
  const [processing, setProcessing] = useState(false);
  const previewUrl = useObjectUrl(photo);

  async function handlePick([file]: File[]) {
    setProcessing(true);
    try {
      setPhoto(await compressImage(file, WARDROBE_MAX_EDGE));
    } catch (error) {
      toast(errorMessage(error));
    } finally {
      setProcessing(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!photo) return;
    createWardrobe.mutate(
      { name: name.trim() || DEFAULT_NAME, photo },
      {
        onSuccess: (wardrobe) => navigate(`/wardrobes/${wardrobe.id}/edit`, { replace: true }),
        onError: (error) => toast(errorMessage(error)),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="text-xl font-semibold">New wardrobe</h1>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          className="rounded-xl border border-stone-300 px-3 py-2 text-base"
        />
      </label>

      {previewUrl ? (
        <img src={previewUrl} alt="Wardrobe photo preview" className="max-h-[50dvh] w-full rounded-xl bg-stone-100 object-contain" />
      ) : (
        <div className="flex aspect-[3/4] max-h-[50dvh] w-full items-center justify-center rounded-xl border-2 border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
          {processing ? 'Processing…' : 'Photograph your whole wardrobe with the doors open.'}
        </div>
      )}

      <ImagePickerButton onPick={handlePick} className={buttonClass('secondary')} disabled={processing}>
        {photo ? 'Choose another photo' : 'Choose or take a photo'}
      </ImagePickerButton>

      <Button type="submit" disabled={!photo || createWardrobe.isPending}>
        Create and trace sections
      </Button>
    </form>
  );
}
```

`text-base` on inputs stops iOS Safari from zooming in when an input is focused.

**Step 2: Register the route** in `src/app/routes.tsx`. Import `NewWardrobePage` and add it before the `*` route:

```tsx
      { path: 'wardrobes/new', element: <NewWardrobePage /> },
```

**Step 3: Verify**

Run: `pnpm typecheck && pnpm test`
Expected: green.

Manual check with `pnpm dev`:
1. Open `/`, tap "New wardrobe" and pick a photo. The preview should appear.
2. Tap "Create and trace sections". The URL becomes `/wardrobes/<id>/edit` and shows "Not found" for now, because the route doesn't exist yet.
3. Go back to `/`. The wardrobe card with its thumbnail should be listed.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add new wardrobe page with photo picker"
```

---

### Task 11: Trace gestures

**Files:**
- Create: `src/features/trace/gestures.ts`, `src/features/trace/useTraceGestures.ts`
- Test: `src/features/trace/gestures.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { applyGesture } from './gestures';

describe('applyGesture', () => {
  it('draws a rectangle from the start point to the pointer', () => {
    const rect = applyGesture({ kind: 'draw', start: { x: 0.5, y: 0.5 } }, { x: 0.2, y: 0.9 });
    expect(rect.x).toBeCloseTo(0.2);
    expect(rect.y).toBeCloseTo(0.5);
    expect(rect.w).toBeCloseTo(0.3);
    expect(rect.h).toBeCloseTo(0.4);
  });

  it('moves the original rectangle by the pointer delta', () => {
    const rect = applyGesture(
      { kind: 'move', id: 'a', start: { x: 0.5, y: 0.5 }, origin: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } },
      { x: 0.6, y: 0.7 },
    );
    expect(rect.x).toBeCloseTo(0.2);
    expect(rect.y).toBeCloseTo(0.3);
  });

  it('resizes the original rectangle from the dragged corner', () => {
    const rect = applyGesture(
      { kind: 'resize', id: 'a', corner: 'se', origin: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } },
      { x: 0.5, y: 0.5 },
    );
    expect(rect.w).toBeCloseTo(0.4);
    expect(rect.h).toBeCloseTo(0.4);
  });
});
```

**Step 2: Run the tests to check they fail**

Run: `pnpm vitest run src/features/trace`
Expected: FAIL, because the module is not found.

**Step 3: Implement `src/features/trace/gestures.ts`**

```ts
import { moveRect, rectFromPoints, resizeRect, type Corner, type Point, type Rect } from '../../lib/geometry';

export type Gesture =
  | { kind: 'draw'; start: Point }
  | { kind: 'move'; id: string; start: Point; origin: Rect }
  | { kind: 'resize'; id: string; corner: Corner; origin: Rect };

/** The rectangle a gesture produces when the pointer is at `point`. */
export function applyGesture(gesture: Gesture, point: Point): Rect {
  switch (gesture.kind) {
    case 'draw':
      return rectFromPoints(gesture.start, point);
    case 'move':
      return moveRect(gesture.origin, point.x - gesture.start.x, point.y - gesture.start.y);
    case 'resize':
      return resizeRect(gesture.origin, gesture.corner, point);
  }
}
```

**Step 4: Run the tests to check they pass**

Run: `pnpm vitest run src/features/trace`
Expected: PASS (3 tests).

**Step 5: Implement the pointer hook `src/features/trace/useTraceGestures.ts`**

The pointer is captured on the stage, so every move and up event arrives at the stage's handlers even when the finger leaves the rectangle. Section and handle `pointerdown`s stop propagation so they don't also start a new drawing.

```ts
import { useState, type Dispatch, type PointerEvent, type RefObject, type SetStateAction } from 'react';
import type { SectionDraft } from '../../data/types';
import { clamp, isBigEnough, type Corner, type Point, type Rect } from '../../lib/geometry';
import { applyGesture, type Gesture } from './gestures';

export function useTraceGestures({
  stageRef,
  setSections,
  onSelect,
}: {
  stageRef: RefObject<HTMLDivElement | null>;
  setSections: Dispatch<SetStateAction<SectionDraft[]>>;
  onSelect: (id: string | null) => void;
}) {
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [drawRect, setDrawRect] = useState<Rect | null>(null);

  function toPoint(event: PointerEvent): Point {
    const box = stageRef.current!.getBoundingClientRect();
    return {
      x: clamp((event.clientX - box.left) / box.width, 0, 1),
      y: clamp((event.clientY - box.top) / box.height, 0, 1),
    };
  }

  function begin(event: PointerEvent, next: Gesture) {
    event.stopPropagation();
    event.preventDefault();
    stageRef.current?.setPointerCapture(event.pointerId);
    setGesture(next);
  }

  function finish() {
    setGesture(null);
    setDrawRect(null);
  }

  return {
    /** The rectangle being drawn right now, if any. */
    drawRect,

    startDraw(event: PointerEvent) {
      onSelect(null);
      const start = toPoint(event);
      begin(event, { kind: 'draw', start });
      setDrawRect(applyGesture({ kind: 'draw', start }, start));
    },

    startMove(event: PointerEvent, section: SectionDraft) {
      onSelect(section.id);
      begin(event, { kind: 'move', id: section.id, start: toPoint(event), origin: section.rect });
    },

    startResize(event: PointerEvent, section: SectionDraft, corner: Corner) {
      begin(event, { kind: 'resize', id: section.id, corner, origin: section.rect });
    },

    stageHandlers: {
      onPointerMove(event: PointerEvent) {
        if (!gesture) return;
        const rect = applyGesture(gesture, toPoint(event));
        if (gesture.kind === 'draw') setDrawRect(rect);
        else setSections((prev) => prev.map((s) => (s.id === gesture.id ? { ...s, rect } : s)));
      },
      onPointerUp(event: PointerEvent) {
        if (gesture?.kind === 'draw') {
          const rect = applyGesture(gesture, toPoint(event));
          if (isBigEnough(rect)) {
            const id = crypto.randomUUID();
            setSections((prev) => [...prev, { id, rect }]);
            onSelect(id);
          }
        }
        finish();
      },
      onPointerCancel: finish,
    },
  };
}
```

**Step 6: Verify**

Run: `pnpm typecheck`
Expected: no errors.

**Step 7: Commit**

```bash
git add src/features/trace
git commit -m "feat: add trace gesture maths and pointer hook"
```

---

### Task 12: Trace page

**Files:**
- Create: `src/features/trace/TraceRect.tsx`, `src/features/trace/RemoveSectionDialog.tsx`, `src/features/trace/TracePage.tsx`
- Modify: `src/app/routes.tsx`

**Step 1: `src/features/trace/TraceRect.tsx`**

```tsx
import type { PointerEvent } from 'react';
import type { SectionDraft } from '../../data/types';
import { rectToStyle, type Corner } from '../../lib/geometry';

const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];

const cornerClass: Record<Corner, string> = {
  nw: '-top-3 -left-3 cursor-nwse-resize',
  ne: '-top-3 -right-3 cursor-nesw-resize',
  sw: '-bottom-3 -left-3 cursor-nesw-resize',
  se: '-right-3 -bottom-3 cursor-nwse-resize',
};

export function TraceRect({
  section,
  label,
  selected,
  onPointerDown,
  onHandlePointerDown,
}: {
  section: SectionDraft;
  label: string;
  selected: boolean;
  onPointerDown: (event: PointerEvent) => void;
  onHandlePointerDown: (event: PointerEvent, corner: Corner) => void;
}) {
  return (
    <div
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPointerDown={onPointerDown}
      style={rectToStyle(section.rect)}
      className={`absolute cursor-move rounded-sm border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.4)] ${
        selected ? 'z-10 border-amber-400 bg-amber-300/25' : 'border-white bg-white/15'
      }`}
    >
      <span className="pointer-events-none absolute top-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
        {label}
      </span>
      {selected &&
        CORNERS.map((corner) => (
          <span
            key={corner}
            onPointerDown={(event) => onHandlePointerDown(event, corner)}
            className={`absolute h-6 w-6 rounded-full border-2 border-amber-400 bg-white shadow ${cornerClass[corner]}`}
          />
        ))}
    </div>
  );
}
```

**Step 2: `src/features/trace/RemoveSectionDialog.tsx`**

```tsx
import { useState } from 'react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';

export function RemoveSectionDialog({
  label,
  itemCount,
  targets,
  onConfirm,
  onCancel,
}: {
  label: string;
  itemCount: number;
  /** Sections the items can be moved to. */
  targets: { id: string; label: string }[];
  /** null = delete the items too. */
  onConfirm: (target: string | null) => void;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState(targets[0]?.id ?? '');

  return (
    <Dialog title={`Delete ${label}?`} onClose={onCancel}>
      <p className="text-sm text-stone-600">
        This section has {itemCount} {itemCount === 1 ? 'item' : 'items'}.
      </p>
      {targets.length > 0 && (
        <div className="mt-4 flex gap-2">
          <select
            aria-label="Move items to"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2 py-2 text-base"
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <Button onClick={() => onConfirm(target)}>Move items</Button>
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => onConfirm(null)}>
          Delete items too
        </Button>
      </div>
    </Dialog>
  );
}
```

**Step 3: `src/features/trace/TracePage.tsx`**

Edits stay local until "Done", which saves everything in one repository call. Deleting a stored section that has items records a decision in `removals`. If a section that received moved items is deleted later, the decisions that point at it are re-pointed, so the repository never sees a target that has been removed.

```tsx
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { NotFound } from '../../app/NotFound';
import { Button } from '../../components/Button';
import { PhotoStage } from '../../components/PhotoStage';
import { useToast } from '../../components/Toast';
import { usePhoto, useSaveSections, useSectionCounts, useSections, useWardrobe } from '../../data/hooks';
import type { Photo, Section, SectionCounts, SectionDraft, SectionRemovals, Wardrobe } from '../../data/types';
import { errorMessage } from '../../lib/errors';
import { rectToStyle, sortSections } from '../../lib/geometry';
import { sectionLabel } from '../../lib/labels';
import { RemoveSectionDialog } from './RemoveSectionDialog';
import { TraceRect } from './TraceRect';
import { useTraceGestures } from './useTraceGestures';

export function TracePage() {
  const { wardrobeId = '' } = useParams();
  const wardrobe = useWardrobe(wardrobeId);
  const sections = useSections(wardrobeId);
  const counts = useSectionCounts(wardrobeId);
  const photo = usePhoto(wardrobe.data?.photoId);

  if (wardrobe.isPending || sections.isPending || counts.isPending || (wardrobe.data && photo.isPending)) return null;
  if (!wardrobe.data || !photo.data) return <NotFound what="wardrobe" />;

  return (
    <TraceEditor
      wardrobe={wardrobe.data}
      photo={photo.data}
      initialSections={sections.data ?? []}
      counts={counts.data ?? {}}
    />
  );
}

function TraceEditor({
  wardrobe,
  photo,
  initialSections,
  counts,
}: {
  wardrobe: Wardrobe;
  photo: Photo;
  initialSections: Section[];
  counts: SectionCounts;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const saveSections = useSaveSections(wardrobe.id);
  const stageRef = useRef<HTMLDivElement>(null);
  const [drafts, setDrafts] = useState<SectionDraft[]>(() =>
    initialSections.map(({ id, name, rect }) => ({ id, name, rect })),
  );
  const [removals, setRemovals] = useState<SectionRemovals>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SectionDraft | null>(null);
  const gestures = useTraceGestures({ stageRef, setSections: setDrafts, onSelect: setSelectedId });

  const indexOf = new Map(sortSections(drafts).map((s, index) => [s.id, index]));
  const labelOf = (section: SectionDraft) => sectionLabel(section.name, indexOf.get(section.id) ?? 0);
  const selected = drafts.find((s) => s.id === selectedId) ?? null;
  const persistedIds = new Set(initialSections.map((s) => s.id));

  /** Stored items in this section plus any moved here from sections deleted in this session. */
  function itemCount(sectionId: string): number {
    const own = (counts[sectionId]?.clothes ?? 0) + (counts[sectionId]?.shoes ?? 0);
    const movedIn = Object.entries(removals)
      .filter(([, target]) => target === sectionId)
      .reduce((sum, [removedId]) => sum + itemCount(removedId), 0);
    return own + movedIn;
  }

  function removeSection(section: SectionDraft, target: string | null) {
    setDrafts((prev) => prev.filter((s) => s.id !== section.id));
    setRemovals((prev) => {
      const next: SectionRemovals = {};
      for (const [removedId, oldTarget] of Object.entries(prev)) {
        next[removedId] = oldTarget === section.id ? target : oldTarget;
      }
      if (persistedIds.has(section.id)) next[section.id] = target;
      return next;
    });
    setSelectedId(null);
    setPendingDelete(null);
  }

  function requestDelete(section: SectionDraft) {
    if (itemCount(section.id) > 0) setPendingDelete(section);
    else removeSection(section, null);
  }

  function rename(section: SectionDraft, name: string) {
    setDrafts((prev) => prev.map((s) => (s.id === section.id ? { ...s, name } : s)));
  }

  function handleDone() {
    saveSections.mutate(
      { drafts, removals },
      {
        onSuccess: () => navigate(`/wardrobes/${wardrobe.id}`, { replace: true }),
        onError: (error) => toast(errorMessage(error)),
      },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => navigate(`/wardrobes/${wardrobe.id}`)}>
          Cancel
        </Button>
        <h1 className="truncate text-base font-semibold">{wardrobe.name}</h1>
        <Button onClick={handleDone} disabled={saveSections.isPending}>
          Done
        </Button>
      </div>
      <p className="text-center text-sm text-stone-600">Drag on the photo to mark a shelf, drawer or rail.</p>

      <PhotoStage
        ref={stageRef}
        data-testid="trace-stage"
        photoId={wardrobe.photoId}
        width={photo.width}
        height={photo.height}
        alt={wardrobe.name}
        reservedHeight={240}
        className="touch-none select-none"
        onPointerDown={gestures.startDraw}
        {...gestures.stageHandlers}
      >
        {drafts.map((section) => (
          <TraceRect
            key={section.id}
            section={section}
            label={labelOf(section)}
            selected={section.id === selectedId}
            onPointerDown={(event) => gestures.startMove(event, section)}
            onHandlePointerDown={(event, corner) => gestures.startResize(event, section, corner)}
          />
        ))}
        {gestures.drawRect && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-white bg-white/20"
            style={rectToStyle(gestures.drawRect)}
          />
        )}
      </PhotoStage>

      {selected && (
        <div className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm ring-1 ring-stone-200">
          <input
            aria-label="Section name"
            placeholder={sectionLabel(undefined, indexOf.get(selected.id) ?? 0)}
            value={selected.name ?? ''}
            onChange={(event) => rename(selected, event.target.value)}
            maxLength={40}
            className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-base"
          />
          <Button variant="danger" onClick={() => requestDelete(selected)}>
            Delete
          </Button>
        </div>
      )}

      {pendingDelete && (
        <RemoveSectionDialog
          label={labelOf(pendingDelete)}
          itemCount={itemCount(pendingDelete.id)}
          targets={sortSections(drafts)
            .filter((s) => s.id !== pendingDelete.id)
            .map((s) => ({ id: s.id, label: labelOf(s) }))}
          onConfirm={(target) => removeSection(pendingDelete, target)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
```

**Step 4: Register the route** in `src/app/routes.tsx`, before `*`:

```tsx
      { path: 'wardrobes/:wardrobeId/edit', element: <TracePage /> },
```

**Step 5: Verify**

Run: `pnpm typecheck && pnpm test`
Expected: green.

Manual check: `pnpm dev`, open Chrome DevTools device mode (a phone preset) and create a wardrobe. Then check each of these:
1. Drag on the photo. A dashed rectangle follows your finger, and on release it becomes "Section 1" and is selected.
2. A tiny tap creates nothing.
3. Drag a section to move it. It stays inside the photo.
4. Drag a corner handle to resize it. It cannot invert or shrink below the minimum size.
5. Draw a second section above the first. The numbering updates so the top one is "Section 1".
6. Rename a section in the name field. The label updates.
7. "Done" navigates to `/wardrobes/<id>`, which shows "Not found" until Task 13.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add trace mode for drawing wardrobe sections"
```

---

### Task 13: Wardrobe view page

**Files:**
- Create: `src/features/view/SectionHotspot.tsx`, `src/features/view/WardrobeViewPage.tsx`
- Modify: `src/app/routes.tsx`, `src/app/routes.test.tsx`

`WardrobeViewPage` renders `AddItemSheet`, which is built in Task 15. To keep this task compiling, the **+** button here navigates into the section for now, and Task 15 replaces that.

**Step 1: Add the failing tests** to `src/app/routes.test.tsx`

```tsx
describe('wardrobe view', () => {
  it('shows sections with their item counts', async () => {
    const repository = createTestRepository();
    const wardrobe = await repository.createWardrobe('Closet', testPhoto());
    const [shelf] = await repository.saveSections(
      wardrobe.id,
      [{ id: 'shelf', name: 'Top shelf', rect: { x: 0.1, y: 0.1, w: 0.5, h: 0.2 } }],
      {},
    );
    await repository.addItems(shelf.id, [
      { type: 'clothes', photo: testPhoto() },
      { type: 'shoes', photo: testPhoto() },
      { type: 'shoes', photo: testPhoto() },
    ]);

    renderRoute(`/wardrobes/${wardrobe.id}`, { repository });

    const link = await screen.findByRole('link', { name: 'Open Top shelf' });
    expect(link).toHaveAttribute('href', `/wardrobes/${wardrobe.id}/sections/shelf`);
    expect(await screen.findByText('👕 1 · 👟 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item to Top shelf' })).toBeInTheDocument();
  });

  it('prompts to trace when there are no sections', async () => {
    const repository = createTestRepository();
    const wardrobe = await repository.createWardrobe('Closet', testPhoto());

    renderRoute(`/wardrobes/${wardrobe.id}`, { repository });

    expect(await screen.findByRole('link', { name: 'Trace sections' })).toHaveAttribute(
      'href',
      `/wardrobes/${wardrobe.id}/edit`,
    );
  });

  it('shows not found for an unknown wardrobe', async () => {
    renderRoute('/wardrobes/missing');
    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument();
  });
});
```

**Step 2: Run the tests to check they fail**

Run: `pnpm vitest run src/app/routes.test.tsx`
Expected: the 3 new tests FAIL because nothing matches the route. The `*` route shows "Not found", so the third one may already pass.

**Step 3: Implement `src/features/view/SectionHotspot.tsx`**

The Link and the **+** button are siblings rather than nested, because a `<button>` inside an `<a>` is invalid HTML.

```tsx
import { Link } from 'react-router';
import { ImagePickerButton } from '../../components/ImagePickerButton';
import type { ItemType, Section } from '../../data/types';
import { rectToStyle } from '../../lib/geometry';

export function SectionHotspot({
  section,
  label,
  counts,
  onAdd,
}: {
  section: Section;
  label: string;
  counts: Record<ItemType, number> | undefined;
  onAdd: (files: File[]) => void;
}) {
  const clothes = counts?.clothes ?? 0;
  const shoes = counts?.shoes ?? 0;
  const badge = [clothes > 0 && `👕 ${clothes}`, shoes > 0 && `👟 ${shoes}`].filter(Boolean).join(' · ');

  return (
    <div className="absolute" style={rectToStyle(section.rect)}>
      <Link
        to={`/wardrobes/${section.wardrobeId}/sections/${section.id}`}
        aria-label={`Open ${label}`}
        className="absolute inset-0 rounded-sm border-2 border-white/90 bg-white/10 shadow-[0_0_0_1px_rgba(0,0,0,0.35)] transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-amber-400"
      >
        <span className="absolute top-1 left-1 max-w-[calc(100%-2.75rem)] truncate rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
          {label}
        </span>
        {badge && (
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">{badge}</span>
        )}
      </Link>
      <ImagePickerButton
        multiple
        onPick={onAdd}
        aria-label={`Add item to ${label}`}
        className="absolute top-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl font-semibold text-stone-900 shadow"
      >
        +
      </ImagePickerButton>
    </div>
  );
}
```

**Step 4: Implement `src/features/view/WardrobeViewPage.tsx`**

```tsx
import { useState } from 'react';
import { Link, Outlet, useNavigate, useParams } from 'react-router';
import { NotFound } from '../../app/NotFound';
import { Button, buttonClass } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PhotoStage } from '../../components/PhotoStage';
import { useToast } from '../../components/Toast';
import { useDeleteWardrobe, usePhoto, useSectionCounts, useSections, useWardrobe } from '../../data/hooks';
import { errorMessage } from '../../lib/errors';
import { sectionLabel } from '../../lib/labels';
import { SectionHotspot } from './SectionHotspot';

export function WardrobeViewPage() {
  const { wardrobeId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const wardrobe = useWardrobe(wardrobeId);
  const sections = useSections(wardrobeId);
  const counts = useSectionCounts(wardrobeId);
  const photo = usePhoto(wardrobe.data?.photoId);
  const deleteWardrobe = useDeleteWardrobe();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (wardrobe.isPending || sections.isPending || (wardrobe.data && photo.isPending)) return null;
  if (!wardrobe.data || !photo.data) return <NotFound what="wardrobe" />;

  const current = wardrobe.data;
  const sectionList = sections.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="truncate text-xl font-semibold">{current.name}</h1>
        <div className="flex shrink-0 gap-1">
          <Link to={`/wardrobes/${current.id}/edit`} className={buttonClass('secondary')}>
            Edit layout
          </Link>
          <Button variant="ghost" aria-label="Delete wardrobe" onClick={() => setConfirmDelete(true)}>
            🗑
          </Button>
        </div>
      </div>

      <PhotoStage
        photoId={current.photoId}
        width={photo.data.width}
        height={photo.data.height}
        alt={current.name}
        reservedHeight={150}
      >
        {sectionList.map((section) => (
          <SectionHotspot
            key={section.id}
            section={section}
            label={sectionLabel(section.name, section.order)}
            counts={counts.data?.[section.id]}
            // Replaced in Task 15 with the add-item sheet.
            onAdd={() => navigate(`/wardrobes/${current.id}/sections/${section.id}`)}
          />
        ))}
      </PhotoStage>

      {sectionList.length === 0 && (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-stone-200">
          <p className="text-stone-700">No sections yet.</p>
          <Link to={`/wardrobes/${current.id}/edit`} className={buttonClass('primary', 'mt-3')}>
            Trace sections
          </Link>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${current.name}?`}
          message="This deletes the wardrobe, its sections and every item in it."
          confirmLabel="Delete wardrobe"
          busy={deleteWardrobe.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() =>
            deleteWardrobe.mutate(current.id, {
              onSuccess: () => navigate('/', { replace: true }),
              onError: (error) => toast(errorMessage(error)),
            })
          }
        />
      )}

      <Outlet />
    </div>
  );
}
```

**Step 5: Register the route** in `src/app/routes.tsx`, before `*`:

```tsx
      { path: 'wardrobes/:wardrobeId', element: <WardrobeViewPage /> },
```

**Step 6: Run the tests to check they pass**

Run: `pnpm test && pnpm typecheck`
Expected: green.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add wardrobe view with tappable sections and counts"
```

---

### Task 14: Section sheet

**Files:**
- Create: `src/features/section/SectionSheet.tsx`, `src/features/section/TypeToggle.tsx`
- Modify: `src/app/routes.tsx` (nested route), `src/test/fixtures.ts` (add `seedShelf`)
- Test: `src/features/section/SectionSheet.test.tsx`

**Step 1: Write the failing test**

First add a shared seed helper to `src/test/fixtures.ts`. It lives there rather than in a test file, because importing one test file from another would run its tests twice:

```ts
import type { WardrobeRepository } from '../data/repository';

/** A wardrobe with one section named "Top shelf" (id "shelf"). */
export async function seedShelf(repository: WardrobeRepository) {
  const wardrobe = await repository.createWardrobe('Closet', testPhoto());
  const [shelf] = await repository.saveSections(
    wardrobe.id,
    [{ id: 'shelf', name: 'Top shelf', rect: { x: 0.1, y: 0.1, w: 0.5, h: 0.2 } }],
    {},
  );
  return { wardrobe, shelf };
}
```

Then `src/features/section/SectionSheet.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTestRepository, seedShelf, testPhoto } from '../../test/fixtures';
import { renderRoute } from '../../test/render';

describe('SectionSheet', () => {
  it('lists the items in a section and filters them by type', async () => {
    const repository = createTestRepository();
    const { wardrobe, shelf } = await seedShelf(repository);
    await repository.addItems(shelf.id, [
      { type: 'clothes', name: 'Blue shirt', photo: testPhoto() },
      { type: 'shoes', name: 'Sneakers', photo: testPhoto() },
    ]);

    const { user } = renderRoute(`/wardrobes/${wardrobe.id}/sections/${shelf.id}`, { repository });

    const sheet = await screen.findByRole('dialog', { name: 'Top shelf' });
    expect(await within(sheet).findByRole('img', { name: 'Blue shirt' })).toBeInTheDocument();
    expect(await within(sheet).findByRole('img', { name: 'Sneakers' })).toBeInTheDocument();

    await user.click(within(sheet).getByRole('button', { name: 'Shoes' }));

    expect(within(sheet).queryByRole('img', { name: 'Blue shirt' })).not.toBeInTheDocument();
    expect(within(sheet).getByRole('img', { name: 'Sneakers' })).toBeInTheDocument();
  });

  it('shows an empty state for a section without items', async () => {
    const repository = createTestRepository();
    const { wardrobe, shelf } = await seedShelf(repository);

    renderRoute(`/wardrobes/${wardrobe.id}/sections/${shelf.id}`, { repository });

    const sheet = await screen.findByRole('dialog', { name: 'Top shelf' });
    expect(await within(sheet).findByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('closes back to the wardrobe view', async () => {
    const repository = createTestRepository();
    const { wardrobe, shelf } = await seedShelf(repository);

    const { user, router } = renderRoute(`/wardrobes/${wardrobe.id}/sections/${shelf.id}`, { repository });

    const sheet = await screen.findByRole('dialog', { name: 'Top shelf' });
    await user.click(within(sheet).getByRole('button', { name: 'Close' }));

    expect(router.state.location.pathname).toBe(`/wardrobes/${wardrobe.id}`);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run the tests to check they fail**

Run: `pnpm vitest run src/features/section`
Expected: FAIL, because `findByRole('dialog', { name: 'Top shelf' })` times out.

**Step 3: Implement `src/features/section/TypeToggle.tsx`**

```tsx
import type { ItemType } from '../../data/types';

const OPTIONS: { value: ItemType; label: string }[] = [
  { value: 'clothes', label: '👕 Clothes' },
  { value: 'shoes', label: '👟 Shoes' },
];

export function TypeToggle({ value, onChange }: { value: ItemType; onChange: (type: ItemType) => void }) {
  return (
    <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-10 rounded-lg text-sm font-medium ${
            value === option.value ? 'bg-white shadow-sm' : 'text-stone-600'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

**Step 4: Implement `src/features/section/SectionSheet.tsx`**

The **+** button and the item detail view are added in Tasks 15 and 16.

```tsx
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Sheet } from '../../components/Sheet';
import { PhotoImg } from '../../components/PhotoImg';
import { useItems, useSections } from '../../data/hooks';
import type { ItemType } from '../../data/types';
import { itemLabel, sectionLabel } from '../../lib/labels';

type Filter = 'all' | ItemType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'clothes', label: 'Clothes' },
  { value: 'shoes', label: 'Shoes' },
];

export function SectionSheet() {
  const { wardrobeId = '', sectionId = '' } = useParams();
  const navigate = useNavigate();
  const sections = useSections(wardrobeId);
  const items = useItems(sectionId);
  const [filter, setFilter] = useState<Filter>('all');
  const close = useCallback(() => navigate(`/wardrobes/${wardrobeId}`), [navigate, wardrobeId]);

  if (sections.isPending) return null;
  const section = sections.data?.find((s) => s.id === sectionId);
  if (!section) {
    return (
      <Sheet title="Not found" onClose={close}>
        <p className="text-stone-600">This section doesn't exist anymore.</p>
      </Sheet>
    );
  }

  const label = sectionLabel(section.name, section.order);
  const visible = (items.data ?? []).filter((item) => filter === 'all' || item.type === filter);

  return (
    <Sheet title={label} onClose={close}>
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              filter === f.value ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.data && visible.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-500">
          {filter === 'all' ? 'Nothing here yet.' : 'No items of this type.'}
        </p>
      )}

      {visible.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {visible.map((item) => (
            <li key={item.id}>
              <PhotoImg photoId={item.photoId} alt={itemLabel(item)} className="aspect-square w-full rounded-xl object-cover" />
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
```

**Step 5: Nest the route** in `src/app/routes.tsx`. Replace the view route with:

```tsx
      {
        path: 'wardrobes/:wardrobeId',
        element: <WardrobeViewPage />,
        children: [{ path: 'sections/:sectionId', element: <SectionSheet /> }],
      },
```

**Step 6: Run the tests to check they pass**

Run: `pnpm test && pnpm typecheck`
Expected: green.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: open a section to see its items with type filters"
```

---

### Task 15: Add-item sheet

**Files:**
- Create: `src/features/section/AddItemSheet.tsx`
- Modify: `src/features/section/SectionSheet.tsx`, `src/features/view/WardrobeViewPage.tsx`
- Test: `src/features/section/AddItemSheet.test.tsx`

**Step 1: Write the failing tests**

```tsx
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compressImage, ImageDecodeError } from '../../lib/image';
import { createTestRepository, seedShelf, testPhoto } from '../../test/fixtures';
import { renderRoute } from '../../test/render';

vi.mock('../../lib/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/image')>()),
  compressImage: vi.fn(),
}));

const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

beforeEach(() => {
  vi.mocked(compressImage).mockReset().mockResolvedValue(testPhoto());
  localStorage.clear();
});

async function openShelf() {
  const repository = createTestRepository();
  const { wardrobe, shelf } = await seedShelf(repository);
  const { user } = renderRoute(`/wardrobes/${wardrobe.id}/sections/${shelf.id}`, { repository });
  const sheet = await screen.findByRole('dialog', { name: 'Top shelf' });
  const input = sheet.querySelector<HTMLInputElement>('input[type=file]')!;
  return { repository, shelf, user, sheet, input };
}

describe('AddItemSheet', () => {
  it('adds a named pair of shoes from the section sheet', async () => {
    const { repository, shelf, user, sheet, input } = await openShelf();

    await user.upload(input, file('sneakers.jpg'));
    const addSheet = await screen.findByRole('dialog', { name: 'Add to Top shelf' });
    await user.click(await within(addSheet).findByRole('radio', { name: /shoes/i }));
    await user.type(within(addSheet).getByLabelText(/name/i), 'Sneakers');
    await user.click(within(addSheet).getByRole('button', { name: 'Save' }));

    expect(await within(sheet).findByRole('img', { name: 'Sneakers' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Add to Top shelf' })).not.toBeInTheDocument();
    expect(await repository.listItems(shelf.id)).toMatchObject([{ type: 'shoes', name: 'Sneakers' }]);
  });

  it('adds several photos at once and remembers the last type', async () => {
    const { repository, shelf, user, input } = await openShelf();

    await user.upload(input, [file('a.jpg'), file('b.jpg')]);
    const addSheet = await screen.findByRole('dialog', { name: 'Add 2 items to Top shelf' });
    await user.click(await within(addSheet).findByRole('radio', { name: /shoes/i }));
    await user.click(within(addSheet).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('2 items added')).toBeInTheDocument();
    expect((await repository.listItems(shelf.id)).map((i) => i.type)).toEqual(['shoes', 'shoes']);

    await user.upload(input, file('c.jpg'));
    const next = await screen.findByRole('dialog', { name: 'Add to Top shelf' });
    expect(await within(next).findByRole('radio', { name: /shoes/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('reports an unreadable image and adds nothing', async () => {
    vi.mocked(compressImage).mockRejectedValue(new ImageDecodeError());
    const { repository, shelf, user, input } = await openShelf();

    await user.upload(input, file('broken.heic'));

    expect(await screen.findByText(/couldn't read that image/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Add to Top shelf' })).not.toBeInTheDocument();
    expect(await repository.listItems(shelf.id)).toEqual([]);
  });
});
```

**Step 2: Run the tests to check they fail**

Run: `pnpm vitest run src/features/section/AddItemSheet.test.tsx`
Expected: FAIL, because the sheet has no file input yet.

**Step 3: Implement `src/features/section/AddItemSheet.tsx`**

`useEffectEvent` (stable since React 19.2) lets the compression effect call the latest `onClose`/`toast` without re-running every time the parent passes a new inline callback.

```tsx
import { useEffect, useEffectEvent, useState } from 'react';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { useAddItems } from '../../data/hooks';
import { useObjectUrl } from '../../data/photo-url';
import type { ItemType, NewPhoto } from '../../data/types';
import { errorMessage } from '../../lib/errors';
import { compressImage, ITEM_MAX_EDGE } from '../../lib/image';
import { TypeToggle } from './TypeToggle';

const LAST_TYPE_KEY = 'virtual-wardrobe:last-item-type';

function readLastType(): ItemType {
  try {
    return localStorage.getItem(LAST_TYPE_KEY) === 'shoes' ? 'shoes' : 'clothes';
  } catch {
    return 'clothes';
  }
}

function writeLastType(type: ItemType) {
  try {
    localStorage.setItem(LAST_TYPE_KEY, type);
  } catch {
    // Storage unavailable: the default is good enough.
  }
}

function PhotoPreview({ photo, large }: { photo: NewPhoto; large: boolean }) {
  const url = useObjectUrl(photo);
  const className = large
    ? 'col-span-3 max-h-64 w-full rounded-xl bg-stone-100 object-contain'
    : 'aspect-square w-full rounded-xl object-cover';
  return url ? <img src={url} alt="" className={className} /> : <div className={`${className} bg-stone-100`} />;
}

export function AddItemSheet({
  sectionId,
  sectionLabel,
  files,
  onClose,
}: {
  sectionId: string;
  sectionLabel: string;
  files: File[];
  onClose: () => void;
}) {
  const toast = useToast();
  const addItems = useAddItems();
  const [photos, setPhotos] = useState<NewPhoto[] | null>(null);
  const [type, setType] = useState<ItemType>(readLastType);
  const [name, setName] = useState('');

  const onCompressed = useEffectEvent((results: PromiseSettledResult<NewPhoto>[]) => {
    const ready = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (ready.length === 0) {
      toast(errorMessage(failed[0]?.reason));
      onClose();
      return;
    }
    if (failed.length > 0) toast(`${failed.length} of ${results.length} images couldn't be read and were skipped.`);
    setPhotos(ready);
  });

  useEffect(() => {
    let active = true;
    Promise.allSettled(files.map((file) => compressImage(file, ITEM_MAX_EDGE))).then((results) => {
      if (active) onCompressed(results);
    });
    return () => {
      active = false;
    };
  }, [files]);

  function handleSave() {
    if (!photos) return;
    const itemName = photos.length === 1 ? name : undefined;
    addItems.mutate(
      { sectionId, items: photos.map((photo) => ({ type, name: itemName, photo })) },
      {
        onSuccess: (items) => {
          writeLastType(type);
          toast(items.length === 1 ? 'Item added' : `${items.length} items added`);
          onClose();
        },
        onError: (error) => toast(errorMessage(error)),
      },
    );
  }

  const title = files.length === 1 ? `Add to ${sectionLabel}` : `Add ${files.length} items to ${sectionLabel}`;

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <Button className="w-full" onClick={handleSave} disabled={!photos || addItems.isPending}>
          Save
        </Button>
      }
    >
      {!photos ? (
        <p className="py-8 text-center text-sm text-stone-500">Preparing photos…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <PhotoPreview key={index} photo={photo} large={photos.length === 1} />
            ))}
          </div>
          <TypeToggle value={type} onChange={setType} />
          {photos.length === 1 && (
            <label className="flex flex-col gap-1 text-sm font-medium">
              Name (optional)
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                className="rounded-lg border border-stone-300 px-3 py-2 text-base"
              />
            </label>
          )}
        </div>
      )}
    </Sheet>
  );
}
```

**Step 4: Wire it into `SectionSheet.tsx`**

Add these imports:
```tsx
import { buttonClass } from '../../components/Button';
import { ImagePickerButton } from '../../components/ImagePickerButton';
import { AddItemSheet } from './AddItemSheet';
```

Add the state next to `filter`:
```tsx
  const [adding, setAdding] = useState<File[] | null>(null);
```

Replace the final `return (<Sheet title={label} onClose={close}> … </Sheet>);` with a fragment. The sheet gets a footer, and the add sheet renders after it:
```tsx
  return (
    <>
      <Sheet
        title={label}
        onClose={close}
        footer={
          <ImagePickerButton multiple onPick={setAdding} className={buttonClass('primary', 'w-full')}>
            + Add clothes or shoes
          </ImagePickerButton>
        }
      >
        {/* …filters, empty state and grid unchanged… */}
      </Sheet>
      {adding && (
        <AddItemSheet sectionId={section.id} sectionLabel={label} files={adding} onClose={() => setAdding(null)} />
      )}
    </>
  );
```

**Step 5: Wire it into `WardrobeViewPage.tsx`** so the **+** on each hotspot opens the add sheet directly, replacing the temporary navigation from Task 13.

Add the import `import { AddItemSheet } from '../section/AddItemSheet';` and this state next to `confirmDelete`:
```tsx
  const [adding, setAdding] = useState<{ sectionId: string; label: string; files: File[] } | null>(null);
```

Change the hotspot's `onAdd` (and delete the "Replaced in Task 15" comment):
```tsx
            onAdd={(files) =>
              setAdding({ sectionId: section.id, label: sectionLabel(section.name, section.order), files })
            }
```

Render the sheet just before `<Outlet />`:
```tsx
      {adding && (
        <AddItemSheet
          sectionId={adding.sectionId}
          sectionLabel={adding.label}
          files={adding.files}
          onClose={() => setAdding(null)}
        />
      )}
```

**Step 6: Run the tests to check they pass**

Run: `pnpm test && pnpm typecheck`
Expected: green.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add clothes and shoes to a section from photos"
```

---

### Task 16: Item detail (rename, change type, move, delete)

**Files:**
- Create: `src/features/section/ItemDetail.tsx`
- Modify: `src/features/section/SectionSheet.tsx`
- Test: `src/features/section/SectionSheet.test.tsx` (add tests)

**Step 1: Add the failing tests** to `SectionSheet.test.tsx`

```tsx
describe('ItemDetail', () => {
  async function openItem() {
    const repository = createTestRepository();
    const { wardrobe, shelf } = await seedShelf(repository);
    await repository.saveSections(
      wardrobe.id,
      [
        { id: shelf.id, name: 'Top shelf', rect: shelf.rect },
        { id: 'drawer', name: 'Drawer', rect: { x: 0.1, y: 0.6, w: 0.5, h: 0.2 } },
      ],
      {},
    );
    const [item] = await repository.addItems(shelf.id, [{ type: 'clothes', name: 'Blue shirt', photo: testPhoto() }]);
    const { user } = renderRoute(`/wardrobes/${wardrobe.id}/sections/${shelf.id}`, { repository });
    const sheet = await screen.findByRole('dialog', { name: 'Top shelf' });
    await user.click(await within(sheet).findByRole('button', { name: 'Blue shirt' }));
    const detail = await screen.findByRole('dialog', { name: 'Blue shirt' });
    return { repository, shelf, item, user, sheet, detail };
  }

  it('renames an item and changes its type', async () => {
    const { repository, shelf, user, detail } = await openItem();

    const nameInput = within(detail).getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Linen shirt');
    await user.click(within(detail).getByRole('radio', { name: /shoes/i }));
    await user.click(within(detail).getByRole('button', { name: 'Close' }));

    await vi.waitFor(async () =>
      expect(await repository.listItems(shelf.id)).toMatchObject([{ name: 'Linen shirt', type: 'shoes' }]),
    );
  });

  it('moves an item to another section', async () => {
    const { repository, user, sheet, detail } = await openItem();

    await user.selectOptions(within(detail).getByLabelText('Section'), 'Drawer');

    expect(await screen.findByText('Item moved')).toBeInTheDocument();
    await vi.waitFor(() => expect(within(sheet).queryByRole('img', { name: 'Blue shirt' })).not.toBeInTheDocument());
    expect(await repository.listItems('drawer')).toHaveLength(1);
  });

  it('deletes an item after confirmation', async () => {
    const { repository, shelf, user, sheet, detail } = await openItem();

    await user.click(within(detail).getByRole('button', { name: 'Delete' }));
    await user.click(within(detail).getByRole('button', { name: 'Really delete?' }));

    expect(await within(sheet).findByText('Nothing here yet.')).toBeInTheDocument();
    expect(await repository.listItems(shelf.id)).toEqual([]);
  });
});
```

Add `vi` to the vitest import at the top of the file: `import { describe, expect, it, vi } from 'vitest';`.

**Step 2: Run the tests to check they fail**

Run: `pnpm vitest run src/features/section/SectionSheet.test.tsx`
Expected: the 3 new tests FAIL, because there is no "Blue shirt" button yet.

**Step 3: Implement `src/features/section/ItemDetail.tsx`**

```tsx
import { useState } from 'react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../components/Toast';
import { useDeleteItem, useUpdateItem } from '../../data/hooks';
import { usePhotoUrl } from '../../data/photo-url';
import type { Item, ItemPatch, Section } from '../../data/types';
import { errorMessage } from '../../lib/errors';
import { itemLabel, sectionLabel } from '../../lib/labels';
import { TypeToggle } from './TypeToggle';

export function ItemDetail({ item, sections, onClose }: { item: Item; sections: Section[]; onClose: () => void }) {
  const toast = useToast();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const url = usePhotoUrl(item.photoId);
  const [name, setName] = useState(item.name ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const label = itemLabel(item);

  function update(patch: ItemPatch, onSuccess?: () => void) {
    updateItem.mutate({ id: item.id, patch }, { onSuccess, onError: (error) => toast(errorMessage(error)) });
  }

  function saveName() {
    if (name.trim() !== (item.name ?? '')) update({ name });
  }

  function close() {
    saveName();
    onClose();
  }

  return (
    <Dialog title={label} onClose={close}>
      {url && <img src={url} alt={label} className="max-h-[40dvh] w-full rounded-xl bg-stone-100 object-contain" />}
      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={saveName}
            maxLength={60}
            className="rounded-lg border border-stone-300 px-3 py-2 text-base"
          />
        </label>
        <TypeToggle value={item.type} onChange={(type) => update({ type })} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Section
          <select
            value={item.sectionId}
            onChange={(event) =>
              update({ sectionId: event.target.value }, () => {
                toast('Item moved');
                onClose();
              })
            }
            className="rounded-lg border border-stone-300 px-2 py-2 text-base"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {sectionLabel(section.name, section.order)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-between gap-2 pt-2">
          {confirmingDelete ? (
            <Button
              variant="danger"
              disabled={deleteItem.isPending}
              onClick={() => deleteItem.mutate(item.id, { onSuccess: onClose, onError: (e) => toast(errorMessage(e)) })}
            >
              Really delete?
            </Button>
          ) : (
            <Button variant="ghost" className="text-red-600" onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

**Step 4: Wire it into `SectionSheet.tsx`**

Add the import `import { ItemDetail } from './ItemDetail';` and this state:
```tsx
  const [openItemId, setOpenItemId] = useState<string | null>(null);
```

After `visible` is computed, add:
```tsx
  const openItem = items.data?.find((item) => item.id === openItemId);
```

Make each grid tile a button:
```tsx
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setOpenItemId(item.id)}
                className="block w-full overflow-hidden rounded-xl bg-stone-100"
              >
                <PhotoImg photoId={item.photoId} alt={itemLabel(item)} className="aspect-square w-full object-cover" />
              </button>
            </li>
```

Render the detail after the add sheet, inside the fragment:
```tsx
      {openItem && (
        <ItemDetail item={openItem} sections={sections.data ?? []} onClose={() => setOpenItemId(null)} />
      )}
```

Note: the Sheet's "Close" button and the ItemDetail's "Close" button are in different dialogs. The tests use `within(...)`, so they don't collide.

**Step 5: Run the tests to check they pass**

Run: `pnpm test && pnpm typecheck`
Expected: green.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: item detail with rename, type change, move and delete"
```

---

### Task 17: Playwright smoke test (mobile)

**Files:**
- Create: `playwright.config.ts`, `e2e/wardrobe.spec.ts`

**Step 1: Install the browser**

Run: `pnpm exec playwright install chromium`

**Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'pnpm dev --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Step 3: Write `e2e/wardrobe.spec.ts`**

The test image is a 1×1 PNG, which is enough to exercise real decoding, compression and IndexedDB storage in Chromium.

```ts
import { expect, test, type Page } from '@playwright/test';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

async function pickImage(page: Page, open: () => Promise<void>, name: string) {
  const chooser = page.waitForEvent('filechooser');
  await open();
  await (await chooser).setFiles({ name, mimeType: 'image/png', buffer: PNG });
}

test('create a wardrobe, trace sections, add an item and find it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'New wardrobe' }).click();

  await page.getByLabel('Name').fill('Bedroom closet');
  await pickImage(page, () => page.getByRole('button', { name: 'Choose or take a photo' }).click(), 'closet.png');
  await expect(page.getByRole('img', { name: 'Wardrobe photo preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Create and trace sections' }).click();

  const stage = page.getByTestId('trace-stage');
  await expect(stage.getByRole('img', { name: 'Bedroom closet' })).toBeVisible();
  const box = (await stage.boundingBox())!;
  const drag = async (x1: number, y1: number, x2: number, y2: number) => {
    await page.mouse.move(box.x + box.width * x1, box.y + box.height * y1);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * x2, box.y + box.height * y2, { steps: 5 });
    await page.mouse.up();
  };
  await drag(0.05, 0.05, 0.6, 0.35);
  await drag(0.05, 0.55, 0.6, 0.9);
  await expect(stage.getByRole('button', { name: 'Section 1' })).toBeVisible();
  await expect(stage.getByRole('button', { name: 'Section 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  await pickImage(page, () => page.getByRole('button', { name: 'Add item to Section 1' }).click(), 'sneakers.png');
  const addSheet = page.getByRole('dialog', { name: 'Add to Section 1' });
  await addSheet.getByRole('radio', { name: /shoes/i }).click();
  await addSheet.getByLabel(/name/i).fill('Sneakers');
  await addSheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('👟 1')).toBeVisible();

  await page.getByRole('link', { name: 'Open Section 1' }).click();
  const sheet = page.getByRole('dialog', { name: 'Section 1' });
  await expect(sheet.getByRole('img', { name: 'Sneakers' })).toBeVisible();

  // Data survives a reload (IndexedDB).
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Section 1' }).getByRole('img', { name: 'Sneakers' })).toBeVisible();
});
```

**Step 4: Run the test**

Run: `pnpm e2e`
Expected: 1 passed.

If the drags don't create sections, run `pnpm e2e --headed --debug` and check that the stage's `touch-action: none` (`touch-none`) is applied, and that the `pointerdown` reaches the stage rather than the `<img>`. The image has `draggable={false}`.

**Step 5: Commit**

```bash
git add -A
git commit -m "test: add mobile Playwright smoke test for the core flow"
```

---

### Task 18: Final verification and README

**Files:**
- Create: `README.md`

**Step 1: Create `README.md`**

````markdown
# Virtual Wardrobe

Organize your real wardrobe virtually: photograph it, trace its shelves, drawers and rails, then add photos of your clothes and shoes to each section.

Everything is stored locally in your browser (IndexedDB). No account or server is needed.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # unit + component tests (Vitest)
pnpm e2e        # mobile smoke test (Playwright)
pnpm build      # typecheck + production build
```

To try it on your phone, run `pnpm dev --host` and open the printed network URL. The phone and computer must be on the same Wi-Fi network.

## Architecture

- `src/data/repository.ts`: the `WardrobeRepository` interface. All persistence goes through it.
- `src/data/dexie-repository.ts`: the IndexedDB implementation. Its tests are the contract a future HTTP backend must pass.
- `src/lib/geometry.ts`: section rectangles stored as 0–1 fractions of the photo.
- `src/features/*`: the pages (wardrobe list, trace mode, wardrobe view, section sheet).

See `docs/plans/` for the design and implementation plan.
````

**Step 2: Run everything**

Run: `pnpm build && pnpm test && pnpm e2e`
Expected: the build succeeds, all Vitest tests pass and 1 Playwright test passes.

**Step 3: Manual check on a real phone**

1. Run `pnpm dev --host` and open the network URL on a phone.
2. Create a wardrobe with the camera and trace 3 sections.
3. Check that drawing doesn't scroll the page.
4. Add items with the **+** on a hotspot and from inside a section.
5. Move an item between sections and delete one.
6. In Edit layout, delete a section that has items and move them. Check the counts on the view.

Note: on a LAN IP over plain `http`, some browsers treat the page as insecure. IndexedDB still works, but camera capture through `<input type=file>` works regardless.

**Step 4: Commit**

```bash
git add -A
git commit -m "docs: add README"
```
