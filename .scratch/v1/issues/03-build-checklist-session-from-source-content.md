# Build Checklist Session from Source Content

Status: ready-for-agent

## Parent

`.scratch/v1/PRD.md`

## What to build

Build the session layer that turns loaded Source Content into a Checklist Session. Ready Source Files are parsed and sanitized with Comark, Task Items become Checkgist-owned interactive positions, and Source File errors or parse/render-prep failures become Checklist File errors.

This slice should make loaded Markdown visible and establish the data needed for later URL hash state behavior.

## Acceptance criteria

- [ ] Source Services remain responsible only for loading Source Content; they do not parse Markdown or own Task Item State.
- [ ] Ready Source Files are parsed with Comark.
- [ ] Comark task-list support is enabled so Markdown task-list syntax can be found/rendered.
- [ ] Comark security is enabled with blocked unsafe tags, allowed protocols `http`, `https`, and `mailto`, and `data:` images disabled.
- [ ] Markdown links from external content are transformed to open in a new tab with `noopener noreferrer`.
- [ ] Markdown images over `http` and `https` remain allowed.
- [ ] Source File errors become Checklist File errors.
- [ ] Parse or render-prep failures for one file become Checklist File errors without hiding other files.
- [ ] Ready Checklist Files store local checked state for rendered Task Item positions.
- [ ] Source Markdown `[x]` and `[X]` markers do not initialize checked state.
- [ ] All Task Items start unchecked when no valid hash state is applied.
- [ ] Markdown content with no Task Items still renders successfully.
- [ ] The session can report when no ready files contain any Task Items so the UI can show the no-task-items notice.
