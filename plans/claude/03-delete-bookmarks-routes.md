# План 3 — Удалить `src/bookmarks/routes.ts`

Файл из 13 строк с двумя пасс‑тру не несёт абстракции. Тест на удаление: вызывающие просто инлайнят `route.path` и `routeForReference(reference)`.

## Текущее состояние

`src/bookmarks/routes.ts`:

```ts
export function bookmarkRoutePathFromRoute(route: RouteLocationNormalizedLoaded): string {
  return route.path;
}
export function bookmarkRoutePathFromReference(reference: SourceReference): string {
  return routeForReference(reference);
}
```

Потребители (по grep):

- `src/bookmarks/BookmarkToggleButton.vue:8,18` — `bookmarkRoutePathFromRoute(route)`.
- `bookmarkRoutePathFromReference` — потребителей не найдено (мёртвый код, проверить ещё раз перед удалением).

## Шаги

1. **Перепроверить grep.**

   ```
   bookmarkRoutePathFromRoute|bookmarkRoutePathFromReference
   ```

   Если найдутся импорты помимо `BookmarkToggleButton.vue` — обновить их вместе с компонентом.

2. **`BookmarkToggleButton.vue`:**

   ```diff
   - import { bookmarkRoutePathFromRoute } from "./routes"
   ...
   - const routePath = computed(() => bookmarkRoutePathFromRoute(route))
   + const routePath = computed(() => route.path)
   ```

3. **Удалить файл `src/bookmarks/routes.ts`.**

4. **Удалить связанный тест**, если есть (`src/bookmarks/routes.test.ts` — проверить).

5. **Verify.** `npm run typecheck`, `npm run agent:lint`, `npm run agent:test`.

## Риски и решения

- **Семантическая роль имени.** `bookmarkRoutePathFromRoute` намекает, что «путь Bookmark — это `route.path`», но этот факт уже выражен типом `Bookmark.routePath: string` и хранится в БД. Имя — это словарь без референта.
- **`bookmarkRoutePathFromReference` мог использоваться раньше.** Если grep покажет его в каких‑то незакоммиченных правках — заменить на прямой `routeForReference(reference)` из `@/source-services/registry`.

## Тест на удаление

Файл удаляется без концентрации сложности — её просто не было. Это и есть критерий shallow‑модуля.

---

`refactor(bookmarks): remove bookmarks/routes.ts pass-throughs`
