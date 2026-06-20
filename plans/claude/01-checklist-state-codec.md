# План 1 — Checklist State Codec

Свернуть Checklist State в один глубокий модуль. Битовая строка перестаёт быть параметром `build` и `load`, а `browser-state.ts` исчезает как тонкий пасс‑тру.

## Текущее состояние

- `src/checklist-session/state.ts` — функции мутации сессии и кодирование в биты (`applySessionState`, `encodeSessionState`, `parseStateBits`, `setTaskChecked`, `resetFile`, `resetAll`, `syncSessionTaskCheckboxes`).
- `src/checklist-session/browser-state.ts` — три обёртки над `applySessionState`/`encodeSessionState`: `applyBrowserHashState`, `encodeBrowserHashState`, `listenToBrowserHashState`.
- `src/checklist-session/build.ts` принимает `initialStateBits` и в конце сам зовёт `applySessionState`.
- `src/checklist-session/load.ts` принимает `stateBits` и пробрасывает его дальше в `build`.
- `ChecklistSessionView.vue` использует `encodeBrowserHashState`.
- `SourceReferencePage.vue` (через `applyBrowserHashState` / `listenToBrowserHashState`) подписан на hashchange — проверить точные импорты в шаге 1.

## Целевая форма

Один модуль `state-codec.ts` с узким интерфейсом:

```ts
export type ChecklistStateBits = string;

export function readBitsFromHash(hash: string): ChecklistStateBits;
export function bitsToHash(bits: ChecklistStateBits): string; // "" or "#101…"
export function applyBitsToSession(
  session: ChecklistSession,
  bits: ChecklistStateBits,
): ChecklistSession;
export function bitsFromSession(session: ChecklistSession): ChecklistStateBits;
export function listenToHash(getSession, target?, location?): () => void;
```

`build` возвращает «чистую» сессию (без знания о hash). Применение состояния — на уровне `load` (или Page).

## Шаги

1. **Карта зависимостей.** Собрать все вызовы `applySessionState`, `encodeSessionState`, `parseStateBits`, `applyBrowserHashState`, `encodeBrowserHashState`, `listenToBrowserHashState`, `initialStateBits`, `stateBits`. Использовать `Grep` по `src/`.

2. **Новый модуль `src/checklist-session/state-codec.ts`.** Перенести в него:
   - `parseStateBits` → внутренний хелпер.
   - Логику применения битов к `ChecklistSession` (бывший `applySessionState`, без приватных синхронизаций — те уезжают в `state.ts`).
   - Кодирование (`encodeSessionState`).
   - hash‑адаптеры из `browser-state.ts`: `readBitsFromHash`, `bitsToHash`, `listenToHash`.
     Все входы/выходы — `ChecklistStateBits` (alias на `string`), снаружи модуль не выпускает «голую» строку без типа.

3. **Оставить в `state.ts` только мутации сессии:** `setTaskChecked`, `resetFile`, `resetAll`, `syncSessionTaskCheckboxes`. Удалить `applySessionState`, `encodeSessionState`, `parseStateBits` из публичного экспорта.

4. **Удалить `browser-state.ts` и его тест.** Тесты переехали в `state-codec.test.ts` (см. шаг 7).

5. **`build.ts`:** убрать параметр `initialStateBits`, убрать вызов `applySessionState` в конце. Возвращать «чистую» сессию.

6. **`load.ts`:** заменить `stateBits` на применение кодека после `buildChecklistSession`. Внутри:

   ```ts
   const session = await buildChecklistSession(source);
   if (options.stateBits != null) applyBitsToSession(session, readBitsFromHash(options.stateBits));
   ```

   Сигнатуру `LoadChecklistSessionOptions.stateBits` оставить — это удобный фасад, или (альтернатива) поднять применение состояния в Page и убрать параметр совсем. По умолчанию — оставить.

7. **Тесты.**
   - Перенести `browser-state.test.ts` → `state-codec.test.ts`, заменить имена импортов.
   - Перенести из `state.test.ts` блоки про `applySessionState`/`encodeSessionState`/`parseStateBits` в `state-codec.test.ts`.
   - В `state.test.ts` оставить только `setTaskChecked`/`resetFile`/`resetAll`.
   - `build.test.ts`/`load.test.ts`: убрать сценарии «build применяет initialStateBits», добавить в `load.test.ts` сценарий «load применяет stateBits через кодек».

8. **`ChecklistSessionView.vue`:** заменить `encodeBrowserHashState(session)` на `bitsToHash(bitsFromSession(session))`. Добавить локальный helper в `<script setup>`, если хочется не таскать обе функции.

9. **`SourceReferencePage`:** заменить вызовы `applyBrowserHashState`/`listenToBrowserHashState` на `applyBitsToSession(s, readBitsFromHash(location.hash))` и `listenToHash`.

10. **Verify.** `npm run typecheck`, `npm run agent:lint`, `npm run agent:test`.

## Риски и решения

- **Совместимость URL.** Формат битовой строки не меняется — `state-codec` сохраняет точный поведенческий контракт `parseStateBits` (включая trim ведущего `#` и regex `^[01]*$`). Покрыть тестом round‑trip.
- **Hash listener в SPA.** `listenToHash` принимает те же параметры (`target`, `location`), что и `listenToBrowserHashState`, чтобы тесты не ломались по сигнатуре.
- **`initialStateBits` в `BuildChecklistSessionOptions`.** Удалить из типа — компилятор сам найдёт всех вызывающих.

## Тест на удаление

После шага 4: `browser-state.ts` исчезает, и сложность не «расползается» — она поглощается одним новым модулем. Признак удачного углубления.

---

`refactor(checklist-session): consolidate state encoding into state-codec module`
