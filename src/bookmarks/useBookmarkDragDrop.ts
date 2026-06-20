import { onMounted, onUnmounted, type Ref } from "vue";

import type { createBookmarkListModel, DropIndicatorPosition } from "./bookmarkListModel";
import type { Bookmark } from "./db";

type BookmarkListModel = ReturnType<typeof createBookmarkListModel>;

type UseBookmarkDragDropOptions = {
  listModel: BookmarkListModel;
  dropBoundary: Readonly<Ref<HTMLElement | null>>;
};

export function useBookmarkDragDrop({ listModel, dropBoundary }: UseBookmarkDragDropOptions) {
  function onDragStart(bookmark: Bookmark, event: DragEvent) {
    listModel.beginDrag(bookmark);
    event.dataTransfer?.setData("text/plain", bookmark.routePath);

    if (event.dataTransfer !== null) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function onDragEnd() {
    listModel.clearDragState();
  }

  function getDraggedRoutePath(event: DragEvent): string {
    return listModel.getDraggedRoutePath(event.dataTransfer?.getData("text/plain") ?? "");
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

  function onDragOver(targetBookmark: Bookmark, event: DragEvent) {
    event.preventDefault();

    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = "move";
    }

    listModel.previewDrop(targetBookmark, getDropPosition(event), getDraggedRoutePath(event));
  }

  async function onDrop(targetBookmark: Bookmark, event: DragEvent) {
    event.preventDefault();
    await listModel.dropOnBookmark(
      targetBookmark,
      getDropPosition(event),
      getDraggedRoutePath(event),
    );
  }

  function isInsideDropBoundary(event: DragEvent) {
    return event.target instanceof Node && (dropBoundary.value?.contains(event.target) ?? false);
  }

  function allowDropOnCurrentIndicator(event: DragEvent) {
    if (listModel.dropIndicator.value === null) {
      return;
    }

    event.preventDefault();

    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function allowDropInsideBoundary(event: DragEvent) {
    if (!listModel.allowDropInsideBoundary()) {
      return;
    }

    event.preventDefault();

    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function allowDocumentDrop(event: DragEvent) {
    if (isInsideDropBoundary(event)) {
      return;
    }

    allowDropOnCurrentIndicator(event);
  }

  async function dropOnCurrentIndicator(event: DragEvent) {
    event.preventDefault();
    await listModel.dropOnCurrentIndicator(getDraggedRoutePath(event));
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
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onDropBoundaryDragOver: allowDropInsideBoundary,
    onDropBoundaryDrop: dropOnCurrentIndicator,
  };
}
