# Local documents

Status: ready-for-agent

## Problem Statement

Checkgist can render Markdown checklists only when their content already exists on a supported external Source Service. A user cannot create and maintain a private Markdown checklist directly in the application, so even personal or browser-local content must first be published elsewhere. Users need an application-owned document that remains in their browser, can be edited with immediate Markdown feedback, and still participates in the familiar Checklist, Bookmark, copy-link, and Checklist State workflows.

## Solution

Add Local Documents stored in the browser's IndexedDB. The home page will always expose a Local Documents section and a creation action. Creating a document immediately persists an empty document with a stable UUID and opens a dedicated editor. The editor provides explicit save controls, a title field, a Markdown textarea, a live non-interactive preview, protection against accidental loss of unsaved changes, and confirmed deletion.

A saved Local Document is adapted into a Loaded Source through the existing Source Service abstraction. Its view route uses the normal Checklist page, including Bookmark, Copy link, Reset, and URL-based Checklist State. The usual external `View source` action is replaced by `Edit` for Local Documents.

## User Stories

1. As a Checkgist user, I want to see a Local Documents section on the home page, so that locally owned content is always discoverable.
2. As a new user, I want an explicit empty state when I have no Local Documents, so that I understand what the section is for.
3. As a Checkgist user, I want to create a Local Document from the home page, so that I do not need an external text-sharing service.
4. As a Checkgist user, I want creation to persist the document before opening its editor, so that every editor session refers to a real document.
5. As a Checkgist user, I want a failed creation to leave me on the home page with an error, so that I am not sent to a nonexistent document.
6. As a Checkgist user, I want newly created and recently saved documents at the top of the list, so that active work is easy to find.
7. As a Checkgist user, I want to select a Local Document from the home page, so that I can open its Checklist view.
8. As a Checkgist user, I want each Local Document to keep the same URL when renamed, so that saved links remain valid.
9. As a Checkgist user, I want a Local Document to render through the normal Checklist page, so that local and external Markdown behave consistently.
10. As a checklist user, I want to check and reset Task Items in a Local Document, so that it has the same interactive behavior as an external source.
11. As a checklist user, I want to copy a link to a Local Document Checklist and its state, so that I can reopen that state in the same browser profile.
12. As a checklist user, I want to bookmark a Local Document, so that it can appear in my Bookmarks as well as Local Documents.
13. As a user who renamed a Bookmark, I want that Bookmark title to remain independent of the Local Document title, so that saving the document does not overwrite my chosen label.
14. As a user who deletes a Local Document, I want its Bookmark removed too, so that the home page does not retain a known broken link.
15. As a user viewing a Local Document, I want an `Edit` action instead of `View source`, so that I can reach the application-owned source.
16. As a user following the Edit action, I want it to open the canonical editor route, so that source metadata has a meaningful URL.
17. As a user pasting a same-origin Local Document view URL into the home-page URL field, I want it recognized, so that I can reopen the saved document.
18. As a user pasting a same-origin Local Document edit URL into the home-page URL field, I want it canonicalized to the view route, so that URL opening remains consistent.
19. As a security-conscious user, I want lookalike Local Document URLs from other origins rejected, so that foreign URLs cannot address my browser-local data.
20. As a user creating a document, I want it initialized as `Untitled document` with empty Markdown, so that I can start editing immediately.
21. As a document author, I want to edit the title and Markdown content together, so that the document remains easy to identify while I write.
22. As a document author, I want blank titles rejected, so that every saved document has a useful list label.
23. As a document author, I want titles longer than 200 characters rejected, so that accidental pasted content does not become a title.
24. As a document author, I want title whitespace trimmed on save, so that insignificant surrounding spaces are not persisted.
25. As a document author, I want Markdown content preserved exactly, so that saving does not rewrite my source.
26. As a document author, I want saving to be explicit, so that typing alone never changes the stored document.
27. As a document author, I want the Save action disabled when the draft is clean or invalid, so that its availability communicates whether saving is possible.
28. As a document author, I want visible saving and error feedback, so that I know whether the write succeeded.
29. As a document author, I want a failed save to retain my draft, so that a storage error does not destroy my work.
30. As a keyboard user, I want `Ctrl+S` or `Cmd+S` to invoke document saving, so that I can use a familiar editor shortcut.
31. As a document author, I want `Browse` to open the saved version in a new tab without saving, so that I can compare stored output with my current draft.
32. As a document author, I want the current editor tab to remain open after using Browse, so that I can continue editing.
33. As a document author, I want a warning before internal navigation discards a dirty draft, so that I do not lose changes accidentally.
34. As a document author, I want a browser warning before reload or tab closure discards a dirty draft, so that browser controls do not silently lose work.
35. As a desktop user, I want the editor and preview side by side at equal width, so that I can write and inspect Markdown simultaneously.
36. As a desktop user, I want the editor and preview to scroll independently within the available viewport, so that long content does not move the whole page.
37. As a mobile user, I want a Preview toggle above the editing area, so that the textarea and preview can each use the full narrow screen.
38. As a mobile user, I want the Preview toggle to communicate its active state and return me to editing when pressed again, so that the mode is understandable and reversible.
39. As a document author, I want preview to reflect the current unsaved draft, so that I can inspect changes before saving.
40. As a document author, I want preview updates to remain responsive while typing, so that large drafts do not trigger expensive parsing on every keystroke.
41. As a document author, I want task checkboxes in preview to be visual only, so that previewing does not mutate Checklist State.
42. As a document author, I want unsafe Markdown content treated with the same security policy as Checklist rendering, so that local preview does not weaken application safety.
43. As a user of either theme, I want the Local Documents list, editor, and preview to support automatic light and dark themes, so that the feature matches the rest of Checkgist.
44. As a document owner, I want deletion to require confirmation, so that an accidental click cannot immediately destroy content.
45. As a document owner, I want canceling deletion to leave the document and draft untouched, so that the confirmation is safely reversible.
46. As a document owner, I want a failed deletion to leave me in the editor with an error, so that the UI does not claim data was removed when it was not.
47. As a user opening a stale or malformed editor URL, I want a clear `Local document not found.` state and a route home, so that missing data is not silently recreated.
48. As an existing Checkgist user, I want my Bookmarks to survive the database schema upgrade, so that adding Local Documents causes no data loss.
49. As a user storing local content, I want Checkgist to request persistent browser storage after successful creation, so that the browser is less likely to evict my documents.
50. As a user with a large Markdown document, I want saving attempted without an arbitrary application limit, so that the browser quota is the relevant constraint.
51. As a user editing the same document in multiple tabs, I accept last-write-wins saves, so that the first version does not add conflict-resolution UI.

## Implementation Decisions

- Keep `SourceService` as the shared loading abstraction. Add a Local Document Source Reference with discriminator `local-document` and a correspondingly explicit Local Document service name.
- Treat Local Document as a distinct domain entity that is adapted into a Loaded Source only for viewing.
- Use an immutable UUID generated by the browser as the Local Document ID.
- Persist each document with ID, title, Markdown content, creation timestamp, and last-updated timestamp.
- Store timestamps as sortable numeric values. Order Local Documents by last-updated descending with a deterministic ID tie-breaker.
- Require a trimmed, non-empty title with a maximum of 200 characters. Preserve Markdown content exactly and impose no separate content-size limit.
- Upgrade the existing Checkgist IndexedDB schema from version 1 to version 2 while preserving the Bookmark object store and existing records.
- Move database connection and schema lifecycle ownership into a shared database boundary used by Bookmark and Local Document persistence.
- Add a Local Documents object store keyed by document ID and an index over last-updated time.
- Use typed `idb` schema definitions and retain a test-only database close/reset seam.
- Handle schema version changes and stale connections so upgrades do not remain blocked unnecessarily.
- Never await unrelated asynchronous work during an active IndexedDB transaction.
- Use `/local/:documentId` as the view route and `/local/:documentId/edit` as the edit route.
- Keep the source metadata URL required. For a Local Document it points to the edit route.
- Validate UUID route parameters before database access.
- Accept same-origin absolute view and edit URLs in source addressing, canonicalizing them to the view route. Reject matching paths on other origins and respect the application's configured base URL.
- Register the edit route separately from generated Source Service view routes.
- Create and persist an `Untitled document` with empty content before navigating to its editor.
- Request persistent browser storage through the existing one-time best-effort mechanism only after successful creation.
- Expose a shared, lazily loaded Local Documents state with loading, ready, and error states plus create, save, delete, and refresh commands.
- Adapt a Local Document into a Loaded Source containing exactly one ready Source File. Use the title as its displayed file name without adding `.md`.
- Raise a source load error with `Local document not found.` when the referenced record does not exist.
- Render the Local Documents home section after Bookmarks and keep it visible even when empty.
- Keep Local Document rows simple view links. Do not add inline management controls or manual ordering.
- Use explicit draft state in the editor. Determine dirty state by comparing current title and content with the latest successfully saved values.
- Disable Save while clean, invalid, or saving. Display `Saving…` while the transaction is pending and preserve dirty state after errors.
- Make `Ctrl+S` and `Cmd+S` invoke the same save command and suppress the browser's Save Page behavior.
- Implement Browse as a button-styled router link that opens the view route in a new tab with opener protection. It never initiates saving.
- Protect dirty drafts with a router leave confirmation and the standard browser unload warning. Suppress warnings after a successful save or once confirmed deletion begins.
- Use a viewport-height flex editor layout. On desktop, divide the remaining width equally between independently scrolling editor and preview panes.
- On small screens, show one full-width pane at a time and use an accessible `Preview` pressed-state toggle to switch between draft and preview.
- Render preview from the unsaved draft after a 150 ms debounce. Ignore stale asynchronous parse results.
- Reuse the Checklist Markdown security policy and visual styling in preview, while keeping task items non-interactive and detached from Checklist State and URL changes.
- Use a native deletion confirmation with the agreed document-specific message.
- Delete the Local Document and its matching Bookmark in one read-write transaction. Normalize remaining Bookmark positions before commit and update UI caches only after the transaction succeeds.
- Keep Bookmark titles independent from Local Document titles; saving or renaming a document does not rename its Bookmark.
- Use last-write-wins semantics for saves from multiple editor tabs. Do not store revisions or show conflict UI.
- Show explicit create, load, save, preview, and delete errors without navigating away or clearing unsaved input.
- Show an editor-specific missing-document state rather than recreating a record for an invalid or stale URL.
- On the Checklist page, show Edit for Local Documents and retain View source unchanged for external Source Services. Preserve Bookmark, Copy link, Reset, Checklist State, and browser-title behavior.
- Add concise English comments around non-obvious migration, transaction, navigation-guard, and stale-preview invariants. Add TSDoc to external exports.

## Testing Decisions

- Tests should assert observable user or public-contract behavior rather than private reactive state, helper call order, CSS implementation details, or internal function structure.
- Use three agreed high-level seams: page components, the public persistence API, and the public source addressing/loading pipeline. Add lower-level seams only when a guarantee cannot be observed reliably through one of these three.
- Test Home, Editor, and Checklist pages through mounted component behavior. Cover visible states, accessible control semantics, navigation targets, draft preservation, save availability and feedback, Browse behavior, preview switching, keyboard saving, navigation protection, deletion outcomes, and source-action differences.
- Follow the existing Home page and Checklist page component-test style for router mocks, user events, and observable rendered output.
- Test Local Document persistence through its public database commands using fake-indexeddb. Cover creation, exact content storage, validation boundaries, timestamp ordering, last-write-wins, missing records, failed transactions, and atomic document-plus-Bookmark deletion with dense Bookmark positions.
- Add a schema-upgrade test that creates a version-1 database with Bookmark records, opens it through the version-2 boundary, and verifies those records remain intact alongside the new Local Documents store.
- Follow the existing Bookmark database tests as prior art for fake-indexeddb isolation and public persistence assertions.
- Test local URL parsing and canonical route generation through the public source addressing API. Cover view URLs, edit URLs, configured base paths, malformed UUIDs, and foreign-origin rejection.
- Test Local Document Checklist loading through the public loading pipeline rather than calling adaptation helpers directly. Cover successful Loaded Source construction, one-file naming and metadata, missing records, and preservation of existing external Source Service behavior.
- Follow the existing source addressing and checklist loading suites as prior art for catalog and registry substitution.
- Use fake timers for the 150 ms preview debounce. Assert that the latest draft wins when parse promises resolve out of order and that task-item interaction does not mutate URL or Checklist State.
- Test route-leave behavior through the router guard contract and browser unload behavior through dispatched events, while avoiding assertions on private guard implementation.
- Retain regression coverage for Bookmark operations, GitHub Gist loading, and Pastebin loading after database and source-type changes.
- Run the repository's typecheck, agent lint, and agent test commands, followed by the combined final verification command. Never start a development server or deploy as part of verification.

## Out of Scope

- Import, export, backup, restore, or file-system integration for Local Documents.
- Cloud storage, account-based synchronization, cross-device access, or collaboration.
- Cross-tab live updates, locking, revisions, merge resolution, or stale-write warnings.
- Autosave or implicit saving from Browse, navigation, preview, or Checklist viewing.
- Rich-text editing, syntax highlighting, editor extensions, or custom textarea keyboard behavior beyond Save.
- Multiple Source Files inside one Local Document.
- Inline rename, deletion, undo, or drag-and-drop ordering in the home Local Documents list.
- Custom modal infrastructure for deletion or dirty-navigation confirmation.
- An application-defined Markdown content-size limit.
- Making a copied local URL portable to another browser profile where the IndexedDB record does not exist.

## Further Notes

- The agreed domain vocabulary and invariants are recorded in the project glossary.
- No ADR is required. The shared IndexedDB schema and Local Document source adapter are visible, direct implementation choices and do not satisfy all three ADR criteria of being hard to reverse, surprising, and the result of a significant trade-off.
- The detailed ordered implementation plan is retained beside this PRD.
- The specification is fully resolved and ready for agent implementation without another product interview.

Suggested commit: Add local Markdown document support
