# End-to-end polish and verification

Status: ready-for-agent

## Parent

`.scratch/v1/PRD.md`

## What to build

Finish the v1 feature by tightening cross-slice integration, filling behavior gaps, and running the approved verification commands. This issue should not introduce major new product behavior; it should make the existing slices coherent and ready for handoff.

## Acceptance criteria

- [ ] Home, source loading, Checklist Session building, hash persistence, reset controls, loaded page shell, Copy link, and race handling work together in one flow.
- [ ] Component tests cover the primary GitHub Gist flow from normalized route through rendered files and checkbox hash updates.
- [ ] Component tests cover the primary Pastebin flow from normalized route through rendered file and checkbox hash updates.
- [ ] Integration tests cover source-level error, file-level error, no-task-items notice, invalid hash, and copy failure.
- [ ] UI copy is English and matches the PRD.
- [ ] The app follows system light/dark theme and remains readable in both.
- [ ] No dev server is started for verification.
- [ ] `npm run typecheck` passes.
- [ ] `npm run agent:test` passes.
- [ ] `npm run agent:lint` passes.
- [ ] Any residual risks or intentionally deferred behavior are documented in the issue comments or implementation notes.

## Implementation notes

- Component coverage now exercises primary Pastebin and GitHub Gist loaded-source flows from canonical route through rendered Markdown files and checkbox hash persistence.
- Integration coverage includes source-level errors, file-level errors, no-task-items notice, invalid hash normalization on the next checkbox change, copy failure feedback, and race-safe stale load handling.
- No dev server or deploy command was used for verification.
- Residual v1 risks remain the PRD risks: direct browser fetch behavior for GitHub/Pastebin can change, and Task Item State is positional and best-effort if source content changes.
