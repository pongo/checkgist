# Local documents

Status: ready-for-agent

## Summary

Add application-owned Markdown documents that are stored in IndexedDB, edited in Checkgist, and adapted into the existing Loaded Source and Checklist pipeline for viewing. Local documents appear on the home page independently of Bookmarks and can also be bookmarked.

## Goals

- Let a user create, edit, preview, save, view, bookmark, and delete a Local Document without an external Source Service.
- Reuse the existing source loading, Markdown rendering, Checklist State, bookmark, copy-link, and reset behavior on the view page.
- Keep local content durable in the existing `checkgist` IndexedDB database and request persistent browser storage on first creation.
- Protect unsaved editor changes during navigation without introducing autosave.
- Preserve the existing light/dark theme behavior and English UI.

## Non-goals

- Importing, exporting, or syncing Local Documents.
- Collaborative editing or cross-tab conflict detection; concurrent saves are last-write-wins.
- Autosave.
- A content-size limit beyond the browser's IndexedDB quota.
- Inline rename, delete/undo, or drag-and-drop controls in the home-page Local Documents list.
- Live refresh of a Browse tab after the document is saved in another tab.

## Domain model

The canonical terms and invariants are recorded in `CONTEXT.md`.

- A **Local Document** is an application-owned Markdown document with stable identity.
- A **Local Document ID** is an immutable UUID created with `crypto.randomUUID()`.
- A Local Document is adapted into a Loaded Source by the existing Source Service abstraction.
- The Source Reference discriminator is `"local-document"`; the implementation should be named `localDocumentService`, not simply `local`.
- A Local Document has one Source File. Its `id` is stable and its `name` is the document title without an added `.md` suffix.
- A Local Document title is independent from the user-managed title of any Bookmark that targets it.
- Deleting a Local Document also deletes its Bookmark, if one exists.

## Data model

Store each Local Document as:

```ts
type LocalDocument = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};
```

Rules:

- `id` is generated once and never changes.
- New documents use title `Untitled document` and empty content.
- A persisted title is trimmed, non-empty, and at most 200 characters.
- Content is stored exactly as entered.
- Creation assigns the same current timestamp to `createdAt` and `updatedAt`.
- A successful changed save preserves `createdAt` and updates `updatedAt`.
- The home-page list is ordered by `updatedAt` descending, with a deterministic ID tie-breaker.
- Saving is last-write-wins; do not add a revision field.

## Routes and addressing

- View route: `/local/:documentId`.
- Edit route: `/local/:documentId/edit`.
- `LoadedSource.metadata.url` for a Local Document is the edit route.
- The generated Source Service route handles only the view route. Register the edit route explicitly in the application router so it cannot be interpreted as a checklist route.
- Validate route IDs as UUIDs before querying IndexedDB.
- Local addressing accepts same-origin absolute URLs for both the view and edit routes and canonicalizes either form to the view route.
- Never resolve a `/local/...` URL from another origin against the current browser's IndexedDB.
- Account for `import.meta.env.BASE_URL` when comparing same-origin URLs and generating application routes.

## User experience

### Home page

Render the Local Documents section after `BookmarkList`. Unlike Bookmarks, this section is always visible.

- Heading: `Local documents`.
- Primary action: `New document`.
- Empty state: `No local documents yet.`.
- Each row is visually consistent with a Bookmark row and links to `/local/:documentId`.
- Rows contain no inline actions and are not draggable.
- Show documents by most recent successful save.
- Show an inline load/create error without hiding the section or navigating away.

Selecting `New document` must:

1. Generate the UUID.
2. Persist the empty document immediately.
3. Refresh the Local Documents state.
4. Request persistent storage through the existing best-effort `requestPersistentStorageOnce()` helper.
5. Navigate the current tab to `/local/:documentId/edit`.

If persistence fails, remain on the home page and do not navigate to a nonexistent document.

### Editor page

Use a `100dvh` flex layout. The header consumes its natural height and the editor workspace consumes the remaining height without a page-level vertical scrollbar.

The header controls, in order, are:

1. `Browse` — a button-styled RouterLink to `/local/:documentId`, with `target="_blank"` and `rel="noopener noreferrer"`.
2. `Save` — an explicit save button.
3. Title input — consumes all available width.
4. `Delete` — destructive action.

Editor rules:

- `Browse` opens the last saved version in a new tab and never saves draft changes.
- Title and content are initialized from the stored document.
- Dirty state compares the current title/content with the most recently saved values.
- `Save` is disabled when clean, invalid, or already saving.
- While saving, its label is `Saving…`.
- A successful save refreshes the baseline and returns the control to a disabled `Save` state.
- A failed save leaves the draft dirty and shows an inline error in the header.
- An empty trimmed title shows an inline validation error and is not saved.
- A title over 200 characters shows an inline validation error and is not saved.
- `Ctrl+S` and `Cmd+S` prevent the browser's Save Page action and invoke the same save command.
- Register a Vue Router leave guard when dirty and use a native confirmation before discarding changes.
- Register `beforeunload` while dirty for reload and tab/window close.
- Do not warn after a successful save or once confirmed deletion begins.

`Delete` must show the native confirmation:

```text
Delete “{title}”? This cannot be undone.
```

On confirmation, atomically delete the Local Document and any Bookmark whose route is `/local/:documentId`, refresh both shared caches, and navigate to `/`. On cancellation or database failure, remain in the editor. A failure must preserve the draft and display an inline error.

If the edit route has an invalid UUID or no matching record, do not create a replacement. Show `Local document not found.` with a `Back to home` link.

### Editor workspace

On `sm` and wider screens:

- Split the remaining viewport width equally between textarea and preview.
- Give both panes the full remaining viewport height.
- Let textarea and preview scroll independently.

On screens narrower than `sm`:

- Show one full-size pane at a time.
- Place a `Preview` toggle above the active pane.
- The button keeps the label `Preview`, exposes pressed state accessibly, and changes visual style while preview is active.
- Pressing it again returns to the textarea.

Preview rules:

- Render the current unsaved Markdown draft.
- Debounce parsing by 150 ms and discard stale async parse results.
- Use the same security constraints and Markdown styling as checklist rendering.
- Task items are visual only; preview interactions must not change Checklist State or the route/hash.
- Preserve a usable error state if Markdown parsing fails.

### Checklist view

Local Documents use the existing `ChecklistPage` and `ChecklistView` behavior, including Bookmark, Copy link, Reset, Checklist State in the URL, dark/light themes, and loading/error states.

- Replace `View source` with a button-styled `Edit` RouterLink only when `session.source.reference.type === "local-document"`.
- The Edit link uses `session.source.metadata.url`.
- Keep `View source` unchanged for external Source Services.
- A missing local record raises `SourceLoadError("Local document not found.")` so the existing checklist error UI can render it.

## IndexedDB architecture

Upgrade the existing `checkgist` database from version 1 to version 2.

- Move connection and schema ownership out of the Bookmark feature into a shared Checkgist database module.
- Preserve the existing `bookmarks` store and its `by-position` index without rewriting existing records.
- Fresh version-2 databases must still create the Bookmark store.
- Add a `local-documents` store with key path `id`.
- Add a `by-updated-at` index over `updatedAt`.
- Use strongly typed `idb` schema definitions.
- Handle `versionchange`/blocking connections so schema upgrades do not remain blocked by stale application connections.
- Keep a test-only close/reset seam so fake-indexeddb tests remain isolated.
- Do not await unrelated asynchronous work inside an active IndexedDB transaction.

Cascade deletion must use one read-write transaction spanning `local-documents` and `bookmarks`. If the matching Bookmark is removed, normalize the remaining Bookmark positions within the same transaction. Only update Vue caches after the transaction commits.

## Module design

Add a cohesive `src/local-documents/` feature module with documented external exports. Keep IndexedDB records and commands behind its public interface.

Suggested responsibilities:

- Local Document type and validation.
- IndexedDB CRUD, ordered listing, and atomic cascade deletion.
- Shared lazy Vue state for list/loading/error and commands.
- Local Source Service and addressing rule.
- Home-page list UI.
- Markdown preview UI/model where useful.

The shared database module owns only database lifecycle/schema concerns. Source loading adapts a stored Local Document into `LoadedSource`; pages should not construct Loaded Sources directly.

All non-trivial invariants, migration constraints, stale-preview protection, and transaction boundaries should have concise English comments. Add TSDoc to externally exported types and functions, including symbols re-exported from folder-level `index.ts` files.

## Implementation plan

1. **Centralize and migrate the database**
   - Introduce the shared typed Checkgist database module at schema version 2.
   - Move Bookmark database opening/closing to it without changing Bookmark behavior.
   - Add the Local Document store and updated-time index.
   - Add migration tests proving version-1 Bookmark records survive the upgrade.

2. **Build the Local Documents persistence boundary**
   - Add the Local Document record type, title validation, UUID-based creation, get/list/save, and atomic delete-with-bookmark operations.
   - Preserve exact Markdown content and update timestamps only after committed writes.
   - Add fake-indexeddb tests for CRUD, ordering, validation boundaries, last-write-wins, not-found behavior, and cascade position normalization.

3. **Add shared Local Documents state**
   - Implement a lazy shared composable/model patterned after `useBookmarks` for list status, errors, create, save, delete, and refresh.
   - Request persistent storage after the first successful creation.
   - Provide an explicit cache refresh/invalidation seam so cascade deletion updates Bookmark and Local Document UI state only after commit.
   - Test shared loading, error recovery, cache updates, and persistent-storage request behavior.

4. **Register local source addressing and loading**
   - Extend `SourceReference` with `LocalDocumentReference`.
   - Add `localDocumentService` and its view route/address rule.
   - Recognize same-origin view/edit URLs, reject foreign origins, and support base paths.
   - Adapt a record to one-file `LoadedSource` with the edit route in metadata.
   - Test reference parsing, canonical route generation, successful loads, abort compatibility, and missing documents.

5. **Add the home-page Local Documents section**
   - Render the always-visible section after Bookmarks.
   - Implement empty, loading, error, populated, and creating states.
   - Persist before navigating from `New document`.
   - Test the agreed copy, sorted rows, route targets, lack of row actions, and create failure behavior.

6. **Build safe live Markdown preview**
   - Factor reusable secure Markdown parse configuration where necessary instead of duplicating security policy.
   - Add the 150 ms debounced preview with stale-result protection and non-interactive task items.
   - Reuse the project's Markdown CSS and theme styles.
   - Test debounce behavior, stale async results, errors, and task-item non-interactivity.

7. **Build the Local Document editor page**
   - Register `/local/:documentId/edit` explicitly.
   - Implement loading/not-found/error states, header actions, title validation, dirty tracking, explicit save, keyboard shortcut, and native navigation protection.
   - Implement atomic confirmed delete and post-delete navigation.
   - Implement desktop split panes and mobile Preview toggle with accessible state.
   - Test that Browse is a new-tab link and never saves, save states and errors, shortcuts, navigation guards, delete outcomes, and responsive visibility classes.

8. **Integrate Local Documents into ChecklistPage**
   - Load `/local/:documentId` through the existing lifecycle.
   - Show `Edit` for Local Documents and preserve `View source` for external services.
   - Verify Bookmark, Copy link, Reset, Checklist State, browser title, and missing-document error behavior.
   - Add regression tests for existing GitHub Gist and Pastebin rendering.

9. **Polish accessibility and failure handling**
   - Ensure labels, focus states, disabled states, `aria-pressed`, validation/error announcements, keyboard flow, and dark-theme styles are consistent with existing UI.
   - Ensure failed create/save/delete operations never navigate or clear user input.
   - Check long titles, empty Markdown, large drafts, invalid UUIDs, base-path routing, and bookmarked-document deletion.

10. **Run final verification**
    - Run targeted tests while implementing.
    - Run `npm run typecheck`.
    - Run `npm run agent:lint`.
    - Run `npm run agent:test`.
    - Finish with `npm run typecheck && npm run agent:lint && npm run agent:test`.
    - Do not start the dev server, deploy, or commit.

## Acceptance criteria

- A new Local Document is persisted before its editor opens and survives reload.
- Existing Bookmarks survive the IndexedDB v1-to-v2 upgrade.
- Home-page Local Documents are always discoverable and sorted by most recent save.
- View and edit routes use the same stable UUID for the document lifetime.
- Browse opens saved content in a new tab without saving the draft.
- Save validates title, updates content/timestamp, reports progress/errors, and supports `Ctrl/Cmd+S`.
- Dirty edits are protected on route leave and browser unload.
- Desktop and mobile editor layouts match the agreed behavior.
- Live preview is secure, debounced, current-draft based, and non-interactive.
- Local checklist viewing retains all existing Checklist features and replaces only `View source` with `Edit`.
- Confirmed deletion removes the document and its Bookmark atomically without leaving gaps in Bookmark positions.
- Missing documents never get silently recreated.
- All existing and new tests pass under the repository's final verification command.

## Documentation decision

No ADR is required. The shared IndexedDB schema and Local Document source adapter are direct, visible implementation choices and do not meet all three ADR thresholds (hard to reverse, surprising, and trade-off driven). Domain vocabulary and invariants are captured in `CONTEXT.md`.

## Suggested commit

Add local Markdown document support
