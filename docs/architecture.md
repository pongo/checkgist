# Architecture Map

Checkgist is a client-side Vue application that loads Markdown-like content from supported external or locally owned Source Services and renders task lists as interactive checklists.

## Source Areas

When a source area has an `index.ts`, treat it as that area's public interface. Import from the folder-level barrel when crossing feature boundaries, and keep internal helpers imported by direct file path only inside the owning area.

### `src/app/`

Application bootstrap and global UI wiring.

### `src/pages/`

Route-level pages.

- `home/` contains the landing/input page for opening supported Source URLs.
- `checklist/` contains the page for opening a Checklist from supported Source routes, including external services such as GitHub Gist or Pastebin and locally owned Local Documents.
- `local-document/` contains the route-level Local Document editor and its read-only, debounced Markdown preview. The page coordinates unsaved-change guards, save/delete flows, and navigation; reusable Local Document persistence and validation stay in `src/local-documents/`.

### `src/source-services/`

Source Service integration boundary for external and locally owned sources.

- `addressing.ts` is the Source Addressing catalog. It owns Source URL normalization, supported Source Reference recognition, canonical app route generation, and Vue route records.
- `registry.ts` is the Source Service loading registry. It maps a Source Reference type to the adapter that can load the corresponding Loaded Source.
- `services/` contains one adapter per supported Source Service. Keep service-specific address rules beside the loading adapter, and register each supported Source Service once in `services/index.ts` as an address-rule/loading-adapter pair.

Add a new Source Service here first, then register its address rule and loading adapter together in `services/index.ts`. Do not hardcode Source Service routes in `src/app/router.ts`; route records are produced by the Source Addressing catalog.

### `src/checklist/`

Checklist loading, rendering model, and shareable Checklist State.

This area owns the transition from a `SourceReference` and `LoadedSource` into a user-facing Checklist. It also owns rendering support plus encoding, applying, and mutating Checklist State.

- `loading/` owns source-reference lifecycle, Loaded Source loading, Checklist building, browser title formatting, and the shared Markdown preparation policy used by Checklist building and Local Document preview.
- `state/` owns Checklist State mutation, hash encoding/decoding, and state operation results consumed by UI and lifecycle code.
- `task-items/` owns the internal tree transformations for Task Item preparation and synchronization. Callers outside `src/checklist/` use the prepared Markdown interface from the folder-level `index.ts` instead of composing these transformations directly.

Keep cross-feature imports on the folder-level `index.ts`. Treat the subfolders as internal modules unless a caller has a specific reason to depend on their lower-level interface.

### `src/local-documents/`

Locally owned Markdown document model, persistence, routes, and reusable UI.

This area owns Local Document title and ID validation, IndexedDB create/read/update/delete operations, canonical view and edit route generation, the shared lazy document-list state, and the Local Document list shown on the home page. A successful Local Document deletion also triggers best-effort removal of its matching Bookmark.

Use the folder-level `index.ts` from pages, Source Services, and other feature areas. The Local Document Source Service adapts persisted documents into Loaded Sources; keep that adaptation under `src/source-services/` rather than coupling Local Document persistence to Checklist rendering.

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

1. Add service-specific reference, address rule, and loading behavior under `src/source-services/services/`.
2. Extend source-service types if the new service needs a new reference shape.
3. Register URL parsing, route conversion, and service lookup by adding one address-rule/loading-adapter pair to `src/source-services/services/index.ts`.
4. Add focused tests next to the source-service code and contract tests under `test/source-services/` when useful.

### Source Service Routing

Source Service route patterns live in each service's `SourceAddressRule`, next to the URL parsing rule for that service. For example, the GitHub Gist rule owns both the external URL shape it recognizes and the app route pattern such as `/gist.github.com/:gistId`.

`src/app/router.ts` should stay generic: it asks `createSourceRouteRecords()` for Source Service routes and provides the Checklist page component. When adding or changing a Source Service route, update the service address rule and its addressing tests, not `router.ts`.

## Boundaries

- `source-services` knows how to identify and load supported external or locally owned sources; it should not know how checklists are rendered.
- `checklist` knows how a Loaded Source becomes an interactive Checklist; it should not own bookmarks.
- `local-documents` owns locally persisted Markdown documents and their reusable operations; it should not own route-level editing flows or Loaded Source adaptation.
- `bookmarks` stores saved source references; it should not store Checklist State.
- `pages` coordinate route-level flows; they should not become the long-term home for reusable feature logic.
- `CONTEXT.md` is a glossary only. Put implementation navigation here, and put durable trade-off decisions in `docs/adr/` when an ADR is justified.
