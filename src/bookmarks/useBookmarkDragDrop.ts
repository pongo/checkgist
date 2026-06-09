import { onMounted, onUnmounted, ref, type Ref } from "vue";

import type { Bookmark } from "./db";

type DropIndicatorPosition = "before" | "after";

type UseBookmarkDragDropOptions = {
  bookmarks: Readonly<Ref<readonly Bookmark[]>>;
  reorderBookmark: (routePath: string, toIndex: number) => Promise<void>;
  dropBoundary: Readonly<Ref<HTMLElement | null>>;
};

export type BookmarkDropIndicator = {
  routePath: string;
  position: DropIndicatorPosition;
};

export function useBookmarkDragDrop({
  bookmarks,
  reorderBookmark,
  dropBoundary,
}: UseBookmarkDragDropOptions) {
  const draggedRoutePath = ref<string | null>(null);
  const dropIndicator = ref<BookmarkDropIndicator | null>(null);

  function clearDragState() {
    draggedRoutePath.value = null;
    dropIndicator.value = null;
  }

  function onDragStart(bookmark: Bookmark, event: DragEvent) {
    draggedRoutePath.value = bookmark.routePath;
    event.dataTransfer?.setData("text/plain", bookmark.routePath);

    if (event.dataTransfer !== null) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function onDragEnd() {
    clearDragState();
  }

  function getDraggedRoutePath(event: DragEvent): string {
    return draggedRoutePath.value ?? event.dataTransfer?.getData("text/plain") ?? "";
  }

  function getDropPosition(event: DragEvent): DropIndicatorPosition {
    if (!(event.currentTarget instanceof HTMLElement)) {
      return "before";
    }

    const bounds = event.currentTarget.getBoundingClientRect();

    if (bounds.height === 0) {
      return "before";
    }

    return event.clientY > bounds.top + bounds.height / 2 ? "after" : "before";
  }

  function getDropIndex(
    routePath: string,
    targetBookmark: Bookmark,
    position: DropIndicatorPosition,
  ) {
    const fromIndex = bookmarks.value.findIndex((bookmark) => bookmark.routePath === routePath);
    const targetIndex = bookmarks.value.findIndex(
      (bookmark) => bookmark.routePath === targetBookmark.routePath,
    );

    if (fromIndex === -1 || targetIndex === -1) {
      return -1;
    }

    const targetInsertIndex = targetIndex + (position === "after" ? 1 : 0);
    return fromIndex < targetInsertIndex ? targetInsertIndex - 1 : targetInsertIndex;
  }

  function onDragOver(targetBookmark: Bookmark, event: DragEvent) {
    event.preventDefault();

    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = "move";
    }

    const routePath = getDraggedRoutePath(event);

    dropIndicator.value =
      routePath.length > 0 && routePath !== targetBookmark.routePath
        ? {
            routePath: targetBookmark.routePath,
            position: getDropPosition(event),
          }
        : null;
  }

  async function onDrop(targetBookmark: Bookmark, event: DragEvent) {
    event.preventDefault();
    const routePath = getDraggedRoutePath(event);

    if (routePath.length === 0 || routePath === targetBookmark.routePath) {
      clearDragState();
      return;
    }

    const targetIndex = getDropIndex(
      routePath,
      targetBookmark,
      dropIndicator.value?.position ?? getDropPosition(event),
    );

    if (targetIndex !== -1) {
      await reorderBookmark(routePath, targetIndex);
    }

    clearDragState();
  }

  function isInsideDropBoundary(event: DragEvent) {
    return event.target instanceof Node && (dropBoundary.value?.contains(event.target) ?? false);
  }

  function allowDropOnCurrentIndicator(event: DragEvent) {
    if (dropIndicator.value === null) {
      return;
    }

    event.preventDefault();

    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  async function dropOnCurrentIndicator(event: DragEvent) {
    const targetRoutePath = dropIndicator.value?.routePath;

    if (targetRoutePath === undefined) {
      return;
    }

    const targetBookmark = bookmarks.value.find(
      (bookmark) => bookmark.routePath === targetRoutePath,
    );

    if (targetBookmark !== undefined) {
      await onDrop(targetBookmark, event);
    }
  }

  function allowDocumentDrop(event: DragEvent) {
    if (isInsideDropBoundary(event)) {
      return;
    }

    allowDropOnCurrentIndicator(event);
  }

  async function dropOnDocument(event: DragEvent) {
    if (isInsideDropBoundary(event)) {
      return;
    }

    await dropOnCurrentIndicator(event);
  }

  onMounted(() => {
    window.addEventListener("dragover", allowDocumentDrop);
    window.addEventListener("drop", dropOnDocument);
  });

  onUnmounted(() => {
    window.removeEventListener("dragover", allowDocumentDrop);
    window.removeEventListener("drop", dropOnDocument);
  });

  return {
    dropIndicator,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onDropBoundaryDragOver: allowDropOnCurrentIndicator,
    onDropBoundaryDrop: dropOnCurrentIndicator,
  };
}
