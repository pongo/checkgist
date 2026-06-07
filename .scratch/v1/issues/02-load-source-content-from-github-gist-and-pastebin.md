# Load Source Content from GitHub Gist and Pastebin

Status: ready-for-agent

## Parent

`.scratch/v1/PRD.md`

## What to build

Implement Source Service loading for GitHub Gist and Pastebin. Given a typed Source Reference, the app can fetch Source Content, map Source Metadata, produce ready Source Files, and surface source-level or file-level load failures.

Network tests should mock `ofetch` and use fixtures. Automated tests must not call real GitHub or Pastebin.

## Acceptance criteria

- [ ] GitHub Gist loading fetches the REST Gist endpoint for the gist ID.
- [ ] GitHub Gist Source Metadata uses the gist ID as title.
- [ ] GitHub Gist Source Metadata includes a non-empty trimmed description when present and omits empty descriptions.
- [ ] GitHub Gist Source Metadata uses `html_url` for the original source URL, with a deterministic fallback when absent.
- [ ] GitHub Gist files are mapped in the order returned by the GitHub API object values and are not sorted.
- [ ] Each non-truncated GitHub Gist file becomes a ready Source File named by its filename.
- [ ] A truncated GitHub Gist file fetches full content from its raw URL.
- [ ] A failed raw fetch for a truncated GitHub Gist file creates a file-level Source File error without failing the whole source.
- [ ] A failed GitHub Gist API request creates a source-level load error.
- [ ] A GitHub Gist response with no files creates a source-level load error saying no files were found.
- [ ] Pastebin loading fetches the raw Pastebin URL for the paste ID.
- [ ] Pastebin Source Metadata uses the paste ID as title and the normal Pastebin page as original source URL.
- [ ] Pastebin loading creates one ready Source File named by the paste ID.
- [ ] A failed Pastebin raw fetch creates a source-level load error.
- [ ] Source Service load accepts an optional AbortSignal and passes it to network requests where supported.
