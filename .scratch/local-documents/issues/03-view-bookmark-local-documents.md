# 03 — View and bookmark Local Documents as Checklists

**What to build:** Make a saved Local Document behave like any other Checkgist source when viewed: it loads through the shared Source Service and Checklist pipeline, supports Checklist actions and Bookmarks, and links back to its editor. Same-origin Local Document URLs become valid home-page source input while foreign lookalike URLs remain unsupported.

**Blocked by:** 02 — Create, edit, and discover Local Documents.

**Status:** ready-for-agent

- [ ] A Local Document Source Reference uses the `local-document` discriminator and the stable document UUID.
- [ ] The view route loads the saved record through the existing source loading lifecycle as one ready Source File.
- [ ] The Loaded Source title and Source File name equal the Local Document title without adding `.md`.
- [ ] Local source metadata points to the document edit route.
- [ ] A missing stored document produces the user-facing source error `Local document not found.`.
- [ ] The Local Document Checklist retains Bookmark, Copy link, Reset, URL-based Checklist State, loading, error, and browser-title behavior.
- [ ] Local Document views show `Edit` linked to the editor instead of `View source`.
- [ ] GitHub Gist and Pastebin views retain their existing `View source` behavior.
- [ ] A Bookmark can target the Local Document view route, and later document renames do not overwrite the Bookmark's user-managed title.
- [ ] Same-origin absolute view and edit URLs are recognized and canonicalized to the Local Document view route, including configured application base paths.
- [ ] Matching paths on another origin and malformed UUIDs are rejected by source addressing.
- [ ] Page and public loading-pipeline tests cover the local workflow and preserve regression coverage for existing Source Services.
