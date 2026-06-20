# План 2 — Скрыть идентичность Task Item за интерфейсом

Свернуть `task-item-dom.ts` внутрь `task-item-tree.ts` и сделать константы (`taskItemIndexAttribute`, `taskItemLabelClassName`) приватной деталью реализации.

## Текущее состояние

- `src/checklist-session/task-item-tree.ts` экспортирует две константы.
- `src/checklist-session/task-item-dom.ts` (16 строк) — два хелпера, оба читают эти константы.
- `ChecklistSessionView.vue` импортирует `findTaskItemLabelElement` и `taskItemIndexFromCheckboxElement`.
- `ChecklistSessionView.test.ts` использует `taskItemLabelClassName` напрямую (для построения тестового DOM).
- `task-item-dom.test.ts` использует обе константы.
- `task-item-tree.test.ts` использует обе константы для проверки дерева.

## Целевая форма

Все детали схемы идентификации Task Item — внутри `task-item-tree.ts`. Снаружи — функции‑запросы по `Element`/`HTMLElement`:

```ts
// task-item-tree.ts (deep module)
export function prepareExplicitTaskItems(tree);
export function promoteOrdinaryListItems(tree);
export function syncTaskItemState(tree, checked);

// new query interface, replaces task-item-dom.ts
export function taskItemIndexFromCheckboxElement(el: HTMLInputElement): number | null;
export function findTaskItemLabelElement(target: HTMLElement): HTMLLabelElement | null;
```

Константы `taskItemIndexAttribute`, `taskItemLabelClassName` — `const` без `export`.

## Шаги

1. **Перенести две функции из `task-item-dom.ts` в `task-item-tree.ts`** (внизу файла, после существующих экспортов).

2. **Снять `export` с констант** `taskItemIndexAttribute`, `taskItemLabelClassName`.

3. **Удалить `task-item-dom.ts`.**

4. **Слияние тестов.**
   - Слить `task-item-dom.test.ts` в `task-item-tree.test.ts` под отдельным `describe("DOM queries", ...)`. Тесты перестают использовать константы напрямую — вместо этого ставят атрибут руками (`setAttribute("data-checkgist-task-index", "3")`) или проверяют поведение через публичный `taskItemIndexFromCheckboxElement`.
   - **Альтернатива:** оставить тестам доступ к константам через приватный реэкспорт `*` для теста (`__internal`). Не рекомендуется — это размывает интерфейс, цель не достигается.
   - В `task-item-tree.test.ts` (внутри уже существующего файла) заменить ссылки на `taskItemIndexAttribute` / `taskItemLabelClassName` на проверку поведенческих свойств: `expect(JSON.stringify(tree)).toMatch(/data-checkgist-task-index/)` либо через публичный `syncTaskItemState` + проверку checked.

5. **`ChecklistSessionView.test.ts`** — единственная строка с `taskItemLabelClassName` в шаблоне теста (строки 10 и 114). Заменить на литерал `"checkgist-task-label"` (это уже не приватная деталь, а зафиксированный публичный CSS‑класс — он попадает в DOM и используется в стилях). В комментарии пометить, что класс — это публичный DOM‑контракт markdown‑рендеринга:

   ```ts
   // Public DOM contract: the rendered label class is part of the markdown output.
   const RENDERED_TASK_LABEL_CLASS = "checkgist-task-label";
   ```

6. **`ChecklistSessionView.vue`** — импорты переезжают с `./task-item-dom` на `./task-item-tree`. Поведение не меняется.

7. **Verify.** `npm run typecheck`, `npm run agent:lint`, `npm run agent:test`.

## Риски и решения

- **CSS‑класс `checkgist-task-label`** — фактически часть публичного DOM‑контракта (по нему вешаются стили в `main.css`). Это не приватная деталь рантайма; приватизируется только её программный экспорт. Зафиксировать поведенческим тестом: «после `prepareExplicitTaskItems` дерево содержит элемент `<label>` с классом `checkgist-task-label`».
- **`taskItemIndexAttribute`** — по‑настоящему приватный; никаких внешних потребителей не должно остаться.

## Тест на удаление

После шага 3: `task-item-dom.ts` удалён, его функции живут внутри владельца атрибутов. Сложность не растекается — атрибут и его читатели в одном файле.

## Опционально (не в этом PR)

`task-item-tree.ts` — 361 строка и совмещает «подготовку явных task items» с «промоутингом обычных list items». Это второе углубление: разнести на два модуля или оставить одним глубоким — отдельный grilling.

---

`refactor(checklist-session): hide task item identity inside task-item-tree`
