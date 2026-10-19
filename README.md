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
