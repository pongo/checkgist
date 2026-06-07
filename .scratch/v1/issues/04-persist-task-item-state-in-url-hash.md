# Persist Task Item State in URL hash

Status: ready-for-agent

## Parent

`.scratch/v1/PRD.md`

## What to build

Implement Task Item State encoding, decoding, and synchronization with the browser hash. A Checklist Session can apply initial hash state, update task state from file-local task changes, and keep the current URL hash in sync without polluting browser history.

## Acceptance criteria

- [ ] `1` decodes as checked and `0` decodes as unchecked.
- [ ] Missing hash, empty hash, or invalid hash characters result in all Task Items unchecked.
- [ ] Missing positions in a valid hash are treated as unchecked.
- [ ] Extra positions in a valid hash are ignored.
- [ ] Ready Checklist Files receive decoded bits in current file order.
- [ ] Error Checklist Files consume no bits during decode.
- [ ] Encoding concatenates fixed-length local bit strings for ready Checklist Files in current file order.
- [ ] Error Checklist Files contribute no bits during encode.
- [ ] Only the final global encoded bit string trims trailing zeroes.
- [ ] File-local task updates can set checked state without exposing global task ranges to UI code.
- [ ] Checkbox state changes update `window.location.hash` through history replacement rather than adding a new history entry per change.
- [ ] Browser hash changes re-apply Task Item State to the current Checklist Session.
- [ ] If the Source Reference changes, the new source loads and then applies that route's hash.
