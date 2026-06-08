- никогда не запускай dev сервер. никогда не делай deploy. никогда не делай git commit

- для проверки типов: npm run typecheck
- для тестов: npm run agent:test
- для линтера: npm run agent:lint

- В проекте используются vue 3.5, vue-router 5, tailwind 4, ofetch

## Code comments

- Write comments for complex or non-trivial code where the intent is not immediately obvious. Explain why something is done, important assumptions, invariants, edge cases, and trade-offs. Avoid comments that simply describe what the code does when that is already clear from the code itself.

## UI

- поддерживается две темы оформления (светлая и темная) с автоматической сменой тем
- интерфейс приложения на английском

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default five-role triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo: read root `CONTEXT.md` and root `docs/adr/` when present. See `docs/agents/domain.md`.
