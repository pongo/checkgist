# Checkgist v1 PRD

Status: ready-for-agent

## Problem Statement

Users can already write simple checklists as Markdown task lists in external services such as GitHub Gist and Pastebin, but those checklists are static text. To use them interactively, users need to copy the content into another app, create an account, or rely on a backend that owns their checklist state.

Checkgist should let a user paste a supported Source URL, render the loaded Source Content as Markdown, interact with Task Items directly in the browser, and keep the current Task Item State in the URL hash so the page can be refreshed, revisited, or copied without server-side persistence.

## Solution

Build a client-only Vue application that loads Source Content from supported Source Services, renders each Source File as Markdown with Comark, replaces Markdown task-list checkboxes with Checkgist-owned interactive controls, and stores Task Item State as a compact positional bit string in the browser hash.

The first version supports GitHub Gist and Pastebin. GitHub Gist sources may contain multiple Source Files and all files are attempted as Markdown in the order returned by the GitHub API. Pastebin sources are treated as a single Source File. The app follows the system light/dark theme, uses English UI copy, and does not require a dev server, deploy action, account, backend, or database for the core user flow.

## User Stories

1. As a checklist user, I want to paste a GitHub Gist URL, so that I can open a Markdown checklist without copying its contents manually.
2. As a checklist user, I want to paste a Pastebin URL, so that I can use a paste as an interactive checklist.
3. As a checklist user, I want protocol-less supported URLs to work, so that I can paste common browser address-bar text without editing it.
4. As a checklist user, I want unsupported Source URLs to show an inline error, so that I know the app did not understand my input.
5. As a checklist user, I want pressing Enter in the input to open the source, so that the app is fast to use from the keyboard.
6. As a checklist user, I want the app to navigate to a canonical Source Reference route after submitting a Source URL, so that the browser URL is clean and reusable.
7. As a checklist user, I want opening a Source Reference URL directly to load the source automatically, so that saved links work without extra confirmation.
8. As a checklist user, I want GitHub Gist owner names to be ignored in the canonical route, so that the route is based on the gist identity needed for loading.
9. As a checklist user, I want Pastebin raw URLs and normal Pastebin URLs to resolve to the same source, so that either copied form works.
10. As a checklist user, I want each GitHub Gist file to render as Markdown, so that multi-file gists become usable in one page.
11. As a checklist user, I want GitHub Gist files to appear in the Source Service order, so that the app reflects the source instead of inventing a separate ordering.
12. As a checklist user, I want a Pastebin source to render as one file named by its paste ID, so that the file has a clear identity.
13. As a checklist user, I want normal Markdown content to remain visible even when it has no Task Items, so that Checkgist can still be used to inspect source content.
14. As a checklist user, I want a notice when the loaded source has no Task Items, so that I understand why there are no interactive checkboxes.
15. As a checklist user, I want every Markdown Task Item to start unchecked unless the URL hash says otherwise, so that source `[x]` markers do not become Checkgist state.
16. As a checklist user, I want checking a Task Item to update the URL hash, so that refresh keeps my current state.
17. As a checklist user, I want unchecking a Task Item to update the URL hash, so that the URL always reflects current state.
18. As a checklist user, I want trailing unchecked Task Items to be omitted from the hash, so that state URLs stay compact.
19. As a checklist user, I want missing hash positions to be treated as unchecked, so that short hashes remain valid.
20. As a checklist user, I want extra hash positions to be ignored, so that old or edited URLs do not break rendering.
21. As a checklist user, I want invalid hash characters to fall back to all unchecked, so that a bad hash does not block source loading.
22. As a checklist user, I want Task Item State to be positional and best-effort, so that the model stays simple even when source content changes.
23. As a checklist user, I want one reset control per Source File, so that I can clear part of a multi-file checklist without losing other progress.
24. As a checklist user, I want a Reset all control for the current Source Reference, so that I can clear the entire checklist state quickly.
25. As a checklist user, I want reset actions to preserve the current Source Reference route, so that clearing progress does not navigate away from the source.
26. As a checklist user, I want checkbox and reset changes to replace the current history entry, so that the browser Back button is not polluted by every Task Item change.
27. As a checklist user, I want browser Back and Forward hash changes to re-apply Task Item State, so that browser navigation remains coherent.
28. As a checklist user, I want a Home button, so that I can return to the Source URL input when I want to open another source.
29. As a checklist user, I want a View source link, so that I can open the original GitHub Gist or Pastebin page.
30. As a checklist user, I want Markdown links to open in a new tab, so that I do not lose my current Checklist Session.
31. As a checklist user, I want a Copy link button, so that I can copy the current Checklist Session URL without selecting the address bar.
32. As a checklist user, I want Copy link success feedback, so that I know the current URL was copied.
33. As a checklist user, I want Copy link errors to be visible, so that I know when the clipboard action failed.
34. As a checklist user, I want GitHub Gist descriptions to appear as ordinary text when present, so that source context is visible without becoming a page heading.
35. As a checklist user, I want empty GitHub Gist descriptions to show nothing, so that the UI does not invent noisy fallback copy.
36. As a checklist user, I want the browser tab title to use the Source Metadata title, so that open tabs are identifiable.
37. As a checklist user, I want long browser tab titles to be shortened, so that extreme source titles do not create unwieldy tab names.
38. As a checklist user, I want unsafe embedded HTML to be sanitized, so that external Markdown cannot execute arbitrary scripts in Checkgist.
39. As a checklist user, I want `http`, `https`, and `mailto` Markdown links to work, so that common Markdown references remain usable.
40. As a checklist user, I want Markdown images over `http` and `https` to render, so that image-based Markdown content remains useful.
41. As a checklist user, I want `data:` images to be blocked, so that the app avoids unnecessary unsafe image behavior.
42. As a checklist user, I want a source-level error when a supported source cannot be loaded at all, so that I can recover by going Home or retrying.
43. As a checklist user, I want a file-level error when only one Source File fails, so that other files in the same source can still be used.
44. As a checklist user, I want GitHub truncated files to load full content from their raw URLs, so that large gist files are not silently incomplete.
45. As a checklist user, I want failed GitHub raw file loads to affect only that file, so that a partial gist remains useful.
46. As a checklist user, I want quick source changes not to show stale content from an older request, so that the page reflects my latest navigation.
47. As a checklist user, I want the app to follow my system light or dark theme automatically, so that it fits my environment without manual setup.
48. As a checklist user, I want the UI to remain readable with long file names and descriptions, so that real-world source content does not break the layout.
49. As a checklist user, I want the Home screen to be a direct input tool rather than a marketing page, so that I can start using the app immediately.
50. As a maintainer, I want Source Services to be isolated behind a registry, so that adding another supported service does not rewrite the application.
51. As a maintainer, I want Source Services to own their typed Source References, so that service-specific normalization stays near the service.
52. As a maintainer, I want Source Services to return Source Content rather than parsed checklist state, so that loading and Markdown/session building remain separate.
53. As a maintainer, I want task state encoding to be pure and framework-free, so that it can be tested without Vue.
54. As a maintainer, I want Checklist Session commands to use file-local task indexes, so that UI code does not need global Task Item ranges.
55. As a maintainer, I want automated tests to mock network calls, so that tests are deterministic and do not depend on GitHub or Pastebin availability.

## Implementation Decisions

- Build the app as a client-only Vue application using Vue Router, Tailwind CSS, ofetch, Comark, and the existing Vite setup.
- Use the glossary in `CONTEXT.md`; prefer Source Content, Source File, Source Service, Source Reference, Checklist Session, Task Item, and Task Item State.
- Keep Source Content as raw loaded data. Source Services do not parse Markdown and do not own interactive checkbox state.
- Represent Source Files as ready-or-error values so GitHub Gist can preserve partial success when an individual file cannot be fully loaded.
- Build a Checklist Session from Source Content by parsing Markdown, applying Comark security/task-list plugins, transforming Task Items into Checkgist-owned controls, and applying the initial hash state.
- Do not store separate Task Item objects. Task Items are rendered positions in Markdown; each ready Checklist File owns a local checked array.
- Use plain data models and pure core functions rather than domain classes. Vue composables expose user-facing commands around those pure functions.
- Commands operate by file ID and local task index, never by UI-visible global task ranges.
- Each Source Service owns its typed Source Reference, URL parsing, route parsing, route formatting, and loading behavior.
- Use a map-based registry keyed by reference type, with deterministic first-match URL and route resolution.
- Accept full URLs with `http://` or `https://`, plus protocol-less host URLs. Reject bare IDs because they are ambiguous.
- Use `/checkgist/` as Home and `/checkgist/gist.github.com/:gistId` and `/checkgist/pastebin.com/:pasteId` as canonical browser routes.
- If Vite uses `base: "/checkgist/"`, keep Vue Router route definitions relative to that base.
- On Home submit, normalize the Source URL, navigate immediately to the canonical Source Reference route, and load from the route.
- Opening a Source Reference route directly automatically loads the source and applies the hash.
- Store Task Item State as one positional bit string in `window.location.hash`.
- Ignore source Markdown `[x]` and `[X]` checked markers. Checkgist state starts unchecked unless the hash says otherwise.
- Treat invalid hash state as all unchecked and normalize it on the next user change.
- Encode per-file checked state in Source Service file order, concatenate ready files, ignore error files, and trim only trailing zeroes from the global bit string.
- Decode hash state into ready files in current file order. Missing bits are unchecked; extra bits are ignored.
- Use `history.replaceState` for checkbox changes and reset actions.
- Listen to browser hash changes and re-apply Task Item State to the current Checklist Session.
- Use request tokens and `AbortController` so slow previous loads cannot overwrite newer navigation.
- GitHub Gist normalization accepts gist page URLs with optional owner; canonical Source Reference stores only gist ID.
- GitHub Gist loading uses the REST Gist endpoint, stores gist ID as Source Metadata title, stores non-empty description as Source Metadata description, uses `html_url` for the View source URL, preserves API file order, and fetches `raw_url` for truncated files.
- Pastebin normalization accepts normal and raw Pastebin URLs; canonical Source Reference stores paste ID.
- Pastebin loading fetches the raw URL, uses paste ID as Source Metadata title, and returns one ready Source File named by the paste ID.
- Use Comark security with blocked script-like and document-mutating tags, allowed protocols `http`, `https`, and `mailto`, and `data:` images disabled.
- Markdown links from external content open in a new tab with `noopener noreferrer`.
- Markdown images over `http` and `https` are allowed.
- Do not add explicit source size limits in v1.
- Home UI is a direct working form with product name `Checkgist`, placeholder `Paste a GitHub Gist or supported source URL`, helper text `Supports GitHub Gist and Pastebin.`, and submit button `Open`.
- Loaded source UI has Home, View source, Copy link, and Reset all controls.
- Source Metadata title is for browser title formatting, not for a visible page heading.
- Source Metadata description is displayed as ordinary plain text when present.
- Each ready Source File shows its file name, rendered Markdown, and per-file Reset.
- Source-level, input-level, and file-level errors are separate states.
- If no Task Items exist, render Markdown and show `No task items found in this source.`
- The app follows system light/dark theme only in v1. No manual theme toggle is included.

## Testing Decisions

- Tests should focus on externally observable behavior and stable domain boundaries, not internal implementation details.
- Source Service tests cover URL normalization, route conversion, response mapping, load success, load failure, GitHub truncated-file raw fetch, GitHub no-files behavior, and Pastebin raw loading.
- Registry tests cover deterministic first-match behavior and unsupported URL/path handling.
- Task Item State tests cover encode, decode, invalid hash, missing bits, extra bits, trailing zero trimming, per-file reset, reset-all, file-local task updates, and error files contributing no bits.
- Checklist Session builder tests cover parsing Source Files, converting Source File errors, converting parse/render-prep errors, ignoring source `[x]` checked markers, applying initial hash state, and detecting no-task-item sessions.
- Markdown/security tests cover blocked unsafe tags and attributes, allowed protocols, blocked `data:` images, and link target/rel transformation.
- Browser title formatter tests cover normal and long Source Metadata titles.
- Vue/component tests cover Home submit, unsupported input error, route auto-load, loaded source rendering, description display, View source link, Copy link success/failure, checkbox toggles updating hash through replace behavior, per-file Reset, Reset all, source-level errors, file-level errors, and no-task-items notice.
- Loading race tests cover aborting or ignoring stale source loads when navigation changes quickly.
- Network behavior should be tested with mocked `ofetch` and fixtures. Automated tests must not call real GitHub or Pastebin.
- Use existing project verification commands: `npm run typecheck`, `npm run agent:test`, and `npm run agent:lint`.
- Do not run a dev server as part of implementation or verification.

## Out of Scope

- Server-side persistence, accounts, databases, and user profiles.
- A required backend or CORS proxy in v1.
- Manual light/dark/system theme selection.
- Editing or saving Markdown back to GitHub Gist, Pastebin, or any other service.
- Creating new gists or pastes.
- Supporting arbitrary raw URLs without a Source Service.
- Supporting bare source IDs without a service host.
- Stable Task Item identity across source edits. State is positional and best-effort.
- Rendering source Markdown `[x]` as initial checked state.
- Explicit source size limits.
- Calling real external services from automated tests.
- Deploying or starting a dev server.

## Further Notes

- Pastebin and GitHub currently work as direct browser fetch targets for the intended flow, but that can change. A CORS proxy is not part of v1, but it remains a possible future response if direct browser loading stops working.
- GitHub API file order is intentionally used as returned. This keeps Checkgist aligned with the Source Service but means positional Task Item State inherits any ordering/content changes from the source.
- Comark task-list AST details must be verified during implementation before finalizing the exact task-control transform.
- The detailed implementation plan remains in `implementation-plan.md` in the same feature directory.
