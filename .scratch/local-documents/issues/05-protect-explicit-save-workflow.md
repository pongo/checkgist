# 05 — Protect the explicit-save workflow

**What to build:** Make explicit saving reliable and hard to bypass accidentally. Authors can inspect the stored Checklist in another tab, save with the keyboard, and receive a warning before dirty work is discarded, while browsing and navigation never trigger implicit persistence.

**Blocked by:** 02 — Create, edit, and discover Local Documents; 03 — View and bookmark Local Documents as Checklists.

**Status:** ready-for-agent

- [ ] `Browse` is a button-styled link to the view route that opens in a new tab with opener protection.
- [ ] Browse never saves the draft and the original editor tab remains open.
- [ ] The Browse tab displays the last successfully saved document even when the editor contains newer unsaved text.
- [ ] `Ctrl+S` and `Cmd+S` prevent the browser Save Page action and invoke the same validation and save command as the Save button.
- [ ] Dirty state compares the current title and content with the latest successful save baseline.
- [ ] Internal navigation away from a dirty editor requests native confirmation before discarding changes.
- [ ] Reloading or closing a dirty editor activates the standard browser unload warning.
- [ ] Clean editors do not warn, and a successful save clears the dirty state and warning registration.
- [ ] Failed saves retain dirty state, draft input, and navigation protection.
- [ ] Tests assert link semantics, absence of autosave, keyboard saving, route-leave decisions, and unload behavior through public page and browser event contracts.
