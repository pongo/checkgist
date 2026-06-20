# План 1 — Lifecycle Loaded Source -> Checklist

Углубить module, который открывает Source Reference как Checklist. Сейчас lifecycle размазан между page module, загрузкой Loaded Source, построением Checklist, Checklist State, browser hash, abort/stale-load и browser title.

## Текущее состояние

- `src/pages/SourceReference/SourceReferencePage.vue` парсит route path в Source Reference, запускает загрузку Loaded Source, держит loading/error state, управляет `AbortController`, stale-load token, browser hash listener, browser title и reset через view ref.
- `src/checklist-session/load.ts` загружает Loaded Source и строит Checklist, но не владеет полным lifecycle.
- `src/checklist-session/build.ts` строит Checklist из Loaded Source.
- `src/checklist-session/browser-state.ts` и `src/checklist-session/browser-title.ts` закрывают только тонкие части поведения.

## Целевая форма

Один deep module для сценария “open Source Reference as Checklist”. Его interface должен быть достаточно малым: page передает route-derived Source Reference и browser-state facts, а получает lifecycle state для рендера.

Vue markup остается в page/view modules. Source Service adapters остаются за registry seam.

## Implementation Plan

1. Зафиксировать текущие lifecycle cases в тестах: successful load, invalid Source Reference, load error, abort on route change, stale-load ignored, hash applied, hash changes applied, browser title reset.
2. Ввести новый module в `src/checklist-session/`, который владеет состояниями lifecycle: idle/loading/ready/error/not-found или ближайшей к текущему коду формой.
3. Перенести из `SourceReferencePage.vue` orchestration вокруг `AbortController`, active load token и stale-load handling внутрь нового module.
4. Перенести применение initial Checklist State из browser hash в lifecycle module, не меняя формат Checklist State.
5. Перенести управление browser title через существующий `browser-title.ts` внутрь lifecycle module или через маленький adapter, если title должен остаться внешним эффектом.
6. Оставить в `SourceReferencePage.vue` только route watch, вызов lifecycle module и отображение lifecycle state.
7. Разделить тесты: lifecycle behavior тестировать через новый module, page tests оставить для рендера и связки с router.
8. Verify: `npm run typecheck`, `npm run agent:lint`, `npm run agent:test`.

## Риски

- Route reactivity и abort order могут поменять timing. Нужны тесты на stale-load и abort.
- Browser hash listener должен отписываться при смене Source Reference и unmount.
- Нельзя смешать этот refactor с изменением Source Service registry routing; это отдельный seam.

## Тест на удаление

После переноса удаление нового lifecycle module должно вернуть сложность обратно в `SourceReferencePage.vue`. Если удаление просто убирает pass-through, module получился shallow и план надо пересмотреть.

---

`refactor(checklist-session): deepen source reference lifecycle module`
