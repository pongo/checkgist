# Checkgist v1 Implementation Plan

## Goal

Build Checkgist as a client-only web application for loading Markdown-like text from supported external source services, rendering it with interactive task-list checkboxes, and storing the current task state in the page URL hash.

The v1 supported Source Services are GitHub Gist and Pastebin. The application UI is in English, uses Vue, Vue Router, Tailwind CSS, ofetch, and Comark, and follows the system light/dark theme automatically.

## Domain Model

Use the vocabulary from `CONTEXT.md`.

Core source data:

```ts
type SourceContent = {
  reference: SourceReference;
  metadata: SourceMetadata;
  files: SourceFile[];
};

type SourceMetadata = {
  title: string;
  description?: string;
  url: string;
};

type SourceFile = SourceTextFile | SourceFileError;

type SourceTextFile = {
  status: "ready";
  id: SourceFileId;
  name: string;
  content: MarkdownContent;
};

type SourceFileError = {
  status: "error";
  id: SourceFileId;
  name: string;
  error: LoadError;
};
```

Interactive checklist state:

```ts
type ChecklistSession = {
  source: SourceContent;
  files: ChecklistFile[];
};

type ChecklistFile = ChecklistReadyFile | ChecklistErrorFile;

type ChecklistReadyFile = {
  status: "ready";
  id: SourceFileId;
  sourceFile: SourceTextFile;
  tree: ComarkTree;
  checked: boolean[];
};

type ChecklistErrorFile = {
  status: "error";
  id: SourceFileId;
  sourceFile: SourceFile;
  error: ChecklistFileError;
};
```

Do not store separate `TaskItem` objects. Task Items are rendered positions in Markdown. `ChecklistReadyFile.checked` stores runtime state for those positions.

Use plain data models and pure core functions. Do not implement core domain objects as classes. Vue composables may expose convenient commands such as `resetFile(fileId)`, `resetAll()`, and `setTaskChecked(fileId, localTaskIndex, checked)`.

## Source Service Contract

Each Source Service owns its typed Source Reference.

```ts
type SourceService<TReference extends SourceReference> = {
  type: TReference["type"];
  fromUrl(url: URL): TReference | null;
  fromRoute(path: string[]): TReference | null;
  toRoute(reference: TReference): string[];
  load(
    reference: TReference,
    options?: { signal?: AbortSignal },
  ): Promise<SourceContent>;
};
```

Use a map-based registry keyed by reference type. Registry URL/path resolution uses deterministic first match.

Source URL input accepts full `http://` and `https://` URLs, and protocol-less host URLs by prepending `https://`. Bare IDs such as `HdpnureE` are invalid.

### GitHub Gist

Accepted input:

- `https://gist.github.com/:owner/:gistId`
- `https://gist.github.com/:gistId`
- protocol-less equivalents
- trailing slash allowed
- query and hash ignored

Canonical route:

```text
/checkgist/gist.github.com/:gistId
```

Reference:

```ts
type GitHubGistReference = {
  type: "github-gist";
  gistId: string;
};
```

Loading:

- Fetch `https://api.github.com/gists/:gistId`.
- `metadata.title = gistId`.
- `metadata.description = response.description.trim()` when non-empty.
- `metadata.url = response.html_url`, with fallback `https://gist.github.com/:gistId`.
- Files are taken in the order returned by the GitHub API object values. Do not sort.
- Each file becomes a `SourceTextFile` with `id = filename`, `name = filename`.
- If `file.truncated === true`, fetch full text from `file.raw_url`.
- If raw fetch for a truncated file fails, create `SourceFileError` for that file.
- If the Gist API request itself fails, surface a source-level load error.
- If the response has no files, surface source-level load error: `No files found in this gist.`

### Pastebin

Accepted input:

- `https://pastebin.com/:pasteId`
- `https://pastebin.com/raw/:pasteId`
- protocol-less equivalents
- trailing slash allowed
- query and hash ignored

Canonical route:

```text
/checkgist/pastebin.com/:pasteId
```

Reference:

```ts
type PastebinReference = {
  type: "pastebin";
  pasteId: string;
};
```

Loading:

- Fetch raw text from `https://pastebin.com/raw/:pasteId`.
- `metadata.title = pasteId`.
- `metadata.url = https://pastebin.com/:pasteId`.
- No description.
- Create one `SourceTextFile` with `id = pasteId`, `name = pasteId`, `content = rawText`.
- If raw fetch fails, surface a source-level load error.

## Routing And URL State

The full browser routes are:

```text
/checkgist/
/checkgist/gist.github.com/:gistId#101
/checkgist/pastebin.com/:pasteId#101
```

If Vite is configured with `base: "/checkgist/"`, Vue Router routes can be:

```text
/
/gist.github.com/:gistId
/pastebin.com/:pasteId
```

Home (`/checkgist/`) shows the Source URL input.

Opening a route with a Source Reference automatically loads the source. Submitting a Source URL first normalizes it, immediately navigates to the canonical Source Reference route, and then loads from the route. This keeps direct-open and submit flows identical.

Task Item State is encoded as one global positional bit string in `window.location.hash`.

Rules:

- `1` means checked.
- `0` means unchecked.
- No hash or empty hash means all unchecked.
- Markdown `[x]` and `[X]` are ignored; all checkboxes start unchecked unless hash state marks them checked.
- Any non-`0`/`1` character makes the hash invalid. Invalid hash is treated as all unchecked and is normalized on the next user change.
- Hash state is applied best-effort to current source content.
- Missing bits are unchecked.
- Extra bits are ignored.
- Trailing unchecked positions may be omitted.

Encoding:

- Each ready `ChecklistFile` contributes a fixed-length local bit string from `checked`.
- Error files contribute no bits.
- `ChecklistSession` concatenates file bit strings in current file order.
- Only the final global bit string trims trailing zeroes.

Decoding:

- Apply bits to ready files in current file order.
- Error files consume no bits.

State updates:

- Checkbox changes, per-file resets, and reset-all use `history.replaceState` to update the current hash without adding browser history entries.
- Browser Back/Forward or manual hash changes re-apply decoded hash to the current `ChecklistSession`.
- If Source Reference changes, load the new source and then apply that route's hash.

## Checklist Commands

Commands operate on file-local task indexes.

```ts
setTaskChecked(session, fileId, localTaskIndex, checked)
resetFile(session, fileId)
resetAll(session)
encodeSessionState(session)
applySessionState(session, bits)
```

`resetFile` clears only the selected file's local `checked` values. `resetAll` clears all ready files. Both preserve the current Source Reference route.

## Markdown And Security

Source Services return raw `SourceContent`. `buildChecklistSession(source, initialStateBits)` owns Markdown parsing, sanitizing, task extraction, and converting `SourceFileError` or parse failures into `ChecklistErrorFile`.

Use Comark for parsing/rendering with:

- `comark/plugins/task-list`
- `comark/plugins/security`
- custom task item rendering owned by Checkgist

Security config:

```ts
security({
  blockedTags: ["script", "iframe", "object", "embed", "link", "style", "base", "meta"],
  allowedProtocols: ["http", "https", "mailto"],
  allowDataImages: false,
})
```

Markdown images over `http` and `https` are allowed. `data:` images are blocked.

Links from external Markdown should open in a new tab with:

```html
target="_blank"
rel="noopener noreferrer"
```

Checkgist renders Markdown content, not arbitrary embedded HTML.

If a file cannot be loaded or rendered, show an inline error for that file and keep other files visible. Error files contribute no Task Item State.

If no Task Items exist across all ready files, still render the Markdown and show a page-level notice: `No task items found in this source.`

Do not add explicit source size limits in v1. Avoid unnecessary memory-heavy copies.

## UI

Do not build a marketing landing page. Home is the working input screen.

Home:

- Product name: `Checkgist`.
- Input placeholder: `Paste a GitHub Gist or supported source URL`.
- Helper text: `Supports GitHub Gist and Pastebin.`
- Submit button: `Open`.
- Pressing Enter submits.
- Input errors are shown inline.
- Theme follows system light/dark mode only; no manual toggle in v1.

Loaded source top bar:

- `Home` button to `/checkgist/`.
- `View source` external link using `SourceMetadata.url`.
- `Copy link` button copies current `window.location.href`; show success feedback, and show an error if copy fails.
- `Reset all` button clears all Task Item State for the current Source Reference.

Loaded source content:

- `SourceMetadata.title` is used for browser title formatting, not as a visible page heading.
- Browser title uses `formatBrowserTitle(source.metadata.title)`, truncating long text and adding ` - Checkgist`.
- If `SourceMetadata.description` exists, show it as ordinary plain text above files. Do not render it as Markdown and do not logically truncate it.
- Render files in Source Service order.
- Each ready file shows `SourceFile.name`, rendered Markdown content, and a per-file `Reset` button.
- For Pastebin, the one file name is the paste ID.
- Each error file shows its file name and inline error.

Ensure UI text is English. Ensure layouts work in light and dark themes and do not break on long source descriptions, long file names, or narrow screens.

## Loading And Race Handling

Use a composable-level request token and `AbortController`.

- Starting a new load aborts the previous load where possible.
- Source Service `load` receives the current `AbortSignal`.
- Apply a load result only if its token is still current.
- Do not let a slower previous load overwrite a newer route/source.

## Test Plan

Use the project commands from `AGENTS.md`:

```text
npm run typecheck
npm run agent:test
npm run agent:lint
```

Do not run a dev server.

Core tests:

- Source URL parsing and normalization per service.
- Route path parsing and `toRoute` per service.
- Registry first-match behavior.
- GitHub Gist API response mapping with description, file order, truncated raw fetch, raw fetch failure, and no files.
- Pastebin raw mapping and load failure.
- Task state decode/encode, invalid hash, missing bits, extra bits, trailing zero trim.
- Per-file reset, reset-all, and file-local `setTaskChecked`.
- Error files contributing no bits.
- `buildChecklistSession` parsing ready files, converting source file errors, handling parse errors, ignoring Markdown `[x]`, and applying initial hash.
- Security config blocks unsafe tags/attributes and allows `http`, `https`, and `mailto`.
- Link transform adds `target="_blank"` and `rel="noopener noreferrer"`.
- Browser title formatting truncates long titles.

Vue/component tests:

- Home submit normalizes supported URLs and navigates to canonical route.
- Unsupported input shows inline error.
- Source route auto-loads.
- Loaded source renders description, source link, file names, Markdown, task checkboxes, Copy link, Reset all, and per-file Reset.
- Toggling a checkbox updates hash with `replaceState`.
- Hash changes from browser navigation re-apply state.
- Copy link success and failure states.
- Source-level error and file-level error states.
- No-task-items notice while Markdown remains visible.

Network tests should mock `ofetch` and use fixtures. Do not call real GitHub or Pastebin in automated tests.

## Open Risks

- Pastebin and GitHub browser fetch behavior can change. v1 uses direct browser fetch because current target services work that way; a CORS proxy can be considered later if needed.
- GitHub API response object file order is used as returned. Task Item State remains positional and best-effort if file order or source content changes.
- Comark task-list AST details must be verified during implementation before finalizing task-index transforms.

Commit message: Add Checkgist v1 implementation plan
