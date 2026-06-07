# Reset and checklist controls

Status: ready-for-agent

## Parent

`.scratch/v1/PRD.md`

## What to build

Add user-facing reset behavior for Checklist Sessions. Users can reset one Source File or reset all Task Item State for the current Source Reference, and the URL hash updates while preserving the current route.

## Acceptance criteria

- [ ] Each ready Source File has a visible per-file Reset control.
- [ ] Per-file Reset clears only that file's local checked state.
- [ ] Per-file Reset preserves checked state in other ready files.
- [ ] Reset all clears checked state for all ready files in the current Checklist Session.
- [ ] Reset controls preserve the current Source Reference route.
- [ ] Reset controls update the URL hash through history replacement.
- [ ] Reset behavior preserves the global trailing-zero trimming rule.
- [ ] Reset controls do not fail when error files are present.
- [ ] Reset behavior is covered by core tests and component-level behavior tests.
