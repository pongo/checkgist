<script setup lang="ts">
import { Pencil, RotateCcw, Trash2 } from "@lucide/vue";
import { computed, nextTick, ref, useTemplateRef } from "vue";
import { RouterLink } from "vue-router";

import type { Bookmark } from "./db";
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
type DropIndicatorPosition = "before" | "after";

const { bookmarks, isReady, removeBookmark, renameBookmark, reorderBookmark, restoreBookmark } =
  useBookmarks();
const editingRoutePath = ref<string | null>(null);
const editingTitle = ref("");
const draggedRoutePath = ref<string | null>(null);
const dropIndicator = ref<{ routePath: string; position: DropIndicatorPosition } | null>(null);
const recentlyRemoved = ref<Array<{ bookmark: Bookmark; position: number }>>([]);
const editInput = useTemplateRef("editInput");

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

async function startRename(bookmark: Bookmark) {
  editingRoutePath.value = bookmark.routePath;
  editingTitle.value = bookmark.title;
  await nextTick();
  editInput.value?.[0]?.focus();
  editInput.value?.[0]?.select();
}

function cancelRename() {
  editingRoutePath.value = null;
  editingTitle.value = "";
}

async function saveRename(bookmark: Bookmark) {
  const nextTitle = editingTitle.value.trim();

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

async function restoreRemovedBookmark(row: Extract<BookmarkRow, { type: "removed" }>) {
  await restoreBookmark(row.bookmark, row.position);
  recentlyRemoved.value = recentlyRemoved.value.filter(
    (placeholder) => placeholder.bookmark.routePath !== row.bookmark.routePath,
  );
}

function onDragStart(bookmark: Bookmark, event: DragEvent) {
  draggedRoutePath.value = bookmark.routePath;
  event.dataTransfer?.setData("text/plain", bookmark.routePath);

  if (event.dataTransfer !== null) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function onDragEnd() {
  draggedRoutePath.value = null;
  dropIndicator.value = null;
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
    draggedRoutePath.value = null;
    dropIndicator.value = null;
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

  draggedRoutePath.value = null;
  dropIndicator.value = null;
}
</script>

<template>
  <section v-if="shouldRender" class="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
    <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Bookmarks</h2>

    <ul class="mt-3 space-y-1">
      <li
        v-for="(row, rowIndex) in rows"
        :key="`${row.type}:${row.bookmark.routePath}`"
        class="group relative flex h-6 items-center gap-3"
        :class="[
          row.type === 'removed' ? 'opacity-60' : '',
          dropIndicator?.routePath === row.bookmark.routePath && dropIndicator.position === 'before'
            ? 'before:absolute before:top-0 before:right-0 before:left-0 before:h-0.5 before:rounded-full before:bg-blue-600 dark:before:bg-blue-400'
            : '',
          dropIndicator?.routePath === row.bookmark.routePath && dropIndicator.position === 'after'
            ? 'after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-full after:bg-blue-600 dark:after:bg-blue-400'
            : '',
        ]"
      >
        <span
          class="size-1.5 shrink-0 rounded-full bg-zinc-950 dark:bg-zinc-50"
          aria-hidden="true"
        />
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <template v-if="row.type === 'bookmark'">
            <RouterLink
              v-if="editingRoutePath !== row.bookmark.routePath"
              class="min-w-0 flex-1 truncate rounded-sm text-base text-zinc-800 group-hover:text-[#0969da] focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:text-zinc-200 dark:group-hover:text-[#4493f8]"
              :to="row.bookmark.routePath"
              draggable="true"
              @dragstart="onDragStart(row.bookmark, $event)"
              @dragend="onDragEnd"
              @dragover="onDragOver(row.bookmark, $event)"
              @drop="onDrop(row.bookmark, $event)"
            >
              {{ row.bookmark.title }}
            </RouterLink>

            <input
              v-else
              ref="editInput"
              v-model="editingTitle"
              class="h-6 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-base leading-6 outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-700 dark:bg-zinc-950"
              type="text"
              @blur="saveRename(row.bookmark)"
              @keydown.enter.prevent="saveRename(row.bookmark)"
              @keydown.escape.prevent="cancelRename"
            />

            <div
              v-if="editingRoutePath !== row.bookmark.routePath"
              class="ml-auto flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
            >
              <button
                class="inline-flex size-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                type="button"
                aria-label="Rename bookmark"
                @click="startRename(row.bookmark)"
              >
                <Pencil class="size-3.5" aria-hidden="true" />
              </button>
              <button
                class="inline-flex size-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                type="button"
                aria-label="Delete bookmark"
                @click="deleteBookmark(row.bookmark, rowIndex)"
              >
                <Trash2 class="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </template>

          <template v-else>
            <span class="min-w-0 flex-1 truncate text-base text-zinc-700 dark:text-zinc-300">
              {{ row.bookmark.title }}
            </span>
            <button
              class="ml-auto inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 text-xs font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              type="button"
              @click="restoreRemovedBookmark(row)"
            >
              <RotateCcw class="size-4" aria-hidden="true" />
              Restore
            </button>
          </template>
        </div>
      </li>
    </ul>
  </section>
</template>
