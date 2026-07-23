# 06 — Delete Local Documents safely

**What to build:** Let an author permanently remove a Local Document without accidental loss or dangling local Bookmarks. Confirmation, database changes, cache updates, and navigation must agree: either the entire deletion commits and the user returns home, or the document and draft remain available with an error.

**Blocked by:** 03 — View and bookmark Local Documents as Checklists; 05 — Protect the explicit-save workflow.

**Status:** ready-for-agent

- [ ] Delete shows the native confirmation `Delete “{title}”? This cannot be undone.` using the current draft title.
- [ ] Canceling confirmation leaves the stored document, Bookmark, editor draft, and route unchanged.
- [ ] Confirmed deletion removes the Local Document and a matching Bookmark in one committed read-write transaction.
- [ ] Deleting an unbookmarked Local Document succeeds without requiring a Bookmark record.
- [ ] When a Bookmark is removed, all remaining Bookmark positions are normalized densely within the same transaction.
- [ ] Local Document and Bookmark UI caches update only after the transaction commits.
- [ ] A successful deletion bypasses dirty-navigation warnings and navigates to the home page.
- [ ] A failed deletion remains in the editor, preserves the draft and stored data, and displays an inline error.
- [ ] A deleted document subsequently produces the agreed not-found state from both view and edit routes.
- [ ] Public persistence and page tests cover confirmed, canceled, unbookmarked, bookmarked, and failed deletion paths.
- [ ] The repository typecheck, agent lint, agent test, and combined final verification commands pass without starting a development server, deploying, or committing.
