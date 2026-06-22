# Architecture Map

Checkgist is a client-side Vue application that loads Markdown-like content from supported external source services and renders task lists as interactive checklists.

This document is a navigation map. It should explain where to make a change, not record every implementation detail.

## Runtime Shape

- `src/app/main.ts` mounts the Vue application.
- `src/app/App.vue` owns the application shell.
- `src/app/router.ts` defines public routes and maps supported source references to pages.
- `src/pages/` contains route-level views.
- Feature folders under `src/` own their local UI, state, model helpers, and tests.

The app has no server-side runtime in this repository. Source content is loaded in the browser through source-service adapters, and user-owned state is persisted locally.

## Source Areas

### `src/app/`

Application bootstrap and global UI wiring.

- `main.ts` creates the Vue app.
- `router.ts` defines the route table.
- `main.css` contains global styles and theme behavior.

### `src/pages/`

Route-level pages. Pages compose feature modules but should avoid owning reusable domain logic.

- `Home/` contains the landing/input page for opening supported Source URLs.
- `SourceReference/` contains the page for a resolved source reference route, such as GitHub Gist or Pastebin.

### `src/source-services/`

External source-service integration boundary.

- `types.ts` defines source references, loaded source data, metadata, files, and load errors.
- `registry.ts` turns URL input and routes into supported source references.
- `fetcher.ts` contains shared fetching behavior.
- `services/` contains one adapter per supported Source Service.

Add a new Source Service here first, then wire it into the registry and router.

### `src/checklist-session/`

Checklist loading, rendering model, and shareable checklist state.

This area owns the transition from a `SourceReference` and `LoadedSource` into a user-facing Checklist. It also owns encoding, applying, and mutating Checklist State.

Use this folder for changes to task item extraction, checklist state operations, browser title behavior, and source-reference lifecycle behavior.

### `src/bookmarks/`

Bookmark UI and local persistence.

Bookmarks are saved references to Checklists. They do not own Checklist State. Use this folder for bookmark list behavior, bookmark toggling, ordering, and IndexedDB persistence for bookmarks.

### `src/shared/`

Small cross-feature utilities.

Keep this folder narrow. Prefer feature-local helpers unless the same behavior is genuinely shared across feature boundaries.

## Tests

Most unit and component tests live next to the code they cover under `src/`.

Contract-style source-service tests live under `test/source-services/`. Use these when checking whether an adapter still understands a real external service shape.

Agent verification commands:

- `npm run typecheck`
- `npm run agent:lint`
- `npm run agent:test`

Final verification command:

```sh
npm run typecheck && npm run agent:lint && npm run agent:test
```

## Change Guide

### Add a Source Service

1. Add service-specific reference and loading behavior under `src/source-services/services/`.
2. Extend source-service types if the new service needs a new reference shape.
3. Register URL parsing, route conversion, and service lookup in `src/source-services/registry.ts`.
4. Add a route in `src/app/router.ts`.
5. Add focused tests next to the source-service code and contract tests under `test/source-services/` when useful.

### Change Checklist Behavior

Start in `src/checklist-session/`.

- State shape and persistence format: `state.ts`, `state-codec.ts`, and state operation tests.
- Task item hierarchy: `task-item-tree.ts`.
- Loading flow: `load.ts`, `build.ts`, and `source-reference-lifecycle.ts`.
- Rendered checklist UI: `ChecklistSessionView.vue`.

### Change Bookmark Behavior

Start in `src/bookmarks/`.

- Persistence: `db.ts`.
- Vue composable state: `useBookmarks.ts`.
- List presentation and ordering: `BookmarkList.vue`, `BookmarkListItem.vue`, and `useBookmarkDragDrop.ts`.
- Bookmark toggle behavior: `BookmarkToggleButton.vue`.

### Change Routes or Pages

Start in `src/app/router.ts` for route shape, then update the corresponding folder under `src/pages/`.

Route pages should compose feature modules and keep business behavior inside the feature folder that owns it.

## Boundaries

- `source-services` knows how to identify and load external sources; it should not know how checklists are rendered.
- `checklist-session` knows how a loaded source becomes an interactive checklist; it should not own bookmarks.
- `bookmarks` stores saved source references; it should not store Checklist State.
- `pages` coordinate route-level flows; they should not become the long-term home for reusable feature logic.
- `CONTEXT.md` is a glossary only. Put implementation navigation here, and put durable trade-off decisions in `docs/adr/` when an ADR is justified.
