- никогда не запускай dev сервер. никогда не делай deploy. никогда не делай git commit

- для проверки типов: npm run typecheck
- для тестов: npm run agent:test
- для линтера: npm run agent:lint

- поддерживается две темы оформления (светлая и темная) с автоматической сменой тем
- интерфейс приложения на английском

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default five-role triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo: read root `CONTEXT.md` and root `docs/adr/` when present. See `docs/agents/domain.md`.
