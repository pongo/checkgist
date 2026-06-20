import { computed, readonly, ref, type Ref } from "vue";

import type { Bookmark } from "./db";

export type BookmarkRow =
  | {
      type: "bookmark";
      bookmark: Bookmark;
    }
  | {
      type: "removed";
      bookmark: Bookmark;
      position: number;
    };

export type DropIndicatorPosition = "before" | "after";

export type BookmarkDropIndicator = {
  routePath: string;
  position: DropIndicatorPosition;
};

type BookmarkListModelOptions = {
  bookmarks: Readonly<Ref<readonly Bookmark[]>>;
  removeBookmark: (routePath: string) => Promise<Bookmark | null>;
  renameBookmark: (routePath: string, title: string) => Promise<Bookmark | null>;
  reorderBookmark: (routePath: string, toIndex: number) => Promise<void>;
  restoreBookmark: (bookmark: Bookmark, toIndex: number) => Promise<void>;
};

export function getBookmarkDropIndex(
  bookmarks: readonly Bookmark[],
  routePath: string,
  targetBookmark: Bookmark,
  position: DropIndicatorPosition,
) {
  const fromIndex = bookmarks.findIndex((bookmark) => bookmark.routePath === routePath);
  const targetIndex = bookmarks.findIndex(
    (bookmark) => bookmark.routePath === targetBookmark.routePath,
  );

  if (fromIndex === -1 || targetIndex === -1) {
    return -1;
  }

  const targetInsertIndex = targetIndex + (position === "after" ? 1 : 0);
  return fromIndex < targetInsertIndex ? targetInsertIndex - 1 : targetInsertIndex;
}

export function getCanonicalBookmarkDropIndicator(
  bookmarks: readonly Bookmark[],
  routePath: string,
  targetBookmark: Bookmark,
  position: DropIndicatorPosition,
): BookmarkDropIndicator | null {
  const targetIndex = bookmarks.findIndex(
    (bookmark) => bookmark.routePath === targetBookmark.routePath,
  );

  if (targetIndex === -1) {
    return null;
  }

  const gapIndex = targetIndex + (position === "after" ? 1 : 0);
  const nextBookmark = bookmarks[gapIndex];

  if (nextBookmark !== undefined && nextBookmark.routePath !== routePath) {
    return {
      routePath: nextBookmark.routePath,
      position: "before",
    };
  }

  const previousBookmark = bookmarks[gapIndex - 1];

  if (previousBookmark !== undefined && previousBookmark.routePath !== routePath) {
    return {
      routePath: previousBookmark.routePath,
      position: "after",
    };
  }

  return null;
}

export function createBookmarkListModel({
  bookmarks,
  removeBookmark,
  renameBookmark,
  reorderBookmark,
  restoreBookmark,
}: BookmarkListModelOptions) {
  const editingRoutePath = ref<string | null>(null);
  const recentlyRemoved = ref<Array<{ bookmark: Bookmark; position: number }>>([]);
  const draggedRoutePath = ref<string | null>(null);
  const dropIndicator = ref<BookmarkDropIndicator | null>(null);

  const rows = computed<BookmarkRow[]>(() => {
    const nextRows: BookmarkRow[] = bookmarks.value.map((bookmark) => ({
      type: "bookmark",
      bookmark,
    }));

    for (const placeholder of [...recentlyRemoved.value].sort(
      (first, second) => first.position - second.position,
    )) {
      nextRows.splice(Math.max(0, Math.min(placeholder.position, nextRows.length)), 0, {
        type: "removed",
        bookmark: placeholder.bookmark,
        position: placeholder.position,
      });
    }

    return nextRows;
  });

  function startRename(bookmark: Bookmark) {
    editingRoutePath.value = bookmark.routePath;
  }

  function cancelRename() {
    editingRoutePath.value = null;
  }

  async function saveRename(bookmark: Bookmark, title: string) {
    const nextTitle = title.trim();

    if (nextTitle.length > 0 && nextTitle !== bookmark.title) {
      await renameBookmark(bookmark.routePath, nextTitle);
    }

    cancelRename();
  }

  async function deleteBookmark(bookmark: Bookmark, rowIndex: number) {
    const removed = await removeBookmark(bookmark.routePath);

    if (removed !== null) {
      recentlyRemoved.value.push({ bookmark: removed, position: rowIndex });
    }
  }

  async function restoreRemovedBookmark(bookmark: Bookmark, position: number) {
    await restoreBookmark(bookmark, position);
    recentlyRemoved.value = recentlyRemoved.value.filter(
      (placeholder) => placeholder.bookmark.routePath !== bookmark.routePath,
    );
  }

  function beginDrag(bookmark: Bookmark) {
    draggedRoutePath.value = bookmark.routePath;
  }

  function clearDragState() {
    draggedRoutePath.value = null;
    dropIndicator.value = null;
  }

  function getDraggedRoutePath(fallbackRoutePath = "") {
    return draggedRoutePath.value ?? fallbackRoutePath;
  }

  function previewDrop(
    targetBookmark: Bookmark,
    position: DropIndicatorPosition,
    fallbackRoutePath = "",
  ) {
    const routePath = getDraggedRoutePath(fallbackRoutePath);

    dropIndicator.value =
      routePath.length > 0 && routePath !== targetBookmark.routePath
        ? getCanonicalBookmarkDropIndicator(bookmarks.value, routePath, targetBookmark, position)
        : null;
  }

  async function dropOnBookmark(
    targetBookmark: Bookmark,
    position: DropIndicatorPosition,
    fallbackRoutePath = "",
  ) {
    const routePath = getDraggedRoutePath(fallbackRoutePath);

    if (routePath.length === 0 || routePath === targetBookmark.routePath) {
      clearDragState();
      return;
    }

    const indicatorTargetBookmark =
      dropIndicator.value === null
        ? undefined
        : bookmarks.value.find((bookmark) => bookmark.routePath === dropIndicator.value?.routePath);
    const targetDropPosition = dropIndicator.value?.position ?? position;
    const targetIndex = getBookmarkDropIndex(
      bookmarks.value,
      routePath,
      indicatorTargetBookmark ?? targetBookmark,
      targetDropPosition,
    );

    if (targetIndex !== -1) {
      await reorderBookmark(routePath, targetIndex);
    }

    clearDragState();
  }

  async function dropOnCurrentIndicator(fallbackRoutePath = "") {
    const targetRoutePath = dropIndicator.value?.routePath;

    if (targetRoutePath === undefined) {
      return;
    }

    const targetBookmark = bookmarks.value.find(
      (bookmark) => bookmark.routePath === targetRoutePath,
    );

    if (targetBookmark !== undefined) {
      await dropOnBookmark(
        targetBookmark,
        dropIndicator.value?.position ?? "before",
        fallbackRoutePath,
      );
    }
  }

  function allowDropInsideBoundary() {
    return draggedRoutePath.value !== null || dropIndicator.value !== null;
  }

  function getDropIndicatorPosition(row: BookmarkRow) {
    return dropIndicator.value?.routePath === row.bookmark.routePath
      ? dropIndicator.value.position
      : null;
  }

  return {
    editingRoutePath: readonly(editingRoutePath),
    rows,
    draggedRoutePath: readonly(draggedRoutePath),
    dropIndicator: readonly(dropIndicator),
    startRename,
    cancelRename,
    saveRename,
    deleteBookmark,
    restoreRemovedBookmark,
    beginDrag,
    clearDragState,
    getDraggedRoutePath,
    previewDrop,
    dropOnBookmark,
    dropOnCurrentIndicator,
    allowDropInsideBoundary,
    getDropIndicatorPosition,
  };
}
