# Loaded source page shell

Status: ready-for-agent

## Parent

`.scratch/v1/PRD.md`

## What to build

Build the loaded source page shell around a Checklist Session. The page gives users navigation and source context, renders source files and file-level errors, formats the browser title, and keeps the UI readable in system light and dark themes.

## Acceptance criteria

- [ ] Loaded source page shows a Home control that navigates to `/checkgist/`.
- [ ] Loaded source page shows a `View source` external link using Source Metadata URL.
- [ ] Source Metadata title is used for browser title formatting and is not shown as a visible page heading.
- [ ] Long browser titles are truncated and suffixed with ` - Checkgist`.
- [ ] Source Metadata description is shown as ordinary plain text when present.
- [ ] Empty Source Metadata description is not rendered.
- [ ] Ready Source Files render in Source Service order.
- [ ] Each ready Source File shows its Source File name and rendered Markdown content.
- [ ] Pastebin's single Source File is named by the paste ID.
- [ ] Error Source Files show file name and inline error without hiding other files.
- [ ] If no Task Items exist across ready files, the page shows `No task items found in this source.` while keeping Markdown visible.
- [ ] Markdown links open in a new browser tab and do not replace the Checklist Session page.
- [ ] The page follows system light/dark theme without a manual toggle.
- [ ] Long source descriptions, long file names, and narrow screens do not break the layout.
