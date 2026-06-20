# План 4 — Углубить Bookmarks DB до одного интерфейса мутации

Заменить шесть мутаций IDB, каждая из которых вручную повторяет «прочитать → упорядочить → изменить → нормализовать позиции → записать», на один глубокий интерфейс `mutate(transform)` поверх чистых функций над массивом `Bookmark`.

## Текущее состояние

`src/bookmarks/db.ts` (158 строк):

- `addBookmark`, `removeBookmark`, `renameBookmark`, `reorderBookmark`, `restoreBookmark`, `listBookmarks` — 6 публичных функций.
- Внутренние хелперы `withDensePositions`, `orderedBookmarks` повторяются в 4 из 6 операций.
- Каждая мутация открывает свою транзакцию `readwrite`.

`src/bookmarks/useBookmarks.ts` (147 строк):

- 5 обёрток (`addBookmark`, `removeBookmark`, `renameBookmark`, `reorderBookmark`, `restoreBookmark`), каждая делает: `ensureLoaded → if not ready return null → call db → refresh/replace`.

## Целевая форма

### `db.ts` — два экспорта

```ts
export type Bookmark = { routePath: string; title: string; position: number };
export type BookmarkMutation = (current: Bookmark[]) => Bookmark[];

export async function listBookmarks(): Promise<Bookmark[]>;
export async function mutateBookmarks(mutate: BookmarkMutation): Promise<Bookmark[]>;
```

`mutateBookmarks` инкапсулирует инвариант:

1. Открыть транзакцию.
2. Прочитать всё, упорядочить (`orderedBookmarks`).
3. Применить `mutate` к массиву.
4. Нормализовать позиции (`withDensePositions`).
5. Записать diff (clear + putAll, или сравнить и записать только изменённые).
6. Вернуть итоговый список.

### Чистые операции — `bookmark-operations.ts` (новый файл)

```ts
import type { Bookmark } from "./db"

export const addBookmark = (input: { routePath: string; title: string }): BookmarkMutation
export const removeBookmark = (routePath: string): BookmarkMutation
export const renameBookmark = (routePath: string, title: string): BookmarkMutation
export const reorderBookmark = (routePath: string, toIndex: number): BookmarkMutation
export const restoreBookmark = (bookmark: Bookmark, toIndex: number): BookmarkMutation
```

Каждая — чистая функция над `Bookmark[]`. Тестируются без IDB.

### `useBookmarks.ts` — один шаблон

```ts
async function runMutation<T>(operation: BookmarkMutation, ...): Promise<T> {
  await ensureLoaded()
  if (status.value !== "ready") return null as T
  bookmarks.value = await mutateBookmarks(operation)
  return /* derived result */
}
```

Внешние сигнатуры `addBookmark`/`removeBookmark`/etc. composable’а сохраняются — меняется только реализация.

## Шаги

1. **Создать `src/bookmarks/bookmark-operations.ts`** с пятью чистыми функциями.
2. **Тесты `bookmark-operations.test.ts`** — без `fake-indexeddb`, чистые юнит‑тесты на массивах.
3. **Переписать `db.ts`** под `mutateBookmarks(transform)` + `listBookmarks`. Сохранить `closeBookmarkDatabaseForTests`.
4. **Перенести логику стабилизации позиций (`withDensePositions`, `orderedBookmarks`) внутрь `mutateBookmarks`.** Они становятся приватными.
5. **Адаптировать `useBookmarks.ts`** — заменить 5 разных вызовов на единый шаблон. Особый случай: `addBookmark` возвращает `Bookmark | null` (важно для `requestPersistentStorageOnce` при первом добавлении). Решить через явный возврат из `runMutation` (например, `runMutation` возвращает `{ list, result }`).
6. **`db.test.ts`** — оставить интеграционные тесты, но теперь они дёргают `mutateBookmarks(addBookmark(...))` вместо прямого `addBookmark(...)`. Сценарии те же.
7. **`useBookmarks.test.ts`** — поверхностные изменения, сигнатуры наружу не менялись.
8. **Verify.** `npm run typecheck`, `npm run agent:lint`, `npm run agent:test`.

## Тонкости

- **`addBookmark` идемпотентность.** Сейчас при дублирующем `routePath` возвращается существующий и БД не пишется. Сохранить: чистая операция `addBookmark` возвращает тот же массив, если совпадение по `routePath` найдено. `mutateBookmarks` обнаруживает «массив не изменился — пропустить запись» (по reference equality после нормализации позиций).
- **`requestPersistentStorageOnce` в composable.** Сейчас вызывается только при «новом» bookmark. После рефактора composable должен уметь различать «добавлен» и «уже был». Возможный приём: операция возвращает `{ list, added: boolean }`. Это слегка расширяет тип `BookmarkMutation` — допустимо, либо вынести проверку в composable (сравнить длины до и после).
- **Транзакционная семантика.** `mutateBookmarks` должна делать всё в одной `readwrite`‑транзакции, как сейчас.

## Риски и решения

- **Производительность writes.** Сейчас `renameBookmark` делает один `put`. Наивная реализация `mutateBookmarks` будет переписывать все записи. Решение: внутри `mutateBookmarks` сравнить `before` и `after` поэлементно и записать только изменённые.
- **Объём изменений** — это самый крупный из четырёх рефакторов. Можно разбить на два PR: (a) ввести `mutateBookmarks` и `bookmark-operations`, оставить старые экспорты как фасады; (b) удалить старые экспорты после миграции.

## Тест на удаление

После рефактора: `withDensePositions` и `orderedBookmarks` живут в одном месте, инвариант плотных позиций становится свойством `mutateBookmarks`. Если попробовать удалить `mutateBookmarks` — сложность концентрируется в одном модуле и выйдет наружу. Это и есть deep module.

---

`refactor(bookmarks): unify db mutations behind mutateBookmarks`
