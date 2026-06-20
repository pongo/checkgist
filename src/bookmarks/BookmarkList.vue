<script setup lang="ts">
import { computed, useTemplateRef } from "vue";

import BookmarkListItem from "./BookmarkListItem.vue";
import { createBookmarkListModel } from "./bookmarkListModel";
import { useBookmarkDragDrop } from "./useBookmarkDragDrop";
import { useBookmarks } from "./useBookmarks";

const { bookmarks, isReady, removeBookmark, renameBookmark, reorderBookmark, restoreBookmark } =
  useBookmarks();
const listModel = createBookmarkListModel({
  bookmarks,
  removeBookmark,
  renameBookmark,
  reorderBookmark,
  restoreBookmark,
});
const bookmarkList = useTemplateRef("bookmarkList");
const { onDragStart, onDragEnd, onDragOver, onDrop, onDropBoundaryDragOver, onDropBoundaryDrop } =
  useBookmarkDragDrop({
    listModel,
    dropBoundary: bookmarkList,
  });

const shouldRender = computed(() => isReady.value && listModel.rows.value.length > 0);
</script>

<template>
  <section v-if="shouldRender" class="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
    <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Bookmarks</h2>

    <ul
      ref="bookmarkList"
      class="mt-3 space-y-1"
      @dragenter.capture="onDropBoundaryDragOver"
      @dragover.self="onDropBoundaryDragOver"
      @drop.self="onDropBoundaryDrop"
    >
      <BookmarkListItem
        v-for="(row, rowIndex) in listModel.rows.value"
        :key="`${row.type}:${row.bookmark.routePath}`"
        :row="row"
        :row-index="rowIndex"
        :is-editing="listModel.editingRoutePath.value === row.bookmark.routePath"
        :drop-indicator-position="listModel.getDropIndicatorPosition(row)"
        @start-rename="listModel.startRename"
        @rename="listModel.saveRename"
        @cancel-rename="listModel.cancelRename"
        @delete="listModel.deleteBookmark"
        @restore="listModel.restoreRemovedBookmark"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
        @drag-over="onDragOver"
        @drop="onDrop"
      />
    </ul>
  </section>
</template>
