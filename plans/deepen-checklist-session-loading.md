# Deepen Checklist Session Loading

## Context

Checkgist loads external Source Content from a Source Service, builds a Checklist Session, applies Task Item State from the browser hash, and renders the session in `SourceReferenceView.vue`.

The current loading workflow is concentrated in the view:

- parses the Source Reference from the route path;
- looks up the Source Service in `sourceRegistry`;
- owns abort and stale-load protection;
- loads Source Content;
- builds the Checklist Session;
- applies initial Task Item State from `window.location.hash`;
- writes `document.title`;
- maps source-level load errors into UI text;
- starts the browser hash listener;
- owns copy-link feedback.

This makes `SourceReferenceView.vue` a shallow module for loading concerns: its interface as a Vue view is small, but its implementation carries several unrelated Checklist Session lifecycle invariants. Tests for source loading, stale responses, browser title, hash state, and rendering shell all mount the view and mock browser/router details.

## Goal

Create a deeper Checklist Session loading module that owns:

- loading Source Content for a Source Reference;
- building the Checklist Session;
- cancellation and stale-result policy;
- source-level load error mapping;
- browser-facing session metadata needed by the view.

The view should remain responsible for rendering and user interaction, but should consume a smaller loading interface.

## Non-Goals

- Do not change Source Service behavior.
- Do not change Source Reference route shape.
- Do not change Task Item Tree semantics.
- Do not move copy-link feedback unless the design discussion explicitly chooses a broader browser Checklist Session representation module.
- Do not introduce a global store unless a concrete second caller makes the seam real.

## Candidate Files

- `src/views/SourceReferenceView.vue`
- `src/source-services/registry.ts`
- `src/source-services/types.ts`
- `src/checklist-session/build.ts`
- `src/checklist-session/browser-state.ts`
- `src/checklist-session/browser-title.ts`
- `src/checklist-session/types.ts`
- `src/views/SourceReferenceView.test.ts`

## Proposed Module Shape

Possible new module:

- `src/checklist-session/load.ts`

Possible responsibilities:

- accept a `SourceReference | null`;
- resolve the matching Source Service;
- create and expose an abortable load run;
- call `service.load(reference, { signal })`;
- call `buildChecklistSession(source, { initialStateBits })`;
- return a typed loading result with the Checklist Session and browser title;
- ignore stale results when a newer load has started.

Keep the exact interface open for discussion. The important seam is: callers should not need to know the full order of Source Service lookup, Source Content loading, Checklist Session building, initial Task Item State application, and stale-result protection.

## Design Questions For The New Session

1. Should the loading module own browser title formatting, or should it return Source Metadata and let the view call `formatBrowserTitle`?
2. Should stale-load policy live inside a reusable loader object, or stay in the view with a smaller pure `loadChecklistSession` function?
3. Should unsupported Source References be represented as a typed result, or should the view keep mapping `null` to `unsupportedSourceUrlMessage`?
4. Should the module depend on `sourceRegistry` by default, or accept a registry explicitly for testability?
5. Should browser hash reading stay at the view edge, or should the loader accept a `stateBits` string and remain browser-agnostic?

## Recommended Direction

Start with a browser-agnostic loading function plus a small view-owned load token:

- `loadChecklistSession(reference, { registry, stateBits, signal })`
- returns `{ session, browserTitle }` or a typed load error.

This is less ambitious than a full loader object, but it immediately removes Source Service lookup, session building, initial Task Item State wiring, and title formatting from the view. If stale-load and abort logic remain noisy after that, deepen the module one step further into an abortable loader.

## Risks

- Moving too much browser behavior into the loading module can mix Source Content loading with UI feedback.
- A too-small pure function may leave the stale-load and abort policy leaking in the view.
- Tests can become over-mocked if the module accepts too many injected collaborators.

## Implementation Plan

1. Add focused tests for loading a Checklist Session from a Source Reference without mounting `SourceReferenceView.vue`.
2. Add `src/checklist-session/load.ts` with a small loading interface and default registry.
3. Move Source Service lookup, `service.load`, `buildChecklistSession`, initial Task Item State, unsupported-source handling, and browser title formatting behind that interface.
4. Update `SourceReferenceView.vue` to call the loading module while keeping route watching, rendering state, abort lifecycle, and copy-link feedback in the view.
5. Simplify `SourceReferenceView.test.ts` to keep integration coverage while moving detailed lifecycle cases into loading module tests.
6. Run `npm run typecheck`, `npm run agent:test`, and `npm run agent:lint`.

Commit message: `Deepen checklist session loading module`
