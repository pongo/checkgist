# План 4 — Bookmark list interaction model

Выделить deep module для Bookmark list interaction. Bookmark persistence уже выглядит достаточно deep, но list behavior остается shallow и живет между view modules и drag/drop helper.

## Текущее состояние

- `src/bookmarks/BookmarkList.vue` владеет rows, edit state, recently removed placeholders, restore positions, delete/restore и drop indicator.
- `src/bookmarks/BookmarkListItem.vue` повторяет форму Bookmark row.
- `src/bookmarks/useBookmarkDragDrop.ts` содержит DOM geometry, document-level drag/drop handling, drop index и canonical drop indicator.
- `src/bookmarks/useBookmarks.ts` и `src/bookmarks/db.ts` отвечают за persistence.

## Целевая форма

Deep Bookmark list model владеет rows, editing, recently removed placeholders, restore position и reorder intent. Native drag events остаются adapter, IndexedDB остается adapter в `db.ts`.

View modules должны отображать rows и отправлять intents, а не собирать list-specific state сами.

## Implementation Plan

1. Зафиксировать behavior tests: delete Bookmark, restore Bookmark at previous position, edit row, reorder rows, drop indicator positions.
2. Ввести Bookmark list model с явными operations: start edit, finish edit, remove, restore, begin drag, move drag, drop reorder.
3. Перенести `BookmarkRow` shape в model module, чтобы `BookmarkList.vue` и `BookmarkListItem.vue` не дублировали ее.
4. Перенести recently removed placeholders и restore position logic из `BookmarkList.vue` в model.
5. Сузить `useBookmarkDragDrop.ts` до adapter: DOM event + geometry -> reorder intent/drop target.
6. Оставить `useBookmarks.ts` и `db.ts` persistence modules без изменения interface, кроме минимальной связки с model operations.
7. Переписать хрупкие DOM geometry tests на model-level tests там, где проверяется list behavior, а не browser drag events.
8. Verify: `npm run typecheck`, `npm run agent:lint`, `npm run agent:test`.

## Риски

- Drag/drop UX легко сломать при переносе drop indicator logic; оставить focused adapter tests на geometry.
- Restore position должен быть устойчив к reorder/delete между удалением и restore.
- Model не должен начать импортировать DOM или Vue refs.

## Тест на удаление

Если удалить Bookmark list model, rows, removed placeholders, restore и reorder policy должны снова расползтись в `BookmarkList.vue` и drag/drop helper. Это подтверждает locality.

---

`refactor(bookmarks): introduce bookmark list interaction model`
