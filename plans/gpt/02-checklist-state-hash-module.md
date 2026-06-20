# План 2 — Checklist State и browser hash

Сконцентрировать Checklist State, browser hash и render invalidation за более deep module. Сейчас view module знает слишком много о том, как Task Item intent превращается в Checklist State и hash.

## Текущее состояние

- `src/checklist-session/state.ts` содержит `applySessionState`, `encodeSessionState`, `setTaskChecked`, `resetFile`, `resetAll`, `parseStateBits`, `syncSessionTaskCheckboxes`.
- `src/checklist-session/browser-state.ts` оборачивает hash encoding/listening.
- `src/checklist-session/ChecklistSessionView.vue` вызывает mutation helpers, синхронизирует rendered Markdown tree, обновляет router hash и дергает `markdownRenderVersion`.
- `src/checklist-session/task-item-dom.ts` переводит DOM events в Task Item факты.

## Целевая форма

Deep Checklist State module принимает доменный intent: toggle Task Item, reset Source File, reset all, apply browser state. Внутри module остается знание о Checklist State bits, hash outcome, tree sync и render invalidation.

`task-item-dom.ts` остается adapter от rendered Markdown event к доменному intent, если эта роль не начинает протекать обратно в state module.

## Implementation Plan

1. Выписать текущие user-visible cases: toggle Task Item, reset one Source File, reset all, apply hash on load, apply hashchange, encode empty/trailing unchecked state.
2. Ввести новый module рядом с `state.ts`, который возвращает результат операции: измененный Checklist State, hash target и признак render invalidation.
3. Перенести в этот module orchestration из `ChecklistSessionView.vue`: mutation, `syncSessionTaskCheckboxes`, hash encoding и reset invalidation.
4. Сузить `ChecklistSessionView.vue`: DOM event -> intent -> state module operation -> router hash/render update.
5. Оставить low-level mutation helpers private или internal, если callers больше не должны знать порядок вызовов.
6. Перенести тесты с Vue/router mocks на module-level tests для state operations.
7. Оставить view tests только для проверки, что clicks/resets вызывают правильный intent и отображают результат.
8. Verify: `npm run typecheck`, `npm run agent:lint`, `npm run agent:test`.

## Риски

- Формат Checklist State в URL должен остаться совместимым.
- Render invalidation нельзя делать на каждый toggle, если сейчас это нужно только для reset paths.
- DOM adapter не должен начать знать о hash или Checklist State bits.

## Тест на удаление

Если удалить новый Checklist State module, порядок mutation -> sync -> hash -> render invalidation должен снова расползтись в `ChecklistSessionView.vue`. Это подтверждает depth и locality.

---

`refactor(checklist-session): concentrate checklist state and hash operations`
