# Source Reference routing from Home

Status: ready-for-agent

## Parent

`.scratch/v1/PRD.md`

## What to build

Build the first vertical slice from Home input to canonical Source Reference routing. A user can enter a supported Source URL, submit it, and land on the normalized `/checkgist/...` route without loading or rendering external content yet. Unsupported or ambiguous input is rejected with an inline Home error.

This slice establishes the Source Service registry shape for URL and route normalization, including GitHub Gist and Pastebin typed Source References.

## Acceptance criteria

- [ ] Home shows the product name, Source URL input, helper text, and `Open` submit control using English UI copy.
- [ ] The input placeholder is `Paste a GitHub Gist or supported source URL`.
- [ ] Helper text says `Supports GitHub Gist and Pastebin.`
- [ ] Submitting with Enter and submitting with `Open` have the same behavior.
- [ ] Full `http://` and `https://` supported URLs are accepted.
- [ ] Protocol-less supported host URLs are accepted by treating them as `https://`.
- [ ] Bare IDs are rejected as unsupported or ambiguous input.
- [ ] GitHub Gist page URLs with optional owner normalize to the canonical gist route that contains only the gist ID.
- [ ] Pastebin normal and raw URLs normalize to the canonical Pastebin route that contains only the paste ID.
- [ ] Query strings, hash fragments, and trailing slashes in supported Source URLs do not affect normalization.
- [ ] Unsupported Source URLs show an inline input error and do not navigate.
- [ ] Opening a canonical Source Reference route directly can be parsed back into the correct typed Source Reference.
- [ ] Registry resolution is deterministic first match and is covered by tests.
