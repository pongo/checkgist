<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue";

import type { Bookmark } from "./db";
import BookmarkListItem from "./BookmarkListItem.vue";
import { useBookmarkDragDrop } from "./useBookmarkDragDrop";
import { useBookmarks } from "./useBookmarks";

type BookmarkRow =
  | {
      type: "bookmark";
      bookmark: Bookmark;
    }
  | {
      type: "removed";
      bookmark: Bookmark;
      position: number;
    };

const { bookmarks, isReady, removeBookmark, renameBookmark, reorderBookmark, restoreBookmark } =
  useBookmarks();
const editingRoutePath = ref<string | null>(null);
const recentlyRemoved = ref<Array<{ bookmark: Bookmark; position: number }>>([]);
const bookmarkList = useTemplateRef("bookmarkList");
const { dropIndicator, onDragStart, onDragEnd, onDragOver, onDrop } = useBookmarkDragDrop({
  bookmarks,
  reorderBookmark,
});

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
const shouldRender = computed(() => isReady.value && rows.value.length > 0);

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

function getDropIndicatorPosition(row: BookmarkRow) {
  return dropIndicator.value?.routePath === row.bookmark.routePath
    ? dropIndicator.value.position
    : null;
}

function isInsideBookmarkList(event: DragEvent) {
  return event.target instanceof Node && (bookmarkList.value?.contains(event.target) ?? false);
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

  const targetBookmark = bookmarks.value.find((bookmark) => bookmark.routePath === targetRoutePath);

  if (targetBookmark !== undefined) {
    await onDrop(targetBookmark, event);
  }
}

function allowDocumentDrop(event: DragEvent) {
  if (isInsideBookmarkList(event)) {
    return;
  }

  allowDropOnCurrentIndicator(event);
}

async function dropOnDocument(event: DragEvent) {
  if (isInsideBookmarkList(event)) {
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
</script>

<template>
  <section v-if="shouldRender" class="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
    <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Bookmarks</h2>

    <ul
      ref="bookmarkList"
      class="mt-3 space-y-1"
      @dragover.self="allowDropOnCurrentIndicator"
      @drop.self="dropOnCurrentIndicator"
    >
      <BookmarkListItem
        v-for="(row, rowIndex) in rows"
        :key="`${row.type}:${row.bookmark.routePath}`"
        :row="row"
        :row-index="rowIndex"
        :is-editing="editingRoutePath === row.bookmark.routePath"
        :drop-indicator-position="getDropIndicatorPosition(row)"
        @start-rename="startRename"
        @rename="saveRename"
        @cancel-rename="cancelRename"
        @delete="deleteBookmark"
        @restore="restoreRemovedBookmark"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
        @drag-over="onDragOver"
        @drop="onDrop"
      />
    </ul>
  </section>
</template>
