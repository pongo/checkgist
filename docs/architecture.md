# Architecture Map

Checkgist is a client-side Vue application that loads Markdown-like content from supported external source services and renders task lists as interactive checklists.

## Source Areas

When a source area has an `index.ts`, treat it as that area's public interface. Import from the folder-level barrel when crossing feature boundaries, and keep internal helpers imported by direct file path only inside the owning area.

### `src/app/`

Application bootstrap and global UI wiring.

### `src/pages/`

Route-level pages.

- `Home/` contains the landing/input page for opening supported Source URLs.
- `SourceReference/` contains the page for a resolved source reference route, such as GitHub Gist or Pastebin.

### `src/source-services/`

External source-service integration boundary.

- `registry.ts` turns URL input and routes into supported source references.
- `services/` contains one adapter per supported Source Service.

Add a new Source Service here first, then wire it into the registry and router (`src/app/router.ts`).

### `src/checklist-session/`

Checklist loading, rendering model, and shareable Checklist State.

This area owns the transition from a `SourceReference` and `LoadedSource` into a user-facing Checklist. It also owns encoding, applying, and mutating Checklist State.

- `loading/` owns source-reference lifecycle, Loaded Source loading, Checklist building, and browser title formatting.
- `state/` owns Checklist State mutation, hash encoding/decoding, and state operation results consumed by UI and lifecycle code.
- `task-items/` owns Task Item preparation and synchronization inside the rendered Markdown tree.

Keep cross-feature imports on the folder-level `index.ts`. Treat the subfolders as internal modules unless a caller has a specific reason to depend on their lower-level interface.

### `src/bookmarks/`

Bookmark UI and local persistence.

Bookmarks are saved references to Checklists. They do not own Checklist State. Use this folder for bookmark list behavior, bookmark toggling, ordering, and IndexedDB persistence for bookmarks.

For working with IndexedDB see `docs/vendor/IndexedDB/idb.md` and `docs/vendor/IndexedDB/fake-indexeddb.md`.

### `src/shared/`

Small cross-feature utilities.

Keep this folder narrow. Prefer feature-local helpers unless the same behavior is genuinely shared across feature boundaries.

## Tests

Most unit and component tests live next to the code they cover under `src/`.

Contract-style source-service tests live under `test/source-services/`. Use these when checking whether an adapter still understands a real external service shape.

## Change Guide

Keep this guide for changes where the sequence matters or where multiple source areas must move together. Do not duplicate the source-area map with file-by-file instructions.

### Add a Source Service

1. Add service-specific reference and loading behavior under `src/source-services/services/`.
2. Extend source-service types if the new service needs a new reference shape.
3. Register URL parsing, route conversion, and service lookup in `src/source-services/registry.ts`.
4. Add a route in `src/app/router.ts`.
5. Add focused tests next to the source-service code and contract tests under `test/source-services/` when useful.

## Boundaries

- `source-services` knows how to identify and load external sources; it should not know how checklists are rendered.
- `checklist-session` knows how a loaded source becomes an interactive checklist; it should not own bookmarks.
- `bookmarks` stores saved source references; it should not store Checklist State.
- `pages` coordinate route-level flows; they should not become the long-term home for reusable feature logic.
- `CONTEXT.md` is a glossary only. Put implementation navigation here, and put durable trade-off decisions in `docs/adr/` when an ADR is justified.
