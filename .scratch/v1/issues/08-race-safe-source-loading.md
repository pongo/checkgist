# Race-safe source loading

Status: ready-for-agent

## Parent

`.scratch/v1/PRD.md`

## What to build

Make source loading race-safe. If navigation or input causes a new source load before an older load completes, the older load must not overwrite the newer route, source state, errors, or rendered Checklist Session.

## Acceptance criteria

- [ ] Starting a new source load invalidates the previous in-flight load.
- [ ] Starting a new source load aborts the previous load where AbortController and the Source Service support it.
- [ ] Source Service load receives the current AbortSignal.
- [ ] A resolved stale load result is ignored if a newer load is current.
- [ ] A rejected stale load error is ignored if a newer load is current.
- [ ] Current load errors still render normally.
- [ ] Quick route changes do not show stale source content from an older request.
- [ ] Race behavior is covered by tests using controlled deferred load promises.
