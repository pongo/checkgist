# Copy current Checklist Session link

Status: ready-for-agent

## Parent

`.scratch/v1/PRD.md`

## What to build

Add a Copy link control to the loaded source page. The control copies the current Checklist Session URL, including Source Reference and Task Item State hash, and gives clear success or failure feedback.

## Acceptance criteria

- [ ] Loaded source page shows a `Copy link` control.
- [ ] Clicking Copy link attempts to copy the current `window.location.href`.
- [ ] The copied URL includes the current Source Reference route.
- [ ] The copied URL includes the current Task Item State hash when non-empty.
- [ ] Successful copy shows short success feedback.
- [ ] Clipboard failure shows a visible error state.
- [ ] Copy feedback does not alter Task Item State.
- [ ] Copy behavior is covered by component tests with mocked clipboard success and failure.
