# 02 — Create, edit, and discover Local Documents

**What to build:** Let a user create an application-owned Markdown document from the always-visible Local Documents section, persist it before navigation, edit and explicitly save its title and content, and find it again in most-recently-saved order. The slice includes durable schema migration, visible failure states, and the complete basic create-to-save workflow without preview or Checklist viewing.

**Blocked by:** 01 — Centralize the Checkgist database lifecycle.

**Status:** ready-for-agent

- [ ] Opening the upgraded database preserves all version-1 Bookmark records and adds Local Document storage without rewriting those records.
- [ ] The home page always shows `Local documents`, a `New document` action, and `No local documents yet.` when empty.
- [ ] Selecting `New document` generates an immutable UUID, persists `Untitled document` with empty content, and only then navigates to its edit route.
- [ ] A failed creation remains on the home page, shows an inline error, and does not navigate to a nonexistent document.
- [ ] Successful first creation invokes the existing one-time best-effort persistent-storage request.
- [ ] Local Documents are listed by last successful save descending with deterministic ordering for timestamp ties.
- [ ] Selecting a Local Document row opens its view route; rows have no inline management controls or drag behavior.
- [ ] The editor loads the stored title and exact Markdown content for a valid UUID.
- [ ] Save trims the title, rejects an empty title or one longer than 200 characters, preserves content exactly, and updates the last-saved timestamp.
- [ ] Save is disabled while the draft is clean, invalid, or already saving; pending and failed saves have visible states and a failed save retains the draft.
- [ ] Saves use last-write-wins semantics and do not introduce revisions or conflict UI.
- [ ] An invalid UUID or missing record shows `Local document not found.` with `Back to home` and never recreates a document.
- [ ] Public persistence tests cover creation, exact content, validation boundaries, ordering, missing records, failed writes, and the version-1-to-version-2 migration.
