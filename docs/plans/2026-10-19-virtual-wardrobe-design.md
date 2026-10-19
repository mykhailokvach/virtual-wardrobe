# Virtual Wardrobe — Design

Date: 2026-10-19
Status: Approved

## Purpose

A mobile-first React SPA that helps people organize their wardrobes. The user photographs a real wardrobe, traces its sections (shelves, drawers, rails) over the photo, then adds clothes and shoes to each section by photo. Tapping a section shows what's inside.

## Decisions

| Topic | Decision |
|---|---|
| Wardrobe generation | Manual tracing: user draws rectangles over the uploaded photo |
| Storage | IndexedDB (Dexie) behind a `WardrobeRepository` interface; backend can be added later |
| Item data | Photo + type (`clothes` \| `shoes`) + optional name |
| Wardrobes | Multiple per user |
| Target device | Mobile-first, responsive; touch and mouse |
| Stack | Vite + React + TypeScript, SVG overlay, React Router, TanStack Query, Tailwind |

Rejected alternatives: react-konva (canvas: heavier, harder to make responsive and accessible); Next.js (SSR is unnecessary for a fully client-side app).

## Routes

- `/`: wardrobe list (thumbnail cards) and a "New wardrobe" button
- `/wardrobes/new`: pick or take a photo, then name the wardrobe
- `/wardrobes/:id/edit`: trace mode (draw, move, resize, delete and name sections)
- `/wardrobes/:id`: view mode (photo with tappable sections, count badges and a **+** per section)
- `/wardrobes/:id/sections/:sectionId`: opened section (bottom sheet on mobile, side panel on desktop)

## Data model

```ts
Wardrobe { id, name, photoId, createdAt, updatedAt }
Section  { id, wardrobeId, name?, rect: { x, y, w, h } /* 0–1 fractions of photo */, order }
Item     { id, sectionId, type: 'clothes' | 'shoes', name?, photoId, createdAt }
Photo    { id, blob, width, height, mime }
```

All ids are UUIDs. Photos are stored separately so lists stay light.

Implementation refinements (decided while planning):
- `Photo` stores `data: ArrayBuffer` and `mime` instead of a `Blob`. This avoids Safari's IndexedDB blob bugs and works in `fake-indexeddb`.
- `Item` also stores `wardrobeId` (denormalized) so per-section counts and cascading deletes are single indexed queries.
- The section overlay is made of absolutely-positioned elements in percent units rather than SVG. It uses the same 0–1 coordinate model, but labels, badges and touch handles don't get distorted.

## Storage layer

- `WardrobeRepository` interface (`listWardrobes`, `getWardrobe`, `createWardrobe`, `deleteWardrobe`, `saveSections`, `deleteSection`, `listItems`, `addItem`, `updateItem`, `deleteItem`, `getPhoto`, …).
- `DexieRepository` is implemented now; an `HttpRepository` can be added later without changing the UI.
- The UI accesses data only through TanStack Query hooks (`useWardrobes`, `useWardrobe(id)`, `useSectionItems(id)`, …) that read the repository from React context.

## Images

- Picker: `<input type="file" accept="image/*">` (phones offer both the camera and the gallery). Multiple selection is allowed when adding items.
- Client-side resize and compress before saving: wardrobe photos to about 2000 px on the long edge, item photos to about 800 px, as JPEG at quality 0.8.
- Blob URLs are created through a hook that revokes them on unmount.

## Interaction design

### Trace mode
- The photo is scaled to fit the viewport, with an SVG overlay in the same coordinate space; `touch-action: none` on the overlay so drawing doesn't scroll the page.
- Drag on an empty area to draw a rectangle; anything under 3% of the photo dimension is ignored.
- Tap a section to select it (outline and four corner handles): drag the body to move it, drag a handle to resize it, and use the toolbar to rename or delete it.
- Rectangles are clamped to the photo's bounds. All gestures use Pointer Events.
- "Done" saves the whole set of sections; "Cancel" discards the edits. No undo in v1.
- Sections are ordered top-to-bottom, then left-to-right; the default label is "Section N".

### View mode
- Each section is drawn as a soft outline with its label and a count badge (clothes / shoes).
- Tapping a section opens it; the **+** pinned to each section opens the picker directly.
- "Edit layout" switches to trace mode.
- Deleting a section that holds items asks whether to delete the items or move them to another section.

### Add-item flow
Tap **+** → image picker → sheet with a preview, a Clothes/Shoes toggle (defaulting to the last type used) and an optional name → Save. Picking several files adds them all with the chosen type.

### Opened section
An item grid with filter chips (All / Clothes / Shoes) and a **+** button. Tapping an item shows it full size with Rename, Change type, Move to section and Delete.

## Project structure

```
src/
  app/            router, providers (QueryClient, Repository context)
  data/           repository.ts, dexie-repository.ts, db.ts, hooks/
  lib/            image.ts, geometry.ts
  features/
    wardrobes/    WardrobeListPage, NewWardrobePage
    trace/        TracePage, SectionOverlay, useRectDrawing
    view/         WardrobeViewPage, SectionHotspot
    section/      SectionSheet, ItemGrid, AddItemSheet, ItemDetail
  components/     Button, Sheet, ConfirmDialog, ImagePickerButton, Toast
```

## Error handling

- Image that fails to decode or is in an unsupported format (e.g. HEIC on desktop): show a toast and save nothing.
- IndexedDB quota exceeded: catch it on save, show a message, and leave existing data untouched.
- Storage unavailable (some private modes): show a banner warning that data won't persist.
- Unknown wardrobe or section id: show a Not Found screen with a link home.
- Cascading deletes and item moves run inside Dexie transactions.

## Testing

- Vitest unit tests: `geometry.ts` (normalizing a drag in any direction, clamping, minimum size, ordering) and the image-resize maths.
- Vitest repository tests with `fake-indexeddb`: CRUD and cascading deletes. These are the contract tests a future `HttpRepository` must also pass.
- React Testing Library: the add-item flow and the section sheet.
- Playwright smoke test (mobile viewport): create a wardrobe → draw 2 sections → add an item → open the section → see the item.

## Out of scope (v1)

AI section detection, accounts and sync, search, undo, outfit building, PWA install.
